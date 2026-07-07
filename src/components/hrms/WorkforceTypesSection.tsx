"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type WorkerType = {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  classification_group: string;
  description?: string | null;
  attendance_mode: string;
  pay_mode: string;
  tds_section: string;
  pf_applicable: boolean;
  esic_applicable: boolean;
  pt_applicable: boolean;
  lwf_applicable: boolean;
  clra_applicable: boolean;
  leave_applicable: boolean;
  overtime_applicable: boolean;
  requires_agreement: boolean;
  requires_invoice: boolean;
  requires_attendance: boolean;
  statutory_defaults?: Record<string, unknown> | null;
  compliance_notes?: string | null;
  is_system_default: boolean;
  sort_order: number;
  inactive: boolean;
  updated_at: string;
};

type WorkerRule = {
  id: string;
  tenant_id: string;
  worker_type_id: string;
  rule_name: string;
  rule_type: string;
  priority: number;
  conditions?: Record<string, unknown> | null;
  outcome?: Record<string, unknown> | null;
  notes?: string | null;
};

type WorkerTypeForm = {
  code: string;
  name: string;
  classification_group: string;
  description: string;
  attendance_mode: string;
  pay_mode: string;
  tds_section: string;
  pf_applicable: boolean;
  esic_applicable: boolean;
  pt_applicable: boolean;
  lwf_applicable: boolean;
  clra_applicable: boolean;
  leave_applicable: boolean;
  overtime_applicable: boolean;
  requires_agreement: boolean;
  requires_invoice: boolean;
  requires_attendance: boolean;
  statutory_defaults: string;
  compliance_notes: string;
  sort_order: string;
};

type RuleForm = {
  worker_type_id: string;
  rule_name: string;
  rule_type: string;
  priority: string;
  conditions: string;
  outcome: string;
  notes: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const workerTypeOptions = [
  ["permanent_fulltime", "Permanent Full-Time"],
  ["permanent_parttime", "Permanent Part-Time"],
  ["fixed_term_contract", "Fixed-Term Contract"],
  ["project_based", "Project-Based Contractor"],
  ["freelancer_gig", "Freelancer / Gig Worker"],
  ["intern", "Intern"],
  ["consultant_retainer", "Consultant Retainer"],
  ["agency_staff", "Agency Staff"],
];

const groupOptions = [
  ["employee", "Employee"],
  ["contractor", "Contractor"],
  ["trainee", "Trainee"],
  ["agency", "Agency"],
];

const attendanceOptions = [
  ["checkin_checkout", "Check-in / Check-out"],
  ["hours_logged", "Hours Logged"],
  ["milestone_only", "Milestone Only"],
  ["none", "None"],
];

const payOptions = [
  ["monthly_salary", "Monthly Salary"],
  ["hourly", "Hourly"],
  ["project_milestone", "Project Milestone"],
  ["invoice", "Invoice"],
  ["retainer", "Retainer"],
  ["stipend", "Stipend"],
];

const tdsOptions = [
  ["192", "192"],
  ["194C", "194C"],
  ["194J", "194J"],
  ["194I", "194I"],
  ["none", "None"],
];

const ruleTypeOptions = [
  ["manual_guidance", "Manual Guidance"],
  ["compliance", "Compliance"],
  ["payroll", "Payroll"],
  ["attendance", "Attendance"],
];

const emptyWorkerTypeForm: WorkerTypeForm = {
  code: "permanent_fulltime",
  name: "",
  classification_group: "employee",
  description: "",
  attendance_mode: "checkin_checkout",
  pay_mode: "monthly_salary",
  tds_section: "192",
  pf_applicable: true,
  esic_applicable: true,
  pt_applicable: true,
  lwf_applicable: true,
  clra_applicable: false,
  leave_applicable: true,
  overtime_applicable: true,
  requires_agreement: true,
  requires_invoice: false,
  requires_attendance: true,
  statutory_defaults: "{\n  \"country\": \"IN\",\n  \"requires_review\": true\n}",
  compliance_notes: "",
  sort_order: "100",
};

const emptyRuleForm: RuleForm = {
  worker_type_id: "",
  rule_name: "",
  rule_type: "manual_guidance",
  priority: "100",
  conditions: "{\n  \"worker_type_code\": \"\"\n}",
  outcome: "{\n  \"attendance_mode\": \"checkin_checkout\"\n}",
  notes: "",
};

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function prettyJSON(value: unknown) {
  if (!value || typeof value !== "object") return "{}";
  return JSON.stringify(value, null, 2);
}

function parseJSONField(value: string, field: string) {
  try {
    const parsed = value.trim() ? JSON.parse(value) : {};
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(`${field} must be a JSON object.`);
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof Error) throw new Error(err.message);
    throw new Error(`${field} must be valid JSON.`);
  }
}

function workerTypeToForm(item: WorkerType): WorkerTypeForm {
  return {
    code: item.code,
    name: item.name || "",
    classification_group: item.classification_group || "employee",
    description: item.description || "",
    attendance_mode: item.attendance_mode || "checkin_checkout",
    pay_mode: item.pay_mode || "monthly_salary",
    tds_section: item.tds_section || "none",
    pf_applicable: Boolean(item.pf_applicable),
    esic_applicable: Boolean(item.esic_applicable),
    pt_applicable: Boolean(item.pt_applicable),
    lwf_applicable: Boolean(item.lwf_applicable),
    clra_applicable: Boolean(item.clra_applicable),
    leave_applicable: Boolean(item.leave_applicable),
    overtime_applicable: Boolean(item.overtime_applicable),
    requires_agreement: Boolean(item.requires_agreement),
    requires_invoice: Boolean(item.requires_invoice),
    requires_attendance: Boolean(item.requires_attendance),
    statutory_defaults: prettyJSON(item.statutory_defaults),
    compliance_notes: item.compliance_notes || "",
    sort_order: String(item.sort_order ?? 100),
  };
}

function ruleToForm(rule: WorkerRule): RuleForm {
  return {
    worker_type_id: rule.worker_type_id,
    rule_name: rule.rule_name || "",
    rule_type: rule.rule_type || "manual_guidance",
    priority: String(rule.priority || 100),
    conditions: prettyJSON(rule.conditions),
    outcome: prettyJSON(rule.outcome),
    notes: rule.notes || "",
  };
}

function labelFor(options: string[][], value: string) {
  return options.find(([key]) => key === value)?.[1] || value;
}

export function WorkforceTypesSection({
  isSuperAdmin,
  tenants,
  tenantsLoading,
  tenantsError,
}: {
  isSuperAdmin: boolean;
  tenants: BranchTenantOption[];
  tenantsLoading: boolean;
  tenantsError: string;
}) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantSort, setTenantSort] = useState<TenantSortKey>("name");

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.subdomainUrl, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => tenantSortValue(a, tenantSort).localeCompare(tenantSortValue(b, tenantSort)));
  }, [tenantSearch, tenantSort, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Workforce Types</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant before managing worker taxonomy, pay mode, attendance mode, and compliance defaults.</p>
          </div>
        </div>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
              <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}>
                <option value="name">Sort by name</option>
                <option value="status">Sort by status</option>
                <option value="plan">Sort by plan</option>
                <option value="joined">Sort by joined</option>
              </select>
            </div>
          </div>
          {tenantsError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading tenants...</td></tr>
                ) : filteredTenants.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No tenants match your search.</td></tr>
                ) : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} / {tenant.kind}</span></td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.joined}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Types</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <WorkforceTypeManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function WorkforceTypeManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<WorkerType[]>([]);
  const [rules, setRules] = useState<WorkerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingType, setEditingType] = useState<WorkerType | null>(null);
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [typeForm, setTypeForm] = useState<WorkerTypeForm>(emptyWorkerTypeForm);
  const [ruleModalType, setRuleModalType] = useState<WorkerType | null>(null);
  const [editingRule, setEditingRule] = useState<WorkerRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm);

  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const typePath = `${basePath}/worker-types`;
  const rulePath = `${basePath}/worker-classification-rules`;

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await apiRequest<WorkerType[]>(typePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workforce types.");
    } finally {
      setLoading(false);
    }
  }, [typePath]);

  const loadRules = useCallback(async (workerTypeID?: string) => {
    setRulesLoading(true);
    setError("");
    try {
      const suffix = workerTypeID ? `?worker_type_id=${workerTypeID}` : "";
      setRules(await apiRequest<WorkerRule[]>(`${rulePath}${suffix}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load classification rules.");
    } finally {
      setRulesLoading(false);
    }
  }, [rulePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadTypes, 0);
    return () => window.clearTimeout(timer);
  }, [loadTypes]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesGroup = !groupFilter || item.classification_group === groupFilter;
      const matchesQuery = !query || [item.name, item.code, item.classification_group, item.attendance_mode, item.pay_mode, item.tds_section, item.compliance_notes || ""].some((value) => value.toLowerCase().includes(query));
      return matchesGroup && matchesQuery;
    });
  }, [groupFilter, items, search]);

  const summary = useMemo(() => ({
    total: items.length,
    employee: items.filter((item) => item.classification_group === "employee").length,
    contingent: items.filter((item) => item.classification_group !== "employee").length,
    clra: items.filter((item) => item.clra_applicable).length,
    invoice: items.filter((item) => item.requires_invoice).length,
  }), [items]);

  function openCreateType() {
    setEditingType(null);
    setTypeForm(emptyWorkerTypeForm);
    setTypeFormOpen(true);
    setError("");
    setMessage("");
  }

  function openEditType(item: WorkerType) {
    setEditingType(item);
    setTypeForm(workerTypeToForm(item));
    setTypeFormOpen(true);
    setError("");
    setMessage("");
  }

  function openRules(item: WorkerType) {
    setRuleModalType(item);
    setEditingRule(null);
    setRuleForm({ ...emptyRuleForm, worker_type_id: item.id, rule_name: `${item.name} classification`, conditions: JSON.stringify({ worker_type_code: item.code }, null, 2), outcome: JSON.stringify({ attendance_mode: item.attendance_mode, pay_mode: item.pay_mode, tds_section: item.tds_section }, null, 2), priority: String(item.sort_order || 100) });
    void loadRules(item.id);
  }

  async function saveType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const statutoryDefaults = parseJSONField(typeForm.statutory_defaults, "Statutory defaults");
      const payload = {
        code: typeForm.code,
        name: typeForm.name.trim(),
        classification_group: typeForm.classification_group,
        description: optionalString(typeForm.description),
        attendance_mode: typeForm.attendance_mode,
        pay_mode: typeForm.pay_mode,
        tds_section: typeForm.tds_section,
        pf_applicable: typeForm.pf_applicable,
        esic_applicable: typeForm.esic_applicable,
        pt_applicable: typeForm.pt_applicable,
        lwf_applicable: typeForm.lwf_applicable,
        clra_applicable: typeForm.clra_applicable,
        leave_applicable: typeForm.leave_applicable,
        overtime_applicable: typeForm.overtime_applicable,
        requires_agreement: typeForm.requires_agreement,
        requires_invoice: typeForm.requires_invoice,
        requires_attendance: typeForm.requires_attendance,
        statutory_defaults: statutoryDefaults,
        compliance_notes: optionalString(typeForm.compliance_notes),
        sort_order: Number(typeForm.sort_order || 0),
      };
      if (!payload.name) throw new Error("Name is required.");
      if (!Number.isInteger(payload.sort_order) || payload.sort_order < 0 || payload.sort_order > 9999) throw new Error("Sort order must be between 0 and 9999.");
      if (editingType) {
        await apiRequest<WorkerType>(`${typePath}/${editingType.id}`, { method: "PUT", body: payload });
        setMessage("Workforce type updated.");
      } else {
        await apiRequest<WorkerType>(typePath, { method: "POST", body: payload });
        setMessage("Workforce type created.");
      }
      setTypeFormOpen(false);
      setEditingType(null);
      await loadTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save workforce type.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        worker_type_id: ruleForm.worker_type_id,
        rule_name: ruleForm.rule_name.trim(),
        rule_type: ruleForm.rule_type,
        priority: Number(ruleForm.priority || 0),
        conditions: parseJSONField(ruleForm.conditions, "Conditions"),
        outcome: parseJSONField(ruleForm.outcome, "Outcome"),
        notes: optionalString(ruleForm.notes),
      };
      if (!payload.rule_name) throw new Error("Rule name is required.");
      if (!Number.isInteger(payload.priority) || payload.priority < 1 || payload.priority > 9999) throw new Error("Priority must be between 1 and 9999.");
      if (editingRule) {
        await apiRequest<WorkerRule>(`${rulePath}/${editingRule.id}`, { method: "PUT", body: payload });
        setMessage("Classification rule updated.");
      } else {
        await apiRequest<WorkerRule>(rulePath, { method: "POST", body: payload });
        setMessage("Classification rule created.");
      }
      setEditingRule(null);
      setRuleForm((current) => ({ ...emptyRuleForm, worker_type_id: current.worker_type_id }));
      await loadRules(payload.worker_type_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save classification rule.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateType(item: WorkerType) {
    if (!window.confirm(`Deactivate ${item.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${typePath}/${item.id}`, { method: "DELETE" });
      setMessage("Workforce type deactivated.");
      await loadTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate workforce type.");
    }
  }

  async function deactivateRule(rule: WorkerRule) {
    if (!window.confirm(`Deactivate ${rule.rule_name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${rulePath}/${rule.id}`, { method: "DELETE" });
      setMessage("Classification rule deactivated.");
      await loadRules(rule.worker_type_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate classification rule.");
    }
  }

  const title = tenant ? `${tenant.name} Workforce Types` : "Workforce Types";

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Manage tenant-level worker taxonomy for attendance, payroll, and statutory defaults.</p>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateType} type="button">New Type</button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Types" value={summary.total} hint="Active workforce type records." />
        <SummaryTile label="Employee" value={summary.employee} hint="Types classified as employees." />
        <SummaryTile label="Contingent" value={summary.contingent} hint="Contractor, trainee, and agency types." />
        <SummaryTile label="CLRA" value={summary.clra} hint="Types flagged for CLRA review." />
        <SummaryTile label="Invoice" value={summary.invoice} hint="Types requiring invoice capture." />
      </div>

      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Taxonomy</h2>
            <p className="text-sm text-[#6b7280]">{filtered.length} shown from {items.length} types</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search types" value={search} />
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setGroupFilter(event.target.value)} value={groupFilter}>
              <option value="">All groups</option>
              {groupOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
              <tr><th className="px-5 py-4">Type</th><th className="px-5 py-4">Group</th><th className="px-5 py-4">Attendance</th><th className="px-5 py-4">Pay</th><th className="px-5 py-4">Compliance</th><th className="px-5 py-4">Controls</th><th className="px-5 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {loading ? (
                <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading workforce types...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No workforce types found.</td></tr>
              ) : filtered.map((item) => (
                <tr className="hover:bg-[#f8faf9]" key={item.id}>
                  <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.code}{item.is_system_default ? " / default" : ""}</span></td>
                  <td className="px-5 py-5"><StatusChip tone="neutral">{labelFor(groupOptions, item.classification_group)}</StatusChip></td>
                  <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{labelFor(attendanceOptions, item.attendance_mode)}</td>
                  <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{labelFor(payOptions, item.pay_mode)}<span className="mt-1 block text-xs text-[#6b7280]">TDS {item.tds_section}</span></td>
                  <td className="px-5 py-5"><div className="flex flex-wrap gap-2"><Flag on={item.pf_applicable} label="PF" /><Flag on={item.esic_applicable} label="ESIC" /><Flag on={item.pt_applicable} label="PT" /><Flag on={item.clra_applicable} label="CLRA" /></div></td>
                  <td className="px-5 py-5"><div className="flex flex-wrap gap-2"><Flag on={item.requires_attendance} label="Attendance" /><Flag on={item.requires_invoice} label="Invoice" /><Flag on={item.requires_agreement} label="Agreement" /></div></td>
                  <td className="px-5 py-5">
                    <div className="flex justify-end gap-2">
                      <ActionButton label="Rules" onClick={() => openRules(item)} />
                      <ActionButton label="Edit" onClick={() => openEditType(item)} />
                      <ActionButton danger label="Deactivate" onClick={() => deactivateType(item)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {typeFormOpen ? (
        <Modal title={editingType ? "Edit Workforce Type" : "New Workforce Type"} onClose={() => setTypeFormOpen(false)}>
          <form className="grid gap-4" onSubmit={saveType}>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectInput disabled={Boolean(editingType)} label="Type Code" onChange={(value) => setTypeForm((form) => ({ ...form, code: value }))} value={typeForm.code} options={workerTypeOptions} />
              <TextInput label="Name" onChange={(value) => setTypeForm((form) => ({ ...form, name: value }))} required value={typeForm.name} />
              <SelectInput label="Group" onChange={(value) => setTypeForm((form) => ({ ...form, classification_group: value }))} value={typeForm.classification_group} options={groupOptions} />
              <TextInput label="Sort Order" onChange={(value) => setTypeForm((form) => ({ ...form, sort_order: value }))} type="number" value={typeForm.sort_order} />
              <SelectInput label="Attendance Mode" onChange={(value) => setTypeForm((form) => ({ ...form, attendance_mode: value }))} value={typeForm.attendance_mode} options={attendanceOptions} />
              <SelectInput label="Pay Mode" onChange={(value) => setTypeForm((form) => ({ ...form, pay_mode: value }))} value={typeForm.pay_mode} options={payOptions} />
              <SelectInput label="TDS Section" onChange={(value) => setTypeForm((form) => ({ ...form, tds_section: value }))} value={typeForm.tds_section} options={tdsOptions} />
              <TextInput label="Description" onChange={(value) => setTypeForm((form) => ({ ...form, description: value }))} value={typeForm.description} />
            </div>
            <CheckboxGrid form={typeForm} setForm={setTypeForm} />
            <TextArea label="Statutory Defaults JSON" onChange={(value) => setTypeForm((form) => ({ ...form, statutory_defaults: value }))} value={typeForm.statutory_defaults} />
            <TextArea label="Compliance Notes" onChange={(value) => setTypeForm((form) => ({ ...form, compliance_notes: value }))} value={typeForm.compliance_notes} />
            <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-4">
              <button className="rounded-lg border border-[#dbe0e5] px-4 py-3 text-sm font-bold text-[#374151]" onClick={() => setTypeFormOpen(false)} type="button">Cancel</button>
              <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Type"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {ruleModalType ? (
        <Modal title={`${ruleModalType.name} Rules`} onClose={() => setRuleModalType(null)}>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-xl border border-[#edf1ef]">
              <div className="border-b border-[#edf1ef] px-4 py-3"><h3 className="text-sm font-black text-[#111827]">Existing Rules</h3></div>
              <div className="max-h-[520px] overflow-y-auto p-3">
                {rulesLoading ? <p className="p-4 text-sm font-semibold text-[#6b7280]">Loading rules...</p> : rules.length === 0 ? <p className="p-4 text-sm font-semibold text-[#6b7280]">No rules yet.</p> : rules.map((rule) => (
                  <div className="mb-3 rounded-xl bg-[#f8faf9] p-4" key={rule.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div><strong className="block text-sm text-[#111827]">{rule.rule_name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{labelFor(ruleTypeOptions, rule.rule_type)} / priority {rule.priority}</span></div>
                      <div className="flex gap-2"><ActionButton label="Edit" onClick={() => { setEditingRule(rule); setRuleForm(ruleToForm(rule)); }} /><ActionButton danger label="Delete" onClick={() => deactivateRule(rule)} /></div>
                    </div>
                    {rule.notes ? <p className="mt-3 text-xs font-semibold leading-5 text-[#6b7280]">{rule.notes}</p> : null}
                  </div>
                ))}
              </div>
            </div>
            <form className="grid gap-4 rounded-xl border border-[#edf1ef] p-4" onSubmit={saveRule}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-[#111827]">{editingRule ? "Edit Rule" : "New Rule"}</h3>
                {editingRule ? <button className="text-xs font-black text-[#588368]" onClick={() => { setEditingRule(null); setRuleForm({ ...emptyRuleForm, worker_type_id: ruleModalType.id }); }} type="button">New</button> : null}
              </div>
              <TextInput label="Rule Name" onChange={(value) => setRuleForm((form) => ({ ...form, rule_name: value }))} required value={ruleForm.rule_name} />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectInput label="Rule Type" onChange={(value) => setRuleForm((form) => ({ ...form, rule_type: value }))} value={ruleForm.rule_type} options={ruleTypeOptions} />
                <TextInput label="Priority" onChange={(value) => setRuleForm((form) => ({ ...form, priority: value }))} required type="number" value={ruleForm.priority} />
              </div>
              <TextArea label="Conditions JSON" onChange={(value) => setRuleForm((form) => ({ ...form, conditions: value }))} value={ruleForm.conditions} />
              <TextArea label="Outcome JSON" onChange={(value) => setRuleForm((form) => ({ ...form, outcome: value }))} value={ruleForm.outcome} />
              <TextArea label="Notes" onChange={(value) => setRuleForm((form) => ({ ...form, notes: value }))} value={ruleForm.notes} />
              <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-4">
                <button className="rounded-lg border border-[#dbe0e5] px-4 py-3 text-sm font-bold text-[#374151]" onClick={() => setRuleModalType(null)} type="button">Close</button>
                <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Rule"}</button>
              </div>
            </form>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return <div className="rounded-xl border border-[#edf1ef] bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><Info text={hint} /></div><p className="mt-2 text-3xl font-black text-[#111827]">{value}</p></div>;
}

function Info({ text }: { text: string }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#6b7280]" title={text}>i</span>;
}

function StatusChip({ children, tone }: { children: string; tone?: "neutral" }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tone === "neutral" ? "bg-[#eef4f1] text-[#456d58]" : "bg-[#f4fbf8] text-[#588368]"}`}>{children}</span>;
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${on ? "bg-[#ecfdf3] text-[#047857]" : "bg-[#f8faf9] text-[#9ca3af]"}`}>{label}</span>;
}

function ActionButton({ danger, label, onClick }: { danger?: boolean; label: string; onClick: () => void }) {
  return <button className={`rounded-lg border px-3 py-2 text-xs font-black ${danger ? "border-[#fca5a5] text-[#b91c1c]" : "border-[#dbe0e5] text-[#374151]"}`} onClick={onClick} type="button">{label}</button>;
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#111827]/45 px-4 py-8">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#edf1ef] px-6 py-5">
          <h2 className="text-xl font-black text-[#111827]">{title}</h2>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe0e5] text-sm font-black text-[#374151]" onClick={onClose} type="button">x</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function TextInput({ label, onChange, required, type = "text", value }: { label: string; onChange: (value: string) => void; required?: boolean; type?: string; value: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#374151]">{label}</span><input className="h-11 w-full rounded-lg border border-[#d1d5db] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} /></label>;
}

function SelectInput({ disabled, label, onChange, options, value }: { disabled?: boolean; label: string; onChange: (value: string) => void; options: string[][]; value: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#374151]">{label}</span><select className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm outline-none focus:border-[#588368] disabled:bg-[#f8faf9]" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#374151]">{label}</span><textarea className="min-h-28 w-full rounded-lg border border-[#d1d5db] px-3 py-3 font-mono text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function CheckboxGrid({ form, setForm }: { form: WorkerTypeForm; setForm: Dispatch<SetStateAction<WorkerTypeForm>> }) {
  const fields: Array<[keyof WorkerTypeForm, string, string]> = [
    ["pf_applicable", "PF", "Provident fund default applicability"],
    ["esic_applicable", "ESIC", "Employee state insurance default applicability"],
    ["pt_applicable", "PT", "Professional tax default applicability"],
    ["lwf_applicable", "LWF", "Labour welfare fund default applicability"],
    ["clra_applicable", "CLRA", "Contract Labour Act review flag"],
    ["leave_applicable", "Leave", "Leave policy applicability"],
    ["overtime_applicable", "Overtime", "Overtime calculation applicability"],
    ["requires_agreement", "Agreement", "Agreement or appointment document required"],
    ["requires_invoice", "Invoice", "Invoice required before payout"],
    ["requires_attendance", "Attendance", "Attendance required for payroll readiness"],
  ];
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([field, label, hint]) => <label className="flex items-center justify-between gap-3 rounded-lg border border-[#edf1ef] px-3 py-3 text-sm font-bold text-[#374151]" key={field}><span className="flex items-center gap-2">{label}<Info text={hint} /></span><input checked={Boolean(form[field])} className="h-4 w-4 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.checked }))} type="checkbox" /></label>)}</div>;
}
