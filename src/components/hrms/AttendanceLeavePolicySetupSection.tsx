"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Layers3, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Trash2, Wand2 } from "lucide-react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type PolicyKind = "attendance" | "leave";
type ActiveTab = "policy-sets" | "assignments" | "leave-rules" | "preview";

type PolicySet = {
  id: string;
  tenant_id: string;
  policy_kind: PolicyKind;
  code: string;
  name: string;
  description?: string | null;
  config?: unknown;
  is_default: boolean;
  is_active: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  updated_at?: string;
};

type PolicyAssignment = {
  id: string;
  tenant_id: string;
  policy_set_id: string;
  policy_kind: PolicyKind;
  scope_type: string;
  scope_id?: string | null;
  role_code?: string | null;
  priority: number;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active: boolean;
};

type LeavePolicyRule = {
  id: string;
  policy_set_id: string;
  leave_type_id: string;
  grant_mode: string;
  accrual_frequency?: string | null;
  entitlement_days: number;
  accrual_amount_per_period: number;
  prorate_joiners: boolean;
  probation_handling: string;
  rounding_rule: string;
  max_balance_cap?: number | null;
  carry_forward_cap?: number | null;
  encashment_eligible: boolean;
  negative_balance_allowed: boolean;
  insufficient_balance_action: string;
  expiry_days?: number | null;
  allow_half_day: boolean;
  attachment_required_after_days?: number | null;
  sandwich_enabled: boolean;
  sandwich_include_weekly_off: boolean;
  sandwich_include_public_holiday: boolean;
  sandwich_same_leave_type_only: boolean;
  sandwich_across_leave_types: boolean;
  notice_required_after_days?: number | null;
  notice_days: number;
  payroll_impact: string;
};

type PolicyResolutionResult = {
  policy?: PolicySet | null;
  leave_rules?: LeavePolicyRule[];
  candidates?: Array<{
    policy_set_id: string;
    name: string;
    code: string;
    scope_type: string;
    scope_id?: string | null;
    role_code?: string | null;
    precedence: number;
  }>;
};

type SetupOption = {
  id: string;
  name: string;
  code?: string | null;
  shortcode?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type PolicySetForm = {
  policy_kind: PolicyKind;
  code: string;
  name: string;
  description: string;
  config: string;
  is_default: boolean;
  is_active: boolean;
  effective_from: string;
  effective_to: string;
};

type AssignmentForm = {
  policy_kind: PolicyKind;
  policy_set_id: string;
  scope_type: string;
  scope_id: string;
  role_code: string;
  priority: string;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
};

type LeaveRuleForm = {
  policy_set_id: string;
  leave_type_id: string;
  grant_mode: string;
  accrual_frequency: string;
  entitlement_days: string;
  accrual_amount_per_period: string;
  prorate_joiners: boolean;
  probation_handling: string;
  rounding_rule: string;
  max_balance_cap: string;
  carry_forward_cap: string;
  encashment_eligible: boolean;
  negative_balance_allowed: boolean;
  insufficient_balance_action: string;
  expiry_days: string;
  allow_half_day: boolean;
  attachment_required_after_days: string;
  sandwich_enabled: boolean;
  sandwich_include_weekly_off: boolean;
  sandwich_include_public_holiday: boolean;
  sandwich_same_leave_type_only: boolean;
  sandwich_across_leave_types: boolean;
  notice_required_after_days: string;
  notice_days: string;
  payroll_impact: string;
};

type PreviewForm = {
  policy_kind: PolicyKind;
  employee_user_id: string;
  branch_id: string;
  department_id: string;
  designation_id: string;
  workforce_type_id: string;
  role_codes: string;
  date: string;
};

type LeavePolicyWizardStep = "types" | "rules" | "review";

type LeavePolicyWizardType = {
  leave_type_id: string;
  enabled: boolean;
  entitlement_days: string;
  grant_mode: string;
  payroll_impact: string;
  allow_half_day: boolean;
  sandwich_enabled: boolean;
  notice_required_after_days: string;
  notice_days: string;
  attachment_required_after_days: string;
  insufficient_balance_action: string;
  negative_balance_allowed: boolean;
};

const emptyPolicySetForm: PolicySetForm = {
  policy_kind: "attendance",
  code: "",
  name: "",
  description: "",
  config: "",
  is_default: false,
  is_active: true,
  effective_from: "",
  effective_to: "",
};

const emptyAssignmentForm: AssignmentForm = {
  policy_kind: "attendance",
  policy_set_id: "",
  scope_type: "tenant",
  scope_id: "",
  role_code: "",
  priority: "100",
  effective_from: "",
  effective_to: "",
  is_active: true,
};

const emptyLeaveRuleForm: LeaveRuleForm = {
  policy_set_id: "",
  leave_type_id: "",
  grant_mode: "annual_calendar_year",
  accrual_frequency: "",
  entitlement_days: "0",
  accrual_amount_per_period: "0",
  prorate_joiners: true,
  probation_handling: "allow",
  rounding_rule: "nearest_half_day",
  max_balance_cap: "",
  carry_forward_cap: "",
  encashment_eligible: false,
  negative_balance_allowed: false,
  insufficient_balance_action: "block",
  expiry_days: "",
  allow_half_day: true,
  attachment_required_after_days: "",
  sandwich_enabled: false,
  sandwich_include_weekly_off: true,
  sandwich_include_public_holiday: true,
  sandwich_same_leave_type_only: false,
  sandwich_across_leave_types: true,
  notice_required_after_days: "",
  notice_days: "0",
  payroll_impact: "paid",
};

const emptyPreviewForm: PreviewForm = {
  policy_kind: "attendance",
  employee_user_id: "",
  branch_id: "",
  department_id: "",
  designation_id: "",
  workforce_type_id: "",
  role_codes: "",
  date: new Date().toISOString().slice(0, 10),
};

const tabs: Array<{ key: ActiveTab; label: string; icon: typeof ClipboardList }> = [
  { key: "policy-sets", label: "Policy Sets", icon: ClipboardList },
  { key: "assignments", label: "Assignments", icon: Layers3 },
  { key: "leave-rules", label: "Leave Rules", icon: CalendarClock },
  { key: "preview", label: "Preview", icon: SlidersHorizontal },
];

const leaveWizardSteps: Array<{ key: LeavePolicyWizardStep; label: string }> = [
  { key: "types", label: "Leave Types" },
  { key: "rules", label: "Rules" },
  { key: "review", label: "Review" },
];

const scopeOptions = [
  ["tenant", "Company default"],
  ["branch", "Branch"],
  ["department", "Department"],
  ["designation", "Designation"],
  ["workforce_type", "Workforce type"],
  ["role_group", "Role/group"],
  ["employee", "Employee"],
];

const grantModeOptions = [
  ["annual_calendar_year", "Annual - calendar year"],
  ["annual_financial_year", "Annual - financial year"],
  ["employee_anniversary", "Employee anniversary"],
  ["monthly_accrual", "Monthly accrual"],
  ["payroll_cycle_accrual", "Payroll-cycle accrual"],
  ["days_worked_accrual", "Days-worked accrual"],
  ["attendance_based_accrual", "Attendance-based accrual"],
  ["probation_completion", "Probation-completion grant"],
  ["manual", "Manual HR grant"],
  ["comp_off_earning", "Comp-off earning"],
  ["none", "No balance tracking"],
];

const payrollImpactOptions = [
  ["paid", "Paid"],
  ["unpaid", "Unpaid / LOP"],
  ["deduct", "Payroll deduction"],
  ["neutral", "No payroll impact"],
];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code} ${tenant.status} ${tenant.plan}`.toLowerCase();
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function optionalNumber(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalInt(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  const parsed = Number.parseInt(clean, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function policySetToForm(item: PolicySet): PolicySetForm {
  return {
    policy_kind: item.policy_kind,
    code: item.code,
    name: item.name,
    description: item.description || "",
    config: item.config ? JSON.stringify(item.config, null, 2) : "",
    is_default: item.is_default,
    is_active: item.is_active,
    effective_from: item.effective_from ? item.effective_from.slice(0, 10) : "",
    effective_to: item.effective_to ? item.effective_to.slice(0, 10) : "",
  };
}

function assignmentToForm(item: PolicyAssignment): AssignmentForm {
  return {
    policy_kind: item.policy_kind,
    policy_set_id: item.policy_set_id,
    scope_type: item.scope_type,
    scope_id: item.scope_id || "",
    role_code: item.role_code || "",
    priority: String(item.priority),
    effective_from: item.effective_from ? item.effective_from.slice(0, 10) : "",
    effective_to: item.effective_to ? item.effective_to.slice(0, 10) : "",
    is_active: item.is_active,
  };
}

function leaveRuleToForm(item: LeavePolicyRule): LeaveRuleForm {
  return {
    policy_set_id: item.policy_set_id,
    leave_type_id: item.leave_type_id,
    grant_mode: item.grant_mode,
    accrual_frequency: item.accrual_frequency || "",
    entitlement_days: String(item.entitlement_days || 0),
    accrual_amount_per_period: String(item.accrual_amount_per_period || 0),
    prorate_joiners: item.prorate_joiners,
    probation_handling: item.probation_handling,
    rounding_rule: item.rounding_rule,
    max_balance_cap: item.max_balance_cap == null ? "" : String(item.max_balance_cap),
    carry_forward_cap: item.carry_forward_cap == null ? "" : String(item.carry_forward_cap),
    encashment_eligible: item.encashment_eligible,
    negative_balance_allowed: item.negative_balance_allowed,
    insufficient_balance_action: item.insufficient_balance_action,
    expiry_days: item.expiry_days == null ? "" : String(item.expiry_days),
    allow_half_day: item.allow_half_day,
    attachment_required_after_days: item.attachment_required_after_days == null ? "" : String(item.attachment_required_after_days),
    sandwich_enabled: item.sandwich_enabled,
    sandwich_include_weekly_off: item.sandwich_include_weekly_off,
    sandwich_include_public_holiday: item.sandwich_include_public_holiday,
    sandwich_same_leave_type_only: item.sandwich_same_leave_type_only,
    sandwich_across_leave_types: item.sandwich_across_leave_types,
    notice_required_after_days: item.notice_required_after_days == null ? "" : String(item.notice_required_after_days),
    notice_days: String(item.notice_days || 0),
    payroll_impact: item.payroll_impact,
  };
}

function optionName(options: SetupOption[], id?: string | null) {
  if (!id) return "-";
  const option = options.find((item) => item.id === id);
  if (!option) return id.slice(0, 8);
  if (option.first_name || option.email) return `${[option.first_name, option.last_name].filter(Boolean).join(" ") || option.email} ${option.email ? `(${option.email})` : ""}`.trim();
  return option.name || option.code || id.slice(0, 8);
}

function compactLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function policySetPayload(form: PolicySetForm) {
  let config: unknown;
  if (form.config.trim()) {
    config = JSON.parse(form.config);
  }
  return {
    policy_kind: form.policy_kind,
    code: form.code.trim(),
    name: form.name.trim(),
    description: optionalString(form.description),
    config,
    is_default: form.is_default,
    is_active: form.is_active,
    effective_from: optionalString(form.effective_from),
    effective_to: optionalString(form.effective_to),
  };
}

function assignmentPayload(form: AssignmentForm) {
  return {
    policy_kind: form.policy_kind,
    policy_set_id: form.policy_set_id,
    scope_type: form.scope_type,
    scope_id: ["tenant", "role_group"].includes(form.scope_type) ? undefined : optionalString(form.scope_id),
    role_code: form.scope_type === "role_group" ? optionalString(form.role_code)?.toUpperCase() : undefined,
    priority: Number.parseInt(form.priority || "100", 10) || 100,
    effective_from: optionalString(form.effective_from),
    effective_to: optionalString(form.effective_to),
    is_active: form.is_active,
  };
}

function leaveRulePayload(form: LeaveRuleForm) {
  return {
    policy_set_id: form.policy_set_id,
    leave_type_id: form.leave_type_id,
    grant_mode: form.grant_mode,
    accrual_frequency: optionalString(form.accrual_frequency),
    entitlement_days: Number(form.entitlement_days || "0") || 0,
    accrual_amount_per_period: Number(form.accrual_amount_per_period || "0") || 0,
    prorate_joiners: form.prorate_joiners,
    probation_handling: form.probation_handling.trim() || "allow",
    rounding_rule: form.rounding_rule.trim() || "nearest_half_day",
    max_balance_cap: optionalNumber(form.max_balance_cap),
    carry_forward_cap: optionalNumber(form.carry_forward_cap),
    encashment_eligible: form.encashment_eligible,
    negative_balance_allowed: form.negative_balance_allowed,
    insufficient_balance_action: form.insufficient_balance_action.trim() || "block",
    expiry_days: optionalInt(form.expiry_days),
    allow_half_day: form.allow_half_day,
    attachment_required_after_days: optionalNumber(form.attachment_required_after_days),
    sandwich_enabled: form.sandwich_enabled,
    sandwich_include_weekly_off: form.sandwich_include_weekly_off,
    sandwich_include_public_holiday: form.sandwich_include_public_holiday,
    sandwich_same_leave_type_only: form.sandwich_same_leave_type_only,
    sandwich_across_leave_types: form.sandwich_across_leave_types,
    notice_required_after_days: optionalNumber(form.notice_required_after_days),
    notice_days: Number.parseInt(form.notice_days || "0", 10) || 0,
    payroll_impact: form.payroll_impact,
  };
}

function leaveTypeKey(item: SetupOption) {
  return `${item.shortcode || ""} ${item.code || ""} ${item.name || ""}`.toLowerCase();
}

function defaultWizardLeaveRule(item: SetupOption): LeavePolicyWizardType {
  const key = leaveTypeKey(item);
  const isSick = key.includes("sl") || key.includes("sick");
  const isCasual = key.includes("cl") || key.includes("casual");
  const isEarned = key.includes("el") || key.includes("earned") || key.includes("privilege");
  const isCompOff = key.includes("co") || key.includes("comp");
  const isLop = key.includes("lop") || key.includes("unpaid") || key.includes("loss of pay");
  return {
    leave_type_id: item.id,
    enabled: isSick || isCasual || isEarned || isCompOff || isLop,
    entitlement_days: isSick ? "7" : isCasual ? "7" : isEarned ? "18" : isCompOff || isLop ? "0" : "0",
    grant_mode: isCompOff ? "comp_off_earning" : isLop ? "none" : "annual_financial_year",
    payroll_impact: isLop ? "unpaid" : "paid",
    allow_half_day: true,
    sandwich_enabled: !isLop,
    notice_required_after_days: isSick ? "3" : isCasual || isEarned ? "2" : "",
    notice_days: isSick ? "0" : isCasual ? "2" : isEarned ? "7" : "0",
    attachment_required_after_days: isSick ? "2" : "",
    insufficient_balance_action: isLop ? "allow_unpaid" : "block",
    negative_balance_allowed: false,
  };
}

function wizardTypeToLeaveRuleForm(policySetID: string, item: LeavePolicyWizardType): LeaveRuleForm {
  return {
    ...emptyLeaveRuleForm,
    policy_set_id: policySetID,
    leave_type_id: item.leave_type_id,
    grant_mode: item.grant_mode,
    entitlement_days: item.entitlement_days,
    allow_half_day: item.allow_half_day,
    attachment_required_after_days: item.attachment_required_after_days,
    sandwich_enabled: item.sandwich_enabled,
    sandwich_include_weekly_off: true,
    sandwich_include_public_holiday: true,
    notice_required_after_days: item.notice_required_after_days,
    notice_days: item.notice_days,
    payroll_impact: item.payroll_impact,
    insufficient_balance_action: item.insufficient_balance_action,
    negative_balance_allowed: item.negative_balance_allowed,
  };
}

export function AttendanceLeavePolicySetupSection({
  isSuperAdmin,
  tenants,
  tenantsError,
  tenantsLoading,
}: {
  isSuperAdmin: boolean;
  tenants: BranchTenantOption[];
  tenantsError: string;
  tenantsLoading: boolean;
}) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.status, tenant.plan, tenant.subdomainUrl].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b)));
  }, [tenantSearch, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#588368]">Setup</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#172033]">Attendance & Leave Policies</h1>
          </div>
          <div className="relative w-full sm:w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8a938e]" />
            <input className="h-11 w-full rounded-xl border border-[#dbe0e5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
          </div>
        </div>
        {tenantsError ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5">
            <h2 className="text-base font-black text-[#172033]">Tenant Directory</h2>
            <p className="mt-1 text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">Tenant</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : null}
                {!tenantsLoading && filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5">
                      <strong className="block text-sm text-[#172033]">{tenant.name}</strong>
                      <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.subdomainUrl || tenant.code}</span>
                    </td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right">
                      <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Policies</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <PolicySetupWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function PolicySetupWorkspace({ isSuperAdmin, onBack, tenant }: { isSuperAdmin: boolean; onBack?: () => void; tenant: BranchTenantOption | null }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("policy-sets");
  const [activeKind, setActiveKind] = useState<PolicyKind>("attendance");
  const [policySets, setPolicySets] = useState<PolicySet[]>([]);
  const [assignments, setAssignments] = useState<PolicyAssignment[]>([]);
  const [leaveRules, setLeaveRules] = useState<LeavePolicyRule[]>([]);
  const [selectedLeavePolicyID, setSelectedLeavePolicyID] = useState("");
  const [branches, setBranches] = useState<SetupOption[]>([]);
  const [departments, setDepartments] = useState<SetupOption[]>([]);
  const [designations, setDesignations] = useState<SetupOption[]>([]);
  const [workforceTypes, setWorkforceTypes] = useState<SetupOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<SetupOption[]>([]);
  const [employees, setEmployees] = useState<SetupOption[]>([]);
  const [employeesWarning, setEmployeesWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [policySetModal, setPolicySetModal] = useState<{ open: boolean; item: PolicySet | null }>({ open: false, item: null });
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; item: PolicyAssignment | null }>({ open: false, item: null });
  const [leaveRuleModal, setLeaveRuleModal] = useState<{ open: boolean; item: LeavePolicyRule | null }>({ open: false, item: null });
  const [leaveWizardOpen, setLeaveWizardOpen] = useState(false);
  const [leaveWizardStep, setLeaveWizardStep] = useState<LeavePolicyWizardStep>("types");
  const [leaveWizardTypes, setLeaveWizardTypes] = useState<LeavePolicyWizardType[]>([]);
  const [policySetForm, setPolicySetForm] = useState<PolicySetForm>(emptyPolicySetForm);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm);
  const [leaveRuleForm, setLeaveRuleForm] = useState<LeaveRuleForm>(emptyLeaveRuleForm);
  const [previewForm, setPreviewForm] = useState<PreviewForm>(emptyPreviewForm);
  const [previewResult, setPreviewResult] = useState<PolicyResolutionResult | null>(null);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const title = tenant ? `${tenant.name} Policies` : "Attendance & Leave Policies";

  const leavePolicySets = useMemo(() => policySets.filter((item) => item.policy_kind === "leave"), [policySets]);
  const visiblePolicySets = useMemo(() => policySets.filter((item) => item.policy_kind === activeKind), [activeKind, policySets]);
  const visibleAssignments = useMemo(() => assignments.filter((item) => item.policy_kind === activeKind), [activeKind, assignments]);

  const targetOptions = useMemo(() => {
    switch (assignmentForm.scope_type) {
      case "branch":
        return branches;
      case "department":
        return departments;
      case "designation":
        return designations;
      case "workforce_type":
        return workforceTypes;
      case "employee":
        return employees;
      default:
        return [];
    }
  }, [assignmentForm.scope_type, branches, departments, designations, employees, workforceTypes]);

  const loadSetupData = useCallback(async () => {
    setEmployeesWarning("");
    const [branchItems, departmentItems, designationItems, workforceItems, leaveTypeItems] = await Promise.all([
      apiRequest<SetupOption[]>(`${basePath}/branches`),
      apiRequest<SetupOption[]>(`${basePath}/departments`),
      apiRequest<SetupOption[]>(`${basePath}/designations`),
      apiRequest<SetupOption[]>(`${basePath}/worker-types`),
      apiRequest<SetupOption[]>(`${basePath}/leave-types`),
    ]);
    setBranches(branchItems);
    setDepartments(departmentItems);
    setDesignations(designationItems);
    setWorkforceTypes(workforceItems);
    setLeaveTypes(leaveTypeItems);
    try {
      const employeeItems = await apiRequest<SetupOption[]>(`${basePath}/employees`);
      setEmployees(employeeItems);
    } catch (err) {
      setEmployees([]);
      setEmployeesWarning(err instanceof Error ? err.message : "Employee options are unavailable.");
    }
  }, [basePath]);

  const loadPolicyData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [attendanceSets, leaveSets, attendanceAssignments, leaveAssignments] = await Promise.all([
        apiRequest<PolicySet[]>(`${basePath}/policy-engine/policy-sets?kind=attendance`),
        apiRequest<PolicySet[]>(`${basePath}/policy-engine/policy-sets?kind=leave`),
        apiRequest<PolicyAssignment[]>(`${basePath}/policy-engine/assignments?kind=attendance`),
        apiRequest<PolicyAssignment[]>(`${basePath}/policy-engine/assignments?kind=leave`),
      ]);
      const nextPolicySets = [...attendanceSets, ...leaveSets];
      setPolicySets(nextPolicySets);
      setAssignments([...attendanceAssignments, ...leaveAssignments]);
      const selected = selectedLeavePolicyID || nextPolicySets.find((item) => item.policy_kind === "leave")?.id || "";
      setSelectedLeavePolicyID(selected);
      if (selected) {
        setLeaveRules(await apiRequest<LeavePolicyRule[]>(`${basePath}/policy-engine/policy-sets/${selected}/leave-rules`));
      } else {
        setLeaveRules([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load policy setup.");
    } finally {
      setLoading(false);
    }
  }, [basePath, selectedLeavePolicyID]);

  useEffect(() => {
    void Promise.resolve().then(loadSetupData).catch((err) => setError(err instanceof Error ? err.message : "Unable to load setup options."));
    void Promise.resolve().then(loadPolicyData);
  }, [loadPolicyData, loadSetupData]);

  const reloadLeaveRules = useCallback(async (policySetID: string) => {
    if (!policySetID) {
      setLeaveRules([]);
      return;
    }
    setLeaveRules(await apiRequest<LeavePolicyRule[]>(`${basePath}/policy-engine/policy-sets/${policySetID}/leave-rules`));
  }, [basePath]);

  const openPolicySet = (item: PolicySet | null, kind: PolicyKind = activeKind) => {
    setPolicySetForm(item ? policySetToForm(item) : { ...emptyPolicySetForm, policy_kind: kind });
    setPolicySetModal({ open: true, item });
    setError("");
    setMessage("");
  };

  const openAssignment = (item: PolicyAssignment | null) => {
    setAssignmentForm(item ? assignmentToForm(item) : { ...emptyAssignmentForm, policy_kind: activeKind, policy_set_id: visiblePolicySets[0]?.id || "" });
    setAssignmentModal({ open: true, item });
    setError("");
    setMessage("");
  };

  const openLeaveRule = (item: LeavePolicyRule | null) => {
    const policySetID = item?.policy_set_id || selectedLeavePolicyID || leavePolicySets[0]?.id || "";
    setLeaveRuleForm(item ? leaveRuleToForm(item) : { ...emptyLeaveRuleForm, policy_set_id: policySetID, leave_type_id: leaveTypes[0]?.id || "" });
    setLeaveRuleModal({ open: true, item });
    setError("");
    setMessage("");
  };

  const openLeavePolicyWizard = () => {
    setLeaveWizardTypes(leaveTypes.map(defaultWizardLeaveRule));
    setLeaveWizardStep("types");
    setLeaveWizardOpen(true);
    setError("");
    setMessage("");
  };

  const updateLeaveWizardType = (leaveTypeID: string, patch: Partial<LeavePolicyWizardType>) => {
    setLeaveWizardTypes((current) => current.map((item) => item.leave_type_id === leaveTypeID ? { ...item, ...patch } : item));
  };

  const saveLeavePolicyWizard = async () => {
    const enabledRules = leaveWizardTypes.filter((item) => item.enabled);
    if (enabledRules.length === 0) {
      setError("Select at least one leave type for the policy.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const existingSet = leavePolicySets.find((item) => item.code === "self_service_leave_policy");
      const policyPayload = {
        policy_kind: "leave",
        code: "self_service_leave_policy",
        name: "Self-Service Leave Policy",
        description: "Company default leave policy configured from the guided wizard.",
        config: { source: "guided_wizard" },
        is_default: true,
        is_active: true,
      };
      const policySet = existingSet
        ? await apiRequest<PolicySet>(`${basePath}/policy-engine/policy-sets/${existingSet.id}`, { method: "PUT", body: policyPayload })
        : await apiRequest<PolicySet>(`${basePath}/policy-engine/policy-sets`, { method: "POST", body: policyPayload });
      const tenantAssignment = assignments.find((item) => item.policy_kind === "leave" && item.policy_set_id === policySet.id && item.scope_type === "tenant");
      if (!tenantAssignment) {
        await apiRequest<PolicyAssignment>(`${basePath}/policy-engine/assignments`, {
          method: "POST",
          body: {
            policy_kind: "leave",
            policy_set_id: policySet.id,
            scope_type: "tenant",
            priority: 100,
            is_active: true,
          },
        });
      }
      const existingRules = await apiRequest<LeavePolicyRule[]>(`${basePath}/policy-engine/policy-sets/${policySet.id}/leave-rules`);
      for (const wizardRule of enabledRules) {
        const existingRule = existingRules.find((item) => item.leave_type_id === wizardRule.leave_type_id);
        const payload = leaveRulePayload(wizardTypeToLeaveRuleForm(policySet.id, wizardRule));
        if (existingRule) {
          await apiRequest<LeavePolicyRule>(`${basePath}/policy-engine/leave-rules/${existingRule.id}`, { method: "PUT", body: payload });
        } else {
          await apiRequest<LeavePolicyRule>(`${basePath}/policy-engine/policy-sets/${policySet.id}/leave-rules`, { method: "POST", body: payload });
        }
      }
      setLeaveWizardOpen(false);
      setSelectedLeavePolicyID(policySet.id);
      setMessage("Guided leave policy saved and assigned as the company default.");
      await loadPolicyData();
      await reloadLeaveRules(policySet.id);
      setActiveTab("leave-rules");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save guided leave policy.");
    } finally {
      setSaving(false);
    }
  };

  const savePolicySet = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!policySetForm.code.trim() || !policySetForm.name.trim()) throw new Error("Policy code and name are required.");
      const payload = policySetPayload(policySetForm);
      if (policySetModal.item) {
        await apiRequest<PolicySet>(`${basePath}/policy-engine/policy-sets/${policySetModal.item.id}`, { method: "PUT", body: payload });
      } else {
        await apiRequest<PolicySet>(`${basePath}/policy-engine/policy-sets`, { method: "POST", body: payload });
      }
      setPolicySetModal({ open: false, item: null });
      setMessage("Policy set saved.");
      await loadPolicyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save policy set.");
    } finally {
      setSaving(false);
    }
  };

  const deletePolicySet = async (item: PolicySet) => {
    if (!window.confirm(`Delete policy set "${item.name}"? Existing assignments may need cleanup first.`)) return;
    setError("");
    try {
      await apiRequest<void>(`${basePath}/policy-engine/policy-sets/${item.id}?kind=${item.policy_kind}`, { method: "DELETE" });
      setMessage("Policy set deleted.");
      await loadPolicyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete policy set.");
    }
  };

  const saveAssignment = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!assignmentForm.policy_set_id) throw new Error("Policy set is required.");
      if (!["tenant", "role_group"].includes(assignmentForm.scope_type) && !assignmentForm.scope_id) throw new Error("Scope target is required.");
      if (assignmentForm.scope_type === "role_group" && !assignmentForm.role_code.trim()) throw new Error("Role code is required.");
      const payload = assignmentPayload(assignmentForm);
      if (assignmentModal.item) {
        await apiRequest<PolicyAssignment>(`${basePath}/policy-engine/assignments/${assignmentModal.item.id}`, { method: "PUT", body: payload });
      } else {
        await apiRequest<PolicyAssignment>(`${basePath}/policy-engine/assignments`, { method: "POST", body: payload });
      }
      setAssignmentModal({ open: false, item: null });
      setMessage("Assignment saved.");
      await loadPolicyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save assignment.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (item: PolicyAssignment) => {
    if (!window.confirm("Delete this policy assignment?")) return;
    setError("");
    try {
      await apiRequest<void>(`${basePath}/policy-engine/assignments/${item.id}?kind=${item.policy_kind}`, { method: "DELETE" });
      setMessage("Assignment deleted.");
      await loadPolicyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete assignment.");
    }
  };

  const saveLeaveRule = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!leaveRuleForm.policy_set_id || !leaveRuleForm.leave_type_id) throw new Error("Policy set and leave type are required.");
      const payload = leaveRulePayload(leaveRuleForm);
      if (leaveRuleModal.item) {
        await apiRequest<LeavePolicyRule>(`${basePath}/policy-engine/leave-rules/${leaveRuleModal.item.id}`, { method: "PUT", body: payload });
      } else {
        await apiRequest<LeavePolicyRule>(`${basePath}/policy-engine/policy-sets/${leaveRuleForm.policy_set_id}/leave-rules`, { method: "POST", body: payload });
      }
      setLeaveRuleModal({ open: false, item: null });
      setSelectedLeavePolicyID(leaveRuleForm.policy_set_id);
      setMessage("Leave rule saved.");
      await reloadLeaveRules(leaveRuleForm.policy_set_id);
      await loadPolicyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save leave rule.");
    } finally {
      setSaving(false);
    }
  };

  const deleteLeaveRule = async (item: LeavePolicyRule) => {
    if (!window.confirm("Delete this leave rule?")) return;
    setError("");
    try {
      await apiRequest<void>(`${basePath}/policy-engine/leave-rules/${item.id}`, { method: "DELETE" });
      setMessage("Leave rule deleted.");
      await reloadLeaveRules(selectedLeavePolicyID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete leave rule.");
    }
  };

  const runPreview = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setPreviewResult(null);
    try {
      const body = {
        policy_kind: previewForm.policy_kind,
        employee_user_id: optionalString(previewForm.employee_user_id),
        branch_id: optionalString(previewForm.branch_id),
        department_id: optionalString(previewForm.department_id),
        designation_id: optionalString(previewForm.designation_id),
        workforce_type_id: optionalString(previewForm.workforce_type_id),
        role_codes: previewForm.role_codes.split(",").map((item) => item.trim()).filter(Boolean),
        date: previewForm.date,
      };
      setPreviewResult(await apiRequest<PolicyResolutionResult>(`${basePath}/policy-engine/effective-preview`, { method: "POST", body }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview effective policy.");
    }
  };

  const setSelectedLeavePolicy = async (policySetID: string) => {
    setSelectedLeavePolicyID(policySetID);
    setError("");
    try {
      await reloadLeaveRules(policySetID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave rules.");
    }
  };

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#588368]">Policy Engine</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#172033]">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-black text-[#172033] hover:bg-[#f8faf9]" onClick={onBack} type="button">Change Tenant</button> : null}
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#e87839] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#d96425]" onClick={openLeavePolicyWizard} type="button"><Wand2 className="h-4 w-4" />Guided Leave Setup</button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-black text-[#172033] hover:bg-[#f8faf9]" onClick={() => void loadPolicyData()} type="button"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>
      </div>

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <SummaryTile accent="green" label="Policy sets" value={policySets.length} />
        <SummaryTile accent="orange" label="Assignments" value={assignments.length} />
        <SummaryTile accent="blue" label="Leave rules" value={leaveRules.length} />
      </section>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-4 rounded-xl bg-[#eef4f1] px-4 py-3 text-sm font-semibold text-[#426b55]">{message}</p> : null}
      {employeesWarning ? <p className="mb-4 rounded-xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#9a5a1f]">{employeesWarning}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${activeTab === tab.key ? "bg-[#588368] text-white shadow-sm" : "bg-[#f8faf9] text-[#425049] hover:bg-[#eef4f1]"}`} key={tab.key} onClick={() => setActiveTab(tab.key)} type="button">
                  <Icon className="h-4 w-4" />{tab.label}
                </button>
              );
            })}
          </div>
          {activeTab !== "leave-rules" ? <KindToggle activeKind={activeKind} setActiveKind={setActiveKind} /> : null}
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm font-semibold text-[#6b7280]">Loading policy setup...</div>
        ) : activeTab === "policy-sets" ? (
          <PolicySetPanel items={visiblePolicySets} kind={activeKind} onCreate={() => openPolicySet(null)} onDelete={deletePolicySet} onEdit={openPolicySet} />
        ) : activeTab === "assignments" ? (
          <AssignmentPanel assignments={visibleAssignments} branches={branches} departments={departments} designations={designations} employees={employees} onCreate={() => openAssignment(null)} onDelete={deleteAssignment} onEdit={openAssignment} policySets={policySets} workforceTypes={workforceTypes} />
        ) : activeTab === "leave-rules" ? (
          <LeaveRulesPanel leavePolicySets={leavePolicySets} leaveRules={leaveRules} leaveTypes={leaveTypes} onCreate={() => openLeaveRule(null)} onDelete={deleteLeaveRule} onEdit={openLeaveRule} onSelectPolicySet={(value) => void setSelectedLeavePolicy(value)} selectedLeavePolicyID={selectedLeavePolicyID} />
        ) : (
          <PreviewPanel branches={branches} departments={departments} designations={designations} employees={employees} form={previewForm} onChange={setPreviewForm} onSubmit={runPreview} result={previewResult} workforceTypes={workforceTypes} />
        )}
      </section>

      <HrmsModal description="Define the policy definition. Assignments decide who receives it." onClose={() => setPolicySetModal({ open: false, item: null })} open={policySetModal.open} title={policySetModal.item ? "Edit Policy Set" : "New Policy Set"}>
        <PolicySetFormView form={policySetForm} onChange={setPolicySetForm} onSubmit={savePolicySet} saving={saving} />
      </HrmsModal>

      <HrmsModal description="Build a company-default leave policy without writing JSON or touching every advanced field." onClose={() => setLeaveWizardOpen(false)} open={leaveWizardOpen} title="Guided Leave Policy Setup">
        <div className="grid gap-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {leaveWizardSteps.map((step, index) => (
              <button className={`rounded-xl border px-3 py-2 text-left text-xs font-black ${leaveWizardStep === step.key ? "border-[#588368] bg-[#eef4f1] text-[#426b55]" : "border-[#edf1ef] bg-[#f8faf9] text-[#7a827d]"}`} key={step.key} onClick={() => setLeaveWizardStep(step.key)} type="button">
                <span className="block text-[10px] uppercase tracking-[0.18em]">Step {index + 1}</span>
                {step.label}
              </button>
            ))}
          </div>

          {leaveWizardStep === "types" ? (
            <div className="grid gap-3">
              {leaveWizardTypes.map((item) => {
                const leaveType = leaveTypes.find((option) => option.id === item.leave_type_id);
                return (
                  <label className={`flex items-start gap-3 rounded-2xl border p-4 ${item.enabled ? "border-[#588368] bg-[#eef4f1]" : "border-[#edf1ef] bg-white"}`} key={item.leave_type_id}>
                    <input checked={item.enabled} className="mt-1 h-4 w-4 accent-[#588368]" onChange={(event) => updateLeaveWizardType(item.leave_type_id, { enabled: event.target.checked })} type="checkbox" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[#172033]">{leaveType ? optionName(leaveTypes, leaveType.id) : item.leave_type_id.slice(0, 8)}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.payroll_impact === "unpaid" ? "Unpaid / LOP" : `${item.entitlement_days || 0} days entitlement`}</span>
                    </span>
                  </label>
                );
              })}
              {leaveWizardTypes.length === 0 ? <p className="rounded-xl bg-[#f8faf9] px-4 py-6 text-center text-sm font-semibold text-[#6b7280]">No leave types are available. Create leave types before running the guided setup.</p> : null}
            </div>
          ) : null}

          {leaveWizardStep === "rules" ? (
            <div className="grid gap-4">
              {leaveWizardTypes.filter((item) => item.enabled).map((item) => (
                <div className="rounded-2xl border border-[#edf1ef] bg-white p-4" key={item.leave_type_id}>
                  <h3 className="text-sm font-black text-[#172033]">{optionName(leaveTypes, item.leave_type_id)}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InputField label="Entitlement days" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { entitlement_days: value })} type="number" value={item.entitlement_days} />
                    <SelectField label="Grant mode" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { grant_mode: value })} value={item.grant_mode}>{grantModeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
                    <InputField label="Notice required after days" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { notice_required_after_days: value })} type="number" value={item.notice_required_after_days} />
                    <InputField label="Notice days" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { notice_days: value })} type="number" value={item.notice_days} />
                    <InputField label="Attachment after days" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { attachment_required_after_days: value })} type="number" value={item.attachment_required_after_days} />
                    <SelectField label="Payroll impact" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { payroll_impact: value })} value={item.payroll_impact}>{payrollImpactOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <CheckField checked={item.allow_half_day} label="Allow half day" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { allow_half_day: value })} />
                    <CheckField checked={item.sandwich_enabled} label="Sandwich rule" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { sandwich_enabled: value })} />
                    <CheckField checked={item.negative_balance_allowed} label="Negative balance" onChange={(value) => updateLeaveWizardType(item.leave_type_id, { negative_balance_allowed: value })} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {leaveWizardStep === "review" ? (
            <div className="grid gap-3">
              <div className="rounded-2xl border border-[#dbe8e1] bg-[#f8faf9] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#588368]">Company Default</p>
                <h3 className="mt-2 text-xl font-black text-[#172033]">Self-Service Leave Policy</h3>
                <p className="mt-1 text-sm font-semibold text-[#6b7280]">{leaveWizardTypes.filter((item) => item.enabled).length} leave type rules will be saved and assigned to the whole tenant.</p>
              </div>
              <div className="grid gap-2">
                {leaveWizardTypes.filter((item) => item.enabled).map((item) => (
                  <div className="grid gap-2 rounded-xl border border-[#edf1ef] bg-white p-3 text-sm font-semibold text-[#425049] sm:grid-cols-4" key={item.leave_type_id}>
                    <span className="font-black text-[#172033]">{optionName(leaveTypes, item.leave_type_id)}</span>
                    <span>{item.entitlement_days || 0} days</span>
                    <span>{item.sandwich_enabled ? "Sandwich enabled" : "No sandwich"}</span>
                    <span>{compactLabel(item.payroll_impact)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-between border-t border-[#edf1ef] pt-4">
            <button className="rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-black text-[#172033] disabled:opacity-50" disabled={leaveWizardStep === "types"} onClick={() => setLeaveWizardStep(leaveWizardSteps[Math.max(0, leaveWizardSteps.findIndex((item) => item.key === leaveWizardStep) - 1)].key)} type="button">Back</button>
            {leaveWizardStep !== "review" ? (
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={() => setLeaveWizardStep(leaveWizardSteps[Math.min(leaveWizardSteps.length - 1, leaveWizardSteps.findIndex((item) => item.key === leaveWizardStep) + 1)].key)} type="button">Next</button>
            ) : (
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} onClick={() => void saveLeavePolicyWizard()} type="button">{saving ? "Saving..." : "Save Guided Policy"}</button>
            )}
          </div>
        </div>
      </HrmsModal>

      <HrmsModal description="Attach a policy to company, branch, department, designation, workforce type, role, or one employee." onClose={() => setAssignmentModal({ open: false, item: null })} open={assignmentModal.open} title={assignmentModal.item ? "Edit Assignment" : "New Assignment"}>
        <AssignmentFormView form={assignmentForm} onChange={setAssignmentForm} onSubmit={saveAssignment} policySets={policySets.filter((item) => item.policy_kind === assignmentForm.policy_kind)} saving={saving} targetOptions={targetOptions} />
      </HrmsModal>

      <HrmsModal description="Configure entitlement, accrual, sandwich, notice, balance, and payroll behavior for one leave type." onClose={() => setLeaveRuleModal({ open: false, item: null })} open={leaveRuleModal.open} title={leaveRuleModal.item ? "Edit Leave Rule" : "New Leave Rule"}>
        <LeaveRuleFormView form={leaveRuleForm} leavePolicySets={leavePolicySets} leaveTypes={leaveTypes} onChange={setLeaveRuleForm} onSubmit={saveLeaveRule} saving={saving} />
      </HrmsModal>
    </div>
  );
}

function SummaryTile({ accent, label, value }: { accent: "blue" | "green" | "orange"; label: string; value: number }) {
  const color = accent === "green" ? "bg-[#eef4f1] text-[#588368]" : accent === "orange" ? "bg-[#fff2e9] text-[#e87839]" : "bg-[#eef6ff] text-[#2f6f9f]";
  return (
    <div className="rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><ShieldCheck className="h-5 w-5" /></div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#172033]">{value}</p>
    </div>
  );
}

function KindToggle({ activeKind, setActiveKind }: { activeKind: PolicyKind; setActiveKind: (kind: PolicyKind) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-[#f8faf9] p-1">
      {(["attendance", "leave"] as PolicyKind[]).map((kind) => (
        <button className={`rounded-lg px-4 py-2 text-sm font-black ${activeKind === kind ? "bg-white text-[#588368] shadow-sm" : "text-[#6b7280]"}`} key={kind} onClick={() => setActiveKind(kind)} type="button">{compactLabel(kind)}</button>
      ))}
    </div>
  );
}

function PolicySetPanel({ items, kind, onCreate, onDelete, onEdit }: { items: PolicySet[]; kind: PolicyKind; onCreate: () => void; onDelete: (item: PolicySet) => void; onEdit: (item: PolicySet) => void }) {
  return (
    <div>
      <PanelHeader actionLabel={`New ${compactLabel(kind)} Policy`} onAction={onCreate} title={`${compactLabel(kind)} Policy Sets`} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Policy</th><th className="px-5 py-4">Default</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Effective</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-[#edf1ef]">
            {items.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No policy sets configured.</td></tr> : null}
            {items.map((item) => (
              <tr className="hover:bg-[#f8faf9]" key={item.id}>
                <td className="px-5 py-5"><strong className="block text-sm text-[#172033]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.code}{item.description ? ` - ${item.description}` : ""}</span></td>
                <td className="px-5 py-5"><Badge tone={item.is_default ? "green" : "neutral"}>{item.is_default ? "Default" : "Override"}</Badge></td>
                <td className="px-5 py-5"><Badge tone={item.is_active ? "green" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{formatDate(item.effective_from)} to {formatDate(item.effective_to)}</td>
                <td className="px-5 py-5 text-right"><RowActions onDelete={() => onDelete(item)} onEdit={() => onEdit(item)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignmentPanel({ assignments, branches, departments, designations, employees, onCreate, onDelete, onEdit, policySets, workforceTypes }: { assignments: PolicyAssignment[]; branches: SetupOption[]; departments: SetupOption[]; designations: SetupOption[]; employees: SetupOption[]; onCreate: () => void; onDelete: (item: PolicyAssignment) => void; onEdit: (item: PolicyAssignment) => void; policySets: PolicySet[]; workforceTypes: SetupOption[] }) {
  const policyName = (id: string) => policySets.find((item) => item.id === id)?.name || id.slice(0, 8);
  const scopeName = (item: PolicyAssignment) => {
    if (item.scope_type === "tenant") return "Company default";
    if (item.scope_type === "role_group") return item.role_code || "-";
    if (item.scope_type === "branch") return optionName(branches, item.scope_id);
    if (item.scope_type === "department") return optionName(departments, item.scope_id);
    if (item.scope_type === "designation") return optionName(designations, item.scope_id);
    if (item.scope_type === "workforce_type") return optionName(workforceTypes, item.scope_id);
    if (item.scope_type === "employee") return optionName(employees, item.scope_id);
    return item.scope_id || "-";
  };
  return (
    <div>
      <PanelHeader actionLabel="New Assignment" onAction={onCreate} title="Policy Assignments" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Policy</th><th className="px-5 py-4">Scope</th><th className="px-5 py-4">Target</th><th className="px-5 py-4">Priority</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-[#edf1ef]">
            {assignments.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No assignments configured.</td></tr> : null}
            {assignments.map((item) => (
              <tr className="hover:bg-[#f8faf9]" key={item.id}>
                <td className="px-5 py-5 text-sm font-black text-[#172033]">{policyName(item.policy_set_id)}</td>
                <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{compactLabel(item.scope_type)}</td>
                <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{scopeName(item)}</td>
                <td className="px-5 py-5 text-sm font-black text-[#172033]">{item.priority}</td>
                <td className="px-5 py-5"><Badge tone={item.is_active ? "green" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-5 py-5 text-right"><RowActions onDelete={() => onDelete(item)} onEdit={() => onEdit(item)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaveRulesPanel({ leavePolicySets, leaveRules, leaveTypes, onCreate, onDelete, onEdit, onSelectPolicySet, selectedLeavePolicyID }: { leavePolicySets: PolicySet[]; leaveRules: LeavePolicyRule[]; leaveTypes: SetupOption[]; onCreate: () => void; onDelete: (item: LeavePolicyRule) => void; onEdit: (item: LeavePolicyRule) => void; onSelectPolicySet: (id: string) => void; selectedLeavePolicyID: string }) {
  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#172033]">Leave Rules</h2>
          <p className="mt-1 text-sm text-[#6b7280]">Rules belong to the selected leave policy set.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => onSelectPolicySet(event.target.value)} value={selectedLeavePolicyID}>
            <option value="">Select leave policy</option>
            {leavePolicySets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" disabled={!selectedLeavePolicyID} onClick={onCreate} type="button"><Plus className="h-4 w-4" />New Rule</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left">
          <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Leave Type</th><th className="px-5 py-4">Grant</th><th className="px-5 py-4">Entitlement</th><th className="px-5 py-4">Balance Controls</th><th className="px-5 py-4">Payroll</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-[#edf1ef]">
            {leaveRules.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No leave rules configured for this policy.</td></tr> : null}
            {leaveRules.map((item) => (
              <tr className="hover:bg-[#f8faf9]" key={item.id}>
                <td className="px-5 py-5 text-sm font-black text-[#172033]">{optionName(leaveTypes, item.leave_type_id)}</td>
                <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{compactLabel(item.grant_mode)}</td>
                <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{item.entitlement_days} days</td>
                <td className="px-5 py-5 text-xs font-semibold text-[#6b7280]">Carry {item.carry_forward_cap ?? "-"} / Cap {item.max_balance_cap ?? "-"} / Half day {item.allow_half_day ? "Yes" : "No"}</td>
                <td className="px-5 py-5"><Badge tone={item.payroll_impact === "paid" ? "green" : "orange"}>{compactLabel(item.payroll_impact)}</Badge></td>
                <td className="px-5 py-5 text-right"><RowActions onDelete={() => onDelete(item)} onEdit={() => onEdit(item)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewPanel({ branches, departments, designations, employees, form, onChange, onSubmit, result, workforceTypes }: { branches: SetupOption[]; departments: SetupOption[]; designations: SetupOption[]; employees: SetupOption[]; form: PreviewForm; onChange: (form: PreviewForm) => void; onSubmit: (event: FormEvent) => void; result: PolicyResolutionResult | null; workforceTypes: SetupOption[] }) {
  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,420px)_1fr]">
      <form className="border-b border-[#edf1ef] p-5 lg:border-b-0 lg:border-r" onSubmit={onSubmit}>
        <h2 className="text-lg font-black text-[#172033]">Effective Policy Preview</h2>
        <div className="mt-5 grid gap-4">
          <SelectField label="Policy kind" onChange={(value) => onChange({ ...form, policy_kind: value as PolicyKind })} value={form.policy_kind}><option value="attendance">Attendance</option><option value="leave">Leave</option></SelectField>
          <SelectField label="Employee" onChange={(value) => onChange({ ...form, employee_user_id: value })} value={form.employee_user_id}><option value="">No employee override</option>{employees.map((item) => <option key={item.id} value={item.id}>{optionName(employees, item.id)}</option>)}</SelectField>
          <SelectField label="Branch" onChange={(value) => onChange({ ...form, branch_id: value })} value={form.branch_id}><option value="">Any branch</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          <SelectField label="Department" onChange={(value) => onChange({ ...form, department_id: value })} value={form.department_id}><option value="">Any department</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          <SelectField label="Designation" onChange={(value) => onChange({ ...form, designation_id: value })} value={form.designation_id}><option value="">Any designation</option>{designations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          <SelectField label="Workforce type" onChange={(value) => onChange({ ...form, workforce_type_id: value })} value={form.workforce_type_id}><option value="">Any workforce type</option>{workforceTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          <InputField label="Role codes" onChange={(value) => onChange({ ...form, role_codes: value })} placeholder="HR, MANAGER" value={form.role_codes} />
          <InputField label="Date" onChange={(value) => onChange({ ...form, date: value })} type="date" value={form.date} />
          <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" type="submit">Preview Policy</button>
        </div>
      </form>
      <div className="p-5">
        {!result ? <p className="rounded-xl bg-[#f8faf9] px-4 py-8 text-center text-sm font-semibold text-[#6b7280]">Run a preview to see the resolved policy and matching candidates.</p> : null}
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#588368]">Resolved Policy</p>
              <h3 className="mt-2 text-xl font-black text-[#172033]">{result.policy?.name || "No policy matched"}</h3>
              {result.policy ? <p className="mt-1 text-sm font-semibold text-[#6b7280]">{result.policy.code} - {compactLabel(result.policy.policy_kind)}</p> : null}
            </div>
            {result.candidates?.length ? (
              <div className="overflow-hidden rounded-2xl border border-[#edf1ef]">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Precedence</th></tr></thead>
                  <tbody className="divide-y divide-[#edf1ef]">{result.candidates.map((item) => <tr key={`${item.policy_set_id}-${item.precedence}`}><td className="px-4 py-3 text-sm font-black text-[#172033]">{item.name}</td><td className="px-4 py-3 text-sm text-[#6b7280]">{compactLabel(item.scope_type)}</td><td className="px-4 py-3 text-sm font-black text-[#172033]">{item.precedence}</td></tr>)}</tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PanelHeader({ actionLabel, onAction, title }: { actionLabel: string; onAction: () => void; title: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-black text-[#172033]">{title}</h2>
      <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={onAction} type="button"><Plus className="h-4 w-4" />{actionLabel}</button>
    </div>
  );
}

function RowActions({ onDelete, onEdit }: { onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="inline-flex gap-2">
      <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#172033] hover:bg-[#f8faf9]" onClick={onEdit} type="button">Edit</button>
      <button className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100" onClick={onDelete} type="button" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function Badge({ children, tone }: { children: string; tone: "green" | "neutral" | "orange" }) {
  const classes = tone === "green" ? "bg-[#eef4f1] text-[#588368]" : tone === "orange" ? "bg-[#fff2e9] text-[#d8611f]" : "bg-[#f3f4f6] text-[#6b7280]";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>{children}</span>;
}

function PolicySetFormView({ form, onChange, onSubmit, saving }: { form: PolicySetForm; onChange: (form: PolicySetForm) => void; onSubmit: (event: FormEvent) => void; saving: boolean }) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Kind" onChange={(value) => onChange({ ...form, policy_kind: value as PolicyKind })} value={form.policy_kind}><option value="attendance">Attendance</option><option value="leave">Leave</option></SelectField>
        <InputField label="Code" onChange={(value) => onChange({ ...form, code: value })} placeholder="OFFICE_DEFAULT" value={form.code} />
        <InputField label="Name" onChange={(value) => onChange({ ...form, name: value })} placeholder="Office Attendance Default" value={form.name} />
        <InputField label="Description" onChange={(value) => onChange({ ...form, description: value })} value={form.description} />
        <InputField label="Effective from" onChange={(value) => onChange({ ...form, effective_from: value })} type="date" value={form.effective_from} />
        <InputField label="Effective to" onChange={(value) => onChange({ ...form, effective_to: value })} type="date" value={form.effective_to} />
      </div>
      <TextAreaField label="Config JSON" onChange={(value) => onChange({ ...form, config: value })} placeholder='{"grace_minutes": 10}' value={form.config} />
      <div className="flex flex-wrap gap-3"><CheckField checked={form.is_default} label="Default policy" onChange={(value) => onChange({ ...form, is_default: value })} /><CheckField checked={form.is_active} label="Active" onChange={(value) => onChange({ ...form, is_active: value })} /></div>
      <FormActions saving={saving} />
    </form>
  );
}

function AssignmentFormView({ form, onChange, onSubmit, policySets, saving, targetOptions }: { form: AssignmentForm; onChange: (form: AssignmentForm) => void; onSubmit: (event: FormEvent) => void; policySets: PolicySet[]; saving: boolean; targetOptions: SetupOption[] }) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Kind" onChange={(value) => onChange({ ...form, policy_kind: value as PolicyKind, policy_set_id: "" })} value={form.policy_kind}><option value="attendance">Attendance</option><option value="leave">Leave</option></SelectField>
        <SelectField label="Policy set" onChange={(value) => onChange({ ...form, policy_set_id: value })} value={form.policy_set_id}><option value="">Select policy</option>{policySets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
        <SelectField label="Scope" onChange={(value) => onChange({ ...form, scope_type: value, scope_id: "", role_code: "" })} value={form.scope_type}>{scopeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
        {form.scope_type === "role_group" ? <InputField label="Role code" onChange={(value) => onChange({ ...form, role_code: value })} placeholder="HR" value={form.role_code} /> : null}
        {!["tenant", "role_group"].includes(form.scope_type) ? <SelectField label="Scope target" onChange={(value) => onChange({ ...form, scope_id: value })} value={form.scope_id}><option value="">Select target</option>{targetOptions.map((item) => <option key={item.id} value={item.id}>{optionName(targetOptions, item.id)}</option>)}</SelectField> : null}
        <InputField label="Priority" onChange={(value) => onChange({ ...form, priority: value })} type="number" value={form.priority} />
        <InputField label="Effective from" onChange={(value) => onChange({ ...form, effective_from: value })} type="date" value={form.effective_from} />
        <InputField label="Effective to" onChange={(value) => onChange({ ...form, effective_to: value })} type="date" value={form.effective_to} />
      </div>
      <CheckField checked={form.is_active} label="Active" onChange={(value) => onChange({ ...form, is_active: value })} />
      <FormActions saving={saving} />
    </form>
  );
}

function LeaveRuleFormView({ form, leavePolicySets, leaveTypes, onChange, onSubmit, saving }: { form: LeaveRuleForm; leavePolicySets: PolicySet[]; leaveTypes: SetupOption[]; onChange: (form: LeaveRuleForm) => void; onSubmit: (event: FormEvent) => void; saving: boolean }) {
  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Policy set" onChange={(value) => onChange({ ...form, policy_set_id: value })} value={form.policy_set_id}><option value="">Select policy</option>{leavePolicySets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
        <SelectField label="Leave type" onChange={(value) => onChange({ ...form, leave_type_id: value })} value={form.leave_type_id}><option value="">Select leave type</option>{leaveTypes.map((item) => <option key={item.id} value={item.id}>{optionName(leaveTypes, item.id)}</option>)}</SelectField>
        <SelectField label="Grant mode" onChange={(value) => onChange({ ...form, grant_mode: value })} value={form.grant_mode}>{grantModeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
        <InputField label="Accrual frequency" onChange={(value) => onChange({ ...form, accrual_frequency: value })} placeholder="monthly / payroll_cycle" value={form.accrual_frequency} />
        <InputField label="Entitlement days" onChange={(value) => onChange({ ...form, entitlement_days: value })} type="number" value={form.entitlement_days} />
        <InputField label="Accrual per period" onChange={(value) => onChange({ ...form, accrual_amount_per_period: value })} type="number" value={form.accrual_amount_per_period} />
      </div>
      <FormGroup title="Balance and controls">
        <InputField label="Max balance cap" onChange={(value) => onChange({ ...form, max_balance_cap: value })} type="number" value={form.max_balance_cap} />
        <InputField label="Carry-forward cap" onChange={(value) => onChange({ ...form, carry_forward_cap: value })} type="number" value={form.carry_forward_cap} />
        <InputField label="Expiry days" onChange={(value) => onChange({ ...form, expiry_days: value })} type="number" value={form.expiry_days} />
        <InputField label="Attachment after days" onChange={(value) => onChange({ ...form, attachment_required_after_days: value })} type="number" value={form.attachment_required_after_days} />
        <InputField label="Notice required after days" onChange={(value) => onChange({ ...form, notice_required_after_days: value })} type="number" value={form.notice_required_after_days} />
        <InputField label="Notice days" onChange={(value) => onChange({ ...form, notice_days: value })} type="number" value={form.notice_days} />
      </FormGroup>
      <FormGroup title="Rules">
        <InputField label="Probation handling" onChange={(value) => onChange({ ...form, probation_handling: value })} value={form.probation_handling} />
        <InputField label="Rounding rule" onChange={(value) => onChange({ ...form, rounding_rule: value })} value={form.rounding_rule} />
        <InputField label="Insufficient balance action" onChange={(value) => onChange({ ...form, insufficient_balance_action: value })} value={form.insufficient_balance_action} />
        <SelectField label="Payroll impact" onChange={(value) => onChange({ ...form, payroll_impact: value })} value={form.payroll_impact}>{payrollImpactOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
      </FormGroup>
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckField checked={form.prorate_joiners} label="Prorate joiners" onChange={(value) => onChange({ ...form, prorate_joiners: value })} />
        <CheckField checked={form.allow_half_day} label="Allow half day" onChange={(value) => onChange({ ...form, allow_half_day: value })} />
        <CheckField checked={form.encashment_eligible} label="Encashment eligible" onChange={(value) => onChange({ ...form, encashment_eligible: value })} />
        <CheckField checked={form.negative_balance_allowed} label="Negative balance allowed" onChange={(value) => onChange({ ...form, negative_balance_allowed: value })} />
        <CheckField checked={form.sandwich_enabled} label="Sandwich rule enabled" onChange={(value) => onChange({ ...form, sandwich_enabled: value })} />
        <CheckField checked={form.sandwich_include_weekly_off} label="Include weekly off" onChange={(value) => onChange({ ...form, sandwich_include_weekly_off: value })} />
        <CheckField checked={form.sandwich_include_public_holiday} label="Include public holiday" onChange={(value) => onChange({ ...form, sandwich_include_public_holiday: value })} />
        <CheckField checked={form.sandwich_same_leave_type_only} label="Same leave type only" onChange={(value) => onChange({ ...form, sandwich_same_leave_type_only: value })} />
        <CheckField checked={form.sandwich_across_leave_types} label="Across leave types" onChange={(value) => onChange({ ...form, sandwich_across_leave_types: value })} />
      </div>
      <FormActions saving={saving} />
    </form>
  );
}

function FormGroup({ children, title }: { children: ReactNode; title: string }) {
  return <div><h3 className="mb-3 text-sm font-black text-[#172033]">{title}</h3><div className="grid gap-4 sm:grid-cols-2">{children}</div></div>;
}

function InputField({ label, onChange, placeholder, type = "text", value }: { label: string; onChange: (value: string) => void; placeholder?: string; type?: string; value: string }) {
  return <label className="grid gap-1.5 text-sm font-bold text-[#425049]"><span>{label}</span><input className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} /></label>;
}

function SelectField({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="grid gap-1.5 text-sm font-bold text-[#425049]"><span>{label}</span><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function TextAreaField({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return <label className="grid gap-1.5 text-sm font-bold text-[#425049]"><span>{label}</span><textarea className="min-h-28 rounded-xl border border-[#dbe0e5] bg-white px-3 py-3 font-mono text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} /></label>;
}

function CheckField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-3 py-2 text-sm font-bold text-[#425049]"><input checked={checked} className="h-4 w-4 accent-[#588368]" onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function FormActions({ saving }: { saving: boolean }) {
  return <div className="flex justify-end"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save"}</button></div>;
}
