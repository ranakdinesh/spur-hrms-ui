"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type LeaveTemplate = { id: string; tenant_id?: string; name: string; code: string; description?: string | null; is_system: boolean };
type LeaveRule = {
  id: string;
  template_id: string;
  leave_type_id: string;
  fy_id?: string | null;
  employment_type_id?: string | null;
  department_id?: string | null;
  designation_id?: string | null;
  probation_status?: string | null;
  accrual_method: string;
  accrual_frequency: string;
  credit_days: number;
  annual_entitlement: number;
  min_worked_days: number;
  max_balance?: number | null;
  carry_forward_enabled: boolean;
  max_carry_forward: number;
  carry_forward_expiry_months: number;
  encashment_enabled: boolean;
  encashment_limit: number;
  encashment_payable_percent: number;
  negative_balance_allowed: boolean;
  max_negative_balance: number;
  sandwich_applicable: boolean;
  include_holidays: boolean;
  include_weekoffs: boolean;
  requires_document_after_days?: number | null;
  min_request_days: number;
  max_request_days?: number | null;
  max_requests_per_year: number;
  accrual_day: number;
  lapse_unutilized: boolean;
  allow_half_day: boolean;
  requires_approval: boolean;
  calculation_config?: Record<string, unknown> | null;
  priority: number;
};
type LeaveType = { id: string; name: string; shortcode?: string | null; is_enabled?: boolean };
type SetupOption = { id: string; name: string; code?: string | null; short_code?: string | null };
type FinancialYear = { id: string; name: string; is_active: boolean };
type Employee = { id: string; user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null; email?: string | null };
type LeaveBalance = { id: string; user_id: string; leave_type_id: string; fy_id: string; total_days: number; used_days: number; pending_days: number; balance_days: number };
type LeaveLedger = { id: string; leave_type_id: string; transaction_type: string; source_type: string; days: number; remarks?: string | null; created_at: string };
type CSVRow = Record<string, string>;
type BulkImportResult = { total: number; success: number; failed: number; errors: string[] };

type RuleForm = {
  leave_type_id: string;
  fy_id: string;
  department_id: string;
  employment_type_id: string;
  designation_id: string;
  probation_status: string;
  accrual_method: string;
  accrual_frequency: string;
  credit_days: string;
  annual_entitlement: string;
  min_worked_days: string;
  max_balance: string;
  carry_forward_enabled: boolean;
  max_carry_forward: string;
  carry_forward_expiry_months: string;
  lapse_unutilized: boolean;
  encashment_enabled: boolean;
  encashment_limit: string;
  encashment_payable_percent: string;
  negative_balance_allowed: boolean;
  max_negative_balance: string;
  sandwich_applicable: boolean;
  include_holidays: boolean;
  include_weekoffs: boolean;
  requires_document_after_days: string;
  min_request_days: string;
  max_request_days: string;
  max_requests_per_year: string;
  accrual_day: string;
  allow_half_day: boolean;
  requires_approval: boolean;
  auto_apply_by_scope: boolean;
  prorate: boolean;
  prorate_basis: string;
  rounding: string;
  holiday_work_treatment: string;
  comp_off_multiplier: string;
  hours_per_day: string;
  overtime_multiplier: string;
  payroll_component_code: string;
  priority: string;
};

const methods = ["monthly_fixed", "probation_monthly", "fixed_yearly", "worked_days", "worked_day_range", "worked_percentage", "tenure_slab", "pto_bank", "comp_off", "manual_adjustment"];
const frequencies = ["monthly", "yearly", "manual", "instant", "daily", "weekly", "biweekly"];
const balanceImportSample = "employee_code,leave_type,available_days,used_days,pending_days\nEMP001,CL,6,2,0\nEMP002,Sick Leave,4,1,0";
const emptyRuleForm: RuleForm = {
  leave_type_id: "",
  fy_id: "",
  department_id: "",
  employment_type_id: "",
  designation_id: "",
  probation_status: "any",
  accrual_method: "monthly_fixed",
  accrual_frequency: "monthly",
  credit_days: "2",
  annual_entitlement: "0",
  min_worked_days: "0",
  max_balance: "",
  carry_forward_enabled: false,
  max_carry_forward: "0",
  carry_forward_expiry_months: "0",
  lapse_unutilized: true,
  encashment_enabled: false,
  encashment_limit: "0",
  encashment_payable_percent: "100",
  negative_balance_allowed: false,
  max_negative_balance: "0",
  sandwich_applicable: false,
  include_holidays: false,
  include_weekoffs: false,
  requires_document_after_days: "",
  min_request_days: "0",
  max_request_days: "",
  max_requests_per_year: "0",
  accrual_day: "1",
  allow_half_day: true,
  requires_approval: true,
  auto_apply_by_scope: false,
  prorate: false,
  prorate_basis: "joining_date",
  rounding: "none",
  holiday_work_treatment: "none",
  comp_off_multiplier: "1",
  hours_per_day: "8",
  overtime_multiplier: "2",
  payroll_component_code: "",
  priority: "100",
};

function sortTenant(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeName(employee?: Employee) {
  if (!employee) return "-";
  return `${employee.firstname} ${employee.lastname || ""}`.trim() || employee.employee_code || employee.user_id;
}

function optionName(items: SetupOption[], id?: string | null) {
  if (!id) return "All";
  return items.find((item) => item.id === id)?.name || id.slice(0, 8);
}

function leaveTypeName(items: LeaveType[], id?: string | null) {
  if (!id) return "Leave";
  const item = items.find((type) => type.id === id);
  return item ? `${item.name}${item.shortcode ? ` (${item.shortcode})` : ""}` : id.slice(0, 8);
}

function numberOrUndefined(value: string) {
  return value.trim() === "" ? undefined : Number(value);
}

function csvCells(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = csvCells(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cells = csvCells(line);
    return headers.reduce<CSVRow>((row, header, index) => {
      row[header] = cells[index]?.trim() || "";
      return row;
    }, {});
  });
}

function csvValue(row: CSVRow, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value) return value.trim();
  }
  return "";
}

function numberFromCSV(row: CSVRow, keys: string[]) {
  const value = csvValue(row, keys);
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function keyValue(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function findLeaveType(types: LeaveType[], codes: string[], names: string[]) {
  const codeSet = new Set(codes.map((item) => item.toLowerCase()));
  const nameSet = names.map((item) => item.toLowerCase());
  return types.find((type) => type.shortcode && codeSet.has(type.shortcode.toLowerCase()))
    || types.find((type) => nameSet.some((name) => type.name.toLowerCase().includes(name)))
    || null;
}

function formulaConfig(form: RuleForm) {
  const config: Record<string, unknown> = {};
  if (form.auto_apply_by_scope) config.auto_apply_by_scope = true;
  if (form.prorate) {
    config.prorate = true;
    config.prorate_basis = form.prorate_basis;
    config.rounding = form.rounding;
  }
  if (form.accrual_method === "comp_off" || form.holiday_work_treatment === "comp_off") {
    config.multiplier = Number(form.comp_off_multiplier || 1);
    config.hours_per_day = Number(form.hours_per_day || 8);
  }
  if (form.holiday_work_treatment === "overtime") {
    config.holiday_work_treatment = "overtime";
    config.overtime_multiplier = Number(form.overtime_multiplier || 2);
    if (form.payroll_component_code.trim()) config.payroll_component_code = form.payroll_component_code.trim();
  }
  return config;
}

function presetRule(base: Partial<RuleForm>, leaveTypeID: string, fyID: string): RuleForm {
  return {
    ...emptyRuleForm,
    leave_type_id: leaveTypeID,
    fy_id: fyID,
    probation_status: "confirmed",
    allow_half_day: true,
    requires_approval: true,
    auto_apply_by_scope: true,
    ...base,
  };
}

function ruleBody(form: RuleForm) {
  return {
    ...form,
    fy_id: form.fy_id || undefined,
    department_id: form.department_id || undefined,
    employment_type_id: form.employment_type_id || undefined,
    designation_id: form.designation_id || undefined,
    probation_status: form.probation_status || "any",
    credit_days: Number(form.credit_days || 0),
    annual_entitlement: Number(form.annual_entitlement || 0),
    min_worked_days: Number(form.min_worked_days || 0),
    max_balance: numberOrUndefined(form.max_balance),
    max_carry_forward: Number(form.max_carry_forward || 0),
    carry_forward_expiry_months: Number(form.carry_forward_expiry_months || 0),
    encashment_limit: Number(form.encashment_limit || 0),
    encashment_payable_percent: Number(form.encashment_payable_percent || 100),
    max_negative_balance: Number(form.max_negative_balance || 0),
    requires_document_after_days: numberOrUndefined(form.requires_document_after_days),
    min_request_days: Number(form.min_request_days || 0),
    max_request_days: numberOrUndefined(form.max_request_days),
    max_requests_per_year: Number(form.max_requests_per_year || 0),
    accrual_day: Number(form.accrual_day || 1),
    priority: Number(form.priority || 100),
    calculation_config: formulaConfig(form),
  };
}

export function LeaveFoundationSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => sortTenant(a).localeCompare(sortTenant(b))), [tenants]);
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const effectiveTenant = isSuperAdmin ? selectedTenant : null;
  const basePath = isSuperAdmin && effectiveTenant ? `/hrms/tenants/${effectiveTenant.id}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(effectiveTenant);

  const [templates, setTemplates] = useState<LeaveTemplate[]>([]);
  const [rules, setRules] = useState<LeaveRule[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [departments, setDepartments] = useState<SetupOption[]>([]);
  const [designations, setDesignations] = useState<SetupOption[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<SetupOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [ledger, setLedger] = useState<LeaveLedger[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedFY, setSelectedFY] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState(balanceImportSample);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);

  const [templateForm, setTemplateForm] = useState({ name: "", code: "", description: "" });
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm);
  const [adjustForm, setAdjustForm] = useState({ leave_type_id: "", days: "1", transaction_type: "credit", remarks: "Opening/manual adjustment" });
  const enabledLeaveTypes = useMemo(() => leaveTypes.filter((item) => item.is_enabled !== false), [leaveTypes]);

  const loadData = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const [templateData, leaveTypeData, fyData, employeeData, departmentData, designationData, employmentData] = await Promise.all([
        apiRequest<LeaveTemplate[]>(`${basePath}/leave-policy-templates`),
        apiRequest<LeaveType[]>(`${basePath}/leave-types`),
        apiRequest<FinancialYear[]>(`${basePath}/financial-years`),
        apiRequest<Employee[]>(`${basePath}/employees`),
        apiRequest<SetupOption[]>(`${basePath}/departments`),
        apiRequest<SetupOption[]>(`${basePath}/designations`),
        apiRequest<SetupOption[]>(`${basePath}/employment-types`),
      ]);
      setTemplates(templateData);
      setLeaveTypes(leaveTypeData);
      setFinancialYears(fyData);
      setEmployees(employeeData);
      setDepartments(departmentData);
      setDesignations(designationData);
      setEmploymentTypes(employmentData);
      setSelectedTemplate((current) => current || templateData.find((item) => !item.is_system)?.id || templateData[0]?.id || "");
      setSelectedFY((current) => current || fyData.find((item) => item.is_active)?.id || fyData[0]?.id || "");
      setSelectedEmployee((current) => current || employeeData[0]?.user_id || "");
      setRuleForm((current) => ({ ...current, leave_type_id: current.leave_type_id || leaveTypeData.find((item) => item.is_enabled !== false)?.id || "", fy_id: current.fy_id || fyData.find((item) => item.is_active)?.id || "" }));
      setAdjustForm((current) => ({ ...current, leave_type_id: current.leave_type_id || leaveTypeData.find((item) => item.is_enabled !== false)?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave foundation data.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad]);

  const loadRules = useCallback(async () => {
    if (!canLoad || !selectedTemplate) return;
    try {
      setRules(await apiRequest<LeaveRule[]>(`${basePath}/leave-policy-templates/${selectedTemplate}/rules`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load template rules.");
    }
  }, [basePath, canLoad, selectedTemplate]);

  const loadEmployeeBalances = useCallback(async () => {
    if (!canLoad || !selectedEmployee) return;
    try {
      const [balanceData, ledgerData] = await Promise.all([
        apiRequest<LeaveBalance[]>(`${basePath}/leave-balances?user_id=${selectedEmployee}`),
        apiRequest<LeaveLedger[]>(`${basePath}/leave-ledger?user_id=${selectedEmployee}`),
      ]);
      setBalances(balanceData);
      setLedger(ledgerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load balances.");
    }
  }, [basePath, canLoad, selectedEmployee]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRules(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRules]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEmployeeBalances(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEmployeeBalances]);

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const item = await apiRequest<LeaveTemplate>(`${basePath}/leave-policy-templates`, { method: "POST", body: templateForm });
      setTemplates((items) => [item, ...items]);
      setSelectedTemplate(item.id);
      setTemplateForm({ name: "", code: "", description: "" });
      setMessage("Template created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create template.");
    }
  }

  async function createRule(event: FormEvent) {
    event.preventDefault();
    if (!selectedTemplate) return;
    setMessage("");
    setError("");
    try {
      const item = await apiRequest<LeaveRule>(`${basePath}/leave-policy-templates/${selectedTemplate}/rules`, { method: "POST", body: ruleBody(ruleForm) });
      setRules((items) => [...items, item]);
      setMessage("Rule added to template.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add rule.");
    }
  }

  async function createStarterTemplate(kind: "confirmed_monthly" | "yearly_upfront") {
    if (!selectedFY) {
      setError("Select a financial year before creating a starter template.");
      return;
    }
    const sick = findLeaveType(enabledLeaveTypes, ["SL"], ["sick"]);
    const casual = findLeaveType(enabledLeaveTypes, ["CL"], ["casual"]);
    const earned = findLeaveType(enabledLeaveTypes, ["EL", "AL"], ["earned", "annual", "paid"]);
    const compOff = findLeaveType(enabledLeaveTypes, ["CO", "TOIL"], ["compensatory", "time off in lieu"]);
    if (!sick || !casual || !earned) {
      setError("Sick, Casual, and Earned/Annual leave types are required before creating this starter template.");
      return;
    }
    setMessage("");
    setError("");
    try {
      const suffix = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
      const templateBody = kind === "confirmed_monthly"
        ? { name: "Confirmed yearly plus monthly paid leave", code: `CONFIRMED_MONTHLY_${suffix}`, description: "Starter: 7 sick and 5 casual credited yearly on a prorated confirmation basis; 2.5 earned leave credited monthly." }
        : { name: "Yearly upfront with holiday work choice", code: `YEARLY_UPFRONT_${suffix}`, description: "Starter: yearly upfront paid leave setup with configurable holiday-work treatment through comp-off or overtime rules." };
      const template = await apiRequest<LeaveTemplate>(`${basePath}/leave-policy-templates`, { method: "POST", body: templateBody });
      const presetRules = kind === "confirmed_monthly"
        ? [
            presetRule({ accrual_method: "fixed_yearly", accrual_frequency: "yearly", credit_days: "7", annual_entitlement: "7", prorate: true, prorate_basis: "confirmation_date", rounding: "nearest_half", priority: "10" }, sick.id, selectedFY),
            presetRule({ accrual_method: "fixed_yearly", accrual_frequency: "yearly", credit_days: "5", annual_entitlement: "5", prorate: true, prorate_basis: "confirmation_date", rounding: "nearest_half", priority: "20" }, casual.id, selectedFY),
            presetRule({ accrual_method: "monthly_fixed", accrual_frequency: "monthly", credit_days: "2.5", annual_entitlement: "30", priority: "30" }, earned.id, selectedFY),
          ]
        : [
            presetRule({ accrual_method: "fixed_yearly", accrual_frequency: "yearly", credit_days: "7", annual_entitlement: "7", prorate: true, prorate_basis: "joining_date", rounding: "nearest_half", priority: "10" }, sick.id, selectedFY),
            presetRule({ accrual_method: "fixed_yearly", accrual_frequency: "yearly", credit_days: "5", annual_entitlement: "5", prorate: true, prorate_basis: "joining_date", rounding: "nearest_half", priority: "20" }, casual.id, selectedFY),
            presetRule({ accrual_method: "fixed_yearly", accrual_frequency: "yearly", credit_days: "30", annual_entitlement: "30", prorate: true, prorate_basis: "joining_date", rounding: "nearest_half", priority: "30" }, earned.id, selectedFY),
            ...(compOff ? [presetRule({ accrual_method: "comp_off", accrual_frequency: "manual", credit_days: "0", annual_entitlement: "0", holiday_work_treatment: "comp_off", comp_off_multiplier: "1", hours_per_day: "8", priority: "40" }, compOff.id, selectedFY)] : []),
          ];
      const createdRules = await Promise.all(presetRules.map((rule) => apiRequest<LeaveRule>(`${basePath}/leave-policy-templates/${template.id}/rules`, { method: "POST", body: ruleBody(rule) })));
      setTemplates((items) => [template, ...items]);
      setSelectedTemplate(template.id);
      setRules(createdRules);
      setMessage("Starter leave template created. Review and adjust rules before assigning it to employees.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create starter template.");
    }
  }

  async function assignTemplate() {
    if (!selectedEmployee || !selectedTemplate) return;
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leave-policy-assignments`, { method: "POST", body: { user_id: selectedEmployee, template_id: selectedTemplate, fy_id: selectedFY || undefined, effective_from: new Date().toISOString() } });
      setMessage("Template assigned to employee.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign template.");
    }
  }

  async function adjustBalance(event: FormEvent) {
    event.preventDefault();
    if (!selectedEmployee || !selectedFY) return;
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leave-balances/adjust`, { method: "POST", body: { user_id: selectedEmployee, fy_id: selectedFY, leave_type_id: adjustForm.leave_type_id, days: Number(adjustForm.days || 0), transaction_type: adjustForm.transaction_type, source_type: "manual_adjustment", remarks: adjustForm.remarks } });
      setMessage("Balance adjusted with ledger entry.");
      await loadEmployeeBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to adjust balance.");
    }
  }

  async function runAccrual() {
    if (!selectedFY) return;
    setMessage("");
    setError("");
    try {
      const month = new Date().getMonth() + 1;
      const posted = await apiRequest<LeaveLedger[]>(`${basePath}/leave-accrual/run`, { method: "POST", body: { fy_id: selectedFY, month } });
      setMessage(`Accrual posted ${posted.length} ledger entries.`);
      await loadEmployeeBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run accrual.");
    }
  }

  async function importBalanceCSV(event: FormEvent) {
    event.preventDefault();
    if (!selectedFY) return;
    setMessage("");
    setError("");
    setBulkResult(null);
    const rows = parseCSV(bulkText);
    if (rows.length === 0) {
      setError("Upload a CSV with a header row and at least one balance row.");
      return;
    }
    const employeeByUserID = new Map<string, Employee>();
    const employeeByCode = new Map<string, Employee>();
    const employeeByEmail = new Map<string, Employee>();
    employees.forEach((item) => {
      employeeByUserID.set(keyValue(item.user_id), item);
      if (keyValue(item.employee_code)) employeeByCode.set(keyValue(item.employee_code), item);
      if (keyValue(item.email)) employeeByEmail.set(keyValue(item.email), item);
    });
    const typeByID = new Map<string, LeaveType>();
    const typeByCode = new Map<string, LeaveType>();
    const typeByName = new Map<string, LeaveType>();
    leaveTypes.forEach((item) => {
      typeByID.set(keyValue(item.id), item);
      if (keyValue(item.shortcode)) typeByCode.set(keyValue(item.shortcode), item);
      typeByName.set(keyValue(item.name), item);
    });
    const result: BulkImportResult = { errors: [], failed: 0, success: 0, total: rows.length };
    setBulkImporting(true);
    try {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowNumber = index + 2;
        const employeeKey = csvValue(row, ["user_id", "employee_code", "email"]);
        const leaveTypeKey = csvValue(row, ["leave_type_id", "leave_type", "leave_type_code", "shortcode"]);
        const employee = employeeByUserID.get(keyValue(employeeKey)) || employeeByCode.get(keyValue(employeeKey)) || employeeByEmail.get(keyValue(employeeKey));
        const leaveType = typeByID.get(keyValue(leaveTypeKey)) || typeByCode.get(keyValue(leaveTypeKey)) || typeByName.get(keyValue(leaveTypeKey));
        const usedDays = numberFromCSV(row, ["used_days", "used"]);
        const pendingDays = numberFromCSV(row, ["pending_days", "pending"]);
        const totalFromCSV = csvValue(row, ["total_days", "total"]);
        const availableFromCSV = csvValue(row, ["available_days", "balance_days", "available", "balance"]);
        const parsedTotal = totalFromCSV ? Number(totalFromCSV) : Number.NaN;
        const parsedAvailable = availableFromCSV ? Number(availableFromCSV) : Number.NaN;
        if (!employee) {
          result.failed += 1;
          result.errors.push(`Row ${rowNumber}: employee not found`);
          continue;
        }
        if (!leaveType) {
          result.failed += 1;
          result.errors.push(`Row ${rowNumber}: leave type not found`);
          continue;
        }
        if ([usedDays, pendingDays].some((value) => Number.isNaN(value) || value < 0)) {
          result.failed += 1;
          result.errors.push(`Row ${rowNumber}: invalid used or pending days`);
          continue;
        }
        const totalDays = Number.isFinite(parsedTotal) ? parsedTotal : Number.isFinite(parsedAvailable) ? parsedAvailable + usedDays + pendingDays : Number.NaN;
        if (!Number.isFinite(totalDays) || totalDays < 0 || totalDays < usedDays + pendingDays) {
          result.failed += 1;
          result.errors.push(`Row ${rowNumber}: invalid total or available days`);
          continue;
        }
        try {
          await apiRequest(`${basePath}/leave-balances`, { method: "POST", body: { user_id: employee.user_id, fy_id: selectedFY, leave_type_id: leaveType.id, total_days: totalDays, used_days: usedDays, pending_days: pendingDays } });
          result.success += 1;
        } catch (err) {
          result.failed += 1;
          result.errors.push(`Row ${rowNumber}: ${err instanceof Error ? err.message : "import failed"}`);
        }
      }
      setBulkResult(result);
      setMessage(`Imported ${result.success} leave balance row${result.success === 1 ? "" : "s"}.`);
      await loadEmployeeBalances();
    } finally {
      setBulkImporting(false);
    }
  }

  async function loadBalanceCSVFile(file?: File) {
    if (!file) return;
    setBulkText(await file.text());
  }

  if (isSuperAdmin && !effectiveTenant) {
    return (
      <section className="mt-8 rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Engine</p>
        <h2 className="mt-2 text-3xl font-bold text-[#111827]">Templates, balances and ledger</h2>
        {tenantsError ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{tenantsError}</p> : null}
        <select className="mt-5 h-12 w-full rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={tenantsLoading} onChange={(event) => setSelectedTenant(sortedTenants.find((tenant) => tenant.id === event.target.value) || null)} value={selectedTenant?.id || ""}>
          <option value="">Select tenant to configure leave engine</option>
          {sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}
        </select>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-6 rounded-3xl border border-[#dfe6e2] bg-[#fbfdfb] p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Engine</p>
          <h2 className="mt-2 text-3xl font-bold text-[#111827]">Policy templates, balances and ledger</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">Configure per-tenant leave entitlements by leave type, financial year, department, employment type, designation, probation status, accrual, carry-forward, encashment, and request limits.</p>
        </div>
        <button className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={loading || !selectedFY} onClick={runAccrual} type="button">Run monthly accrual</button>
      </div>
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="grid gap-8">
        <div className="rounded-2xl border border-[#e2e8e4] bg-white p-5">
          <h3 className="text-xl font-black text-[#111827]">Template library</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button className="rounded-2xl border border-[#dbe8e1] bg-[#f8faf9] p-4 text-left hover:border-[#588368]" onClick={() => void createStarterTemplate("confirmed_monthly")} type="button">
              <span className="text-xs font-black uppercase tracking-wide text-[#588368]">Starter</span>
              <strong className="mt-1 block text-sm text-[#111827]">Confirmed yearly + monthly paid leave</strong>
              <span className="mt-1 block text-xs font-semibold text-[#6b7280]">7 sick, 5 casual prorated from confirmation; 2.5 earned leave monthly.</span>
            </button>
            <button className="rounded-2xl border border-[#dbe8e1] bg-[#f8faf9] p-4 text-left hover:border-[#588368]" onClick={() => void createStarterTemplate("yearly_upfront")} type="button">
              <span className="text-xs font-black uppercase tracking-wide text-[#588368]">Starter</span>
              <strong className="mt-1 block text-sm text-[#111827]">Yearly upfront with holiday work choice</strong>
              <span className="mt-1 block text-xs font-semibold text-[#6b7280]">Sick, casual, and earned leave credited yearly with configurable comp-off/overtime settings.</span>
            </button>
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={createTemplate}>
            <input className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Template name" required value={templateForm.name} />
            <input className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm uppercase outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, "_") }))} placeholder="CODE" required value={templateForm.code} />
            <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" type="submit">Create template</button>
          </form>
          <textarea className="mt-3 w-full rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" value={templateForm.description} />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <button className={`rounded-2xl border p-4 text-left ${selectedTemplate === template.id ? "border-[#588368] bg-[#eef4f1]" : "border-[#e2e8e4] bg-white"}`} key={template.id} onClick={() => setSelectedTemplate(template.id)} type="button">
                <span className="text-xs font-black uppercase tracking-wide text-[#588368]">{template.is_system ? "System" : "Tenant"}</span>
                <strong className="mt-1 block text-sm text-[#111827]">{template.name}</strong>
                <span className="mt-1 block text-xs font-bold text-[#6b7280]">{template.code}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e2e8e4] bg-white p-5">
          <h3 className="text-xl font-black text-[#111827]">Policy rule builder</h3>
          <form className="mt-4 space-y-4" onSubmit={createRule}>
            <RuleGroup title="Scope">
              <SelectField label="Leave type" value={ruleForm.leave_type_id} onChange={(value) => setRuleForm((f) => ({ ...f, leave_type_id: value }))} required options={enabledLeaveTypes.map((item) => ({ id: item.id, name: leaveTypeName(enabledLeaveTypes, item.id) }))} placeholder="Leave type" />
              <SelectField label="Financial year" value={ruleForm.fy_id} onChange={(value) => setRuleForm((f) => ({ ...f, fy_id: value }))} options={financialYears} placeholder="All financial years" />
              <SelectField label="Department" value={ruleForm.department_id} onChange={(value) => setRuleForm((f) => ({ ...f, department_id: value }))} options={departments} placeholder="All departments" />
              <SelectField label="Employment type" value={ruleForm.employment_type_id} onChange={(value) => setRuleForm((f) => ({ ...f, employment_type_id: value }))} options={employmentTypes} placeholder="All employment types" />
              <SelectField label="Designation" value={ruleForm.designation_id} onChange={(value) => setRuleForm((f) => ({ ...f, designation_id: value }))} options={designations} placeholder="All designations" />
              <SelectField label="Probation" value={ruleForm.probation_status} onChange={(value) => setRuleForm((f) => ({ ...f, probation_status: value }))} options={[{ id: "any", name: "Any" }, { id: "probation", name: "Probation only" }, { id: "confirmed", name: "Confirmed only" }]} />
              <CheckField label="Auto-apply to matching employees" checked={ruleForm.auto_apply_by_scope} onChange={(checked) => setRuleForm((f) => ({ ...f, auto_apply_by_scope: checked }))} />
            </RuleGroup>
            <RuleGroup title="Entitlement and accrual">
              <SelectField label="Accrual method" value={ruleForm.accrual_method} onChange={(value) => setRuleForm((f) => ({ ...f, accrual_method: value }))} options={methods.map((item) => ({ id: item, name: item }))} />
              <SelectField label="Frequency" value={ruleForm.accrual_frequency} onChange={(value) => setRuleForm((f) => ({ ...f, accrual_frequency: value }))} options={frequencies.map((item) => ({ id: item, name: item }))} />
              <InputField label="Credit days per cycle" type="number" value={ruleForm.credit_days} onChange={(value) => setRuleForm((f) => ({ ...f, credit_days: value }))} />
              <InputField label="Annual entitlement cap" type="number" value={ruleForm.annual_entitlement} onChange={(value) => setRuleForm((f) => ({ ...f, annual_entitlement: value }))} />
              <InputField label="Accrual day" type="number" value={ruleForm.accrual_day} onChange={(value) => setRuleForm((f) => ({ ...f, accrual_day: value }))} />
              <InputField label="Min worked days" type="number" value={ruleForm.min_worked_days} onChange={(value) => setRuleForm((f) => ({ ...f, min_worked_days: value }))} />
              <CheckField label="Prorate yearly credit" checked={ruleForm.prorate} onChange={(checked) => setRuleForm((f) => ({ ...f, prorate: checked }))} />
              <SelectField label="Prorate from" value={ruleForm.prorate_basis} onChange={(value) => setRuleForm((f) => ({ ...f, prorate_basis: value }))} options={[{ id: "joining_date", name: "Joining date" }, { id: "confirmation_date", name: "Confirmation date" }, { id: "period_start", name: "Financial year start" }]} />
              <SelectField label="Rounding" value={ruleForm.rounding} onChange={(value) => setRuleForm((f) => ({ ...f, rounding: value }))} options={[{ id: "none", name: "No rounding" }, { id: "nearest_half", name: "Nearest 0.5 day" }, { id: "floor_half", name: "Round down to 0.5" }, { id: "ceil_half", name: "Round up to 0.5" }, { id: "nearest_day", name: "Nearest day" }, { id: "floor_day", name: "Round down to day" }, { id: "ceil_day", name: "Round up to day" }]} />
            </RuleGroup>
            <RuleGroup title="Balance and request limits">
              <InputField label="Max balance" type="number" value={ruleForm.max_balance} onChange={(value) => setRuleForm((f) => ({ ...f, max_balance: value }))} placeholder="No cap" />
              <InputField label="Min request days" type="number" value={ruleForm.min_request_days} onChange={(value) => setRuleForm((f) => ({ ...f, min_request_days: value }))} />
              <InputField label="Max request days" type="number" value={ruleForm.max_request_days} onChange={(value) => setRuleForm((f) => ({ ...f, max_request_days: value }))} placeholder="No limit" />
              <InputField label="Requests per year" type="number" value={ruleForm.max_requests_per_year} onChange={(value) => setRuleForm((f) => ({ ...f, max_requests_per_year: value }))} />
              <CheckField label="Allow half day" checked={ruleForm.allow_half_day} onChange={(checked) => setRuleForm((f) => ({ ...f, allow_half_day: checked }))} />
              <CheckField label="Requires approval" checked={ruleForm.requires_approval} onChange={(checked) => setRuleForm((f) => ({ ...f, requires_approval: checked }))} />
            </RuleGroup>
            <RuleGroup title="Carry-forward and encashment">
              <CheckField label="Carry forward" checked={ruleForm.carry_forward_enabled} onChange={(checked) => setRuleForm((f) => ({ ...f, carry_forward_enabled: checked }))} />
              <InputField label="Carry cap" type="number" value={ruleForm.max_carry_forward} onChange={(value) => setRuleForm((f) => ({ ...f, max_carry_forward: value }))} />
              <InputField label="Expiry months" type="number" value={ruleForm.carry_forward_expiry_months} onChange={(value) => setRuleForm((f) => ({ ...f, carry_forward_expiry_months: value }))} />
              <CheckField label="Lapse unused balance" checked={ruleForm.lapse_unutilized} onChange={(checked) => setRuleForm((f) => ({ ...f, lapse_unutilized: checked }))} />
              <CheckField label="Encashment" checked={ruleForm.encashment_enabled} onChange={(checked) => setRuleForm((f) => ({ ...f, encashment_enabled: checked }))} />
              <InputField label="Encashment cap" type="number" value={ruleForm.encashment_limit} onChange={(value) => setRuleForm((f) => ({ ...f, encashment_limit: value }))} />
              <InputField label="Payable percent" type="number" value={ruleForm.encashment_payable_percent} onChange={(value) => setRuleForm((f) => ({ ...f, encashment_payable_percent: value }))} />
            </RuleGroup>
            <RuleGroup title="Special rules">
              <CheckField label="Negative balance" checked={ruleForm.negative_balance_allowed} onChange={(checked) => setRuleForm((f) => ({ ...f, negative_balance_allowed: checked }))} />
              <InputField label="Negative cap" type="number" value={ruleForm.max_negative_balance} onChange={(value) => setRuleForm((f) => ({ ...f, max_negative_balance: value }))} />
              <CheckField label="Sandwich policy" checked={ruleForm.sandwich_applicable} onChange={(checked) => setRuleForm((f) => ({ ...f, sandwich_applicable: checked }))} />
              <CheckField label="Include holidays" checked={ruleForm.include_holidays} onChange={(checked) => setRuleForm((f) => ({ ...f, include_holidays: checked }))} />
              <CheckField label="Include weekoffs" checked={ruleForm.include_weekoffs} onChange={(checked) => setRuleForm((f) => ({ ...f, include_weekoffs: checked }))} />
              <InputField label="Document after days" type="number" value={ruleForm.requires_document_after_days} onChange={(value) => setRuleForm((f) => ({ ...f, requires_document_after_days: value }))} placeholder="Optional" />
              <SelectField label="Holiday work treatment" value={ruleForm.holiday_work_treatment} onChange={(value) => setRuleForm((f) => ({ ...f, holiday_work_treatment: value }))} options={[{ id: "none", name: "Not part of this rule" }, { id: "comp_off", name: "Credit comp-off" }, { id: "overtime", name: "Pay overtime" }]} />
              <InputField label="Comp-off multiplier" type="number" value={ruleForm.comp_off_multiplier} onChange={(value) => setRuleForm((f) => ({ ...f, comp_off_multiplier: value }))} />
              <InputField label="Hours per day" type="number" value={ruleForm.hours_per_day} onChange={(value) => setRuleForm((f) => ({ ...f, hours_per_day: value }))} />
              <InputField label="Overtime multiplier" type="number" value={ruleForm.overtime_multiplier} onChange={(value) => setRuleForm((f) => ({ ...f, overtime_multiplier: value }))} />
              <InputField label="Payroll component" value={ruleForm.payroll_component_code} onChange={(value) => setRuleForm((f) => ({ ...f, payroll_component_code: value }))} placeholder="Optional" />
              <InputField label="Priority" type="number" value={ruleForm.priority} onChange={(value) => setRuleForm((f) => ({ ...f, priority: value }))} />
            </RuleGroup>
            <button className="w-full rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" type="submit">Add policy rule</button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e2e8e4] bg-white p-5">
        <h3 className="text-xl font-black text-[#111827]">Rules in selected template</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {rules.map((rule) => (
            <article className="rounded-2xl border border-[#edf1ef] p-4 text-sm" key={rule.id}>
              <div className="flex flex-wrap items-center gap-2"><strong className="text-[#111827]">{leaveTypeName(leaveTypes, rule.leave_type_id)}</strong><Pill>{rule.accrual_method}</Pill><Pill>{rule.accrual_frequency}</Pill></div>
              <p className="mt-2 text-[#6b7280]">Scope: {optionName(departments, rule.department_id)} dept · {optionName(employmentTypes, rule.employment_type_id)} employment · {optionName(designations, rule.designation_id)} designation · {rule.probation_status || "any"}</p>
              <p className="mt-2 font-bold text-[#374151]">Credit {rule.credit_days} per cycle · Annual cap {rule.annual_entitlement || "none"} · Balance cap {rule.max_balance ?? "none"}</p>
              {rule.calculation_config && Object.keys(rule.calculation_config).length > 0 ? <p className="mt-1 text-[#6b7280]">Formula: {Object.entries(rule.calculation_config).map(([key, value]) => `${key}=${String(value)}`).join(" · ")}</p> : null}
              <p className="mt-1 text-[#6b7280]">Carry {rule.carry_forward_enabled ? `${rule.max_carry_forward} days, ${rule.carry_forward_expiry_months || "no"} month expiry` : "off"} · Encash {rule.encashment_enabled ? `${rule.encashment_limit} days at ${rule.encashment_payable_percent}%` : "off"}</p>
              <p className="mt-1 text-[#6b7280]">Request {rule.min_request_days || 0} min / {rule.max_request_days ?? "no"} max · Half day {rule.allow_half_day ? "allowed" : "blocked"} · Approval {rule.requires_approval ? "required" : "not required"}</p>
            </article>
          ))}
          {rules.length === 0 ? <p className="text-sm font-semibold text-[#6b7280]">No rules added for selected template.</p> : null}
        </div>
      </div>

      <div className="grid gap-8">
        <div className="rounded-2xl border border-[#e2e8e4] bg-white p-5">
          <h3 className="text-xl font-black text-[#111827]">Employee balance tools</h3>
          <div className="mt-4 grid gap-3">
            <select className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm" onChange={(e) => setSelectedEmployee(e.target.value)} value={selectedEmployee}><option value="">Select employee</option>{employees.map((item) => <option key={item.user_id} value={item.user_id}>{employeeName(item)}</option>)}</select>
            <select className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm" onChange={(e) => setSelectedFY(e.target.value)} value={selectedFY}><option value="">Financial year</option>{financialYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <button className="rounded-xl border border-[#588368] px-4 py-3 text-sm font-black text-[#588368]" onClick={assignTemplate} type="button">Assign selected template</button>
          </div>
          <form className="mt-5 grid gap-3" onSubmit={adjustBalance}>
            <select className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm" onChange={(e) => setAdjustForm((f) => ({ ...f, leave_type_id: e.target.value }))} required value={adjustForm.leave_type_id}><option value="">Leave type</option>{enabledLeaveTypes.map((item) => <option key={item.id} value={item.id}>{leaveTypeName(enabledLeaveTypes, item.id)}</option>)}</select>
            <div className="grid grid-cols-2 gap-3"><input className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm" onChange={(e) => setAdjustForm((f) => ({ ...f, days: e.target.value }))} type="number" value={adjustForm.days} /><select className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm" onChange={(e) => setAdjustForm((f) => ({ ...f, transaction_type: e.target.value }))} value={adjustForm.transaction_type}><option value="credit">Credit</option><option value="debit">Debit</option></select></div>
            <input className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm" onChange={(e) => setAdjustForm((f) => ({ ...f, remarks: e.target.value }))} value={adjustForm.remarks} />
            <button className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white" type="submit">Post adjustment</button>
          </form>
          <form className="mt-6 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4" onSubmit={importBalanceCSV}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-black text-[#111827]">Import opening balances</h4>
                <p className="mt-1 text-xs font-semibold text-[#6b7280]">Use employee code, user ID, or email with leave type name, code, or ID.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#dbe8e1] bg-white px-4 py-2 text-xs font-black text-[#374151]">
                Upload CSV
                <input accept=".csv,text/csv" className="hidden" onChange={(event) => void loadBalanceCSVFile(event.target.files?.[0])} type="file" />
              </label>
            </div>
            <textarea className="mt-3 min-h-32 w-full rounded-xl border border-[#dbe8e1] bg-white px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(event) => setBulkText(event.target.value)} value={bulkText} />
            <button className="mt-3 w-full rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#9ca3af]" disabled={bulkImporting || !selectedFY} type="submit">{bulkImporting ? "Importing..." : "Import balances"}</button>
            {bulkResult ? (
              <div className="mt-3 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#374151]">
                <p>{bulkResult.success} imported · {bulkResult.failed} failed</p>
                {bulkResult.errors.length > 0 ? <ul className="mt-2 space-y-1 text-red-700">{bulkResult.errors.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul> : null}
              </div>
            ) : null}
          </form>
        </div>

        <div className="rounded-2xl border border-[#e2e8e4] bg-white p-5">
          <h3 className="text-xl font-black text-[#111827]">Balances and ledger</h3>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-[#f8faf9] text-xs uppercase text-[#6b7280]"><tr><th className="p-3">Leave type</th><th className="p-3">Total</th><th className="p-3">Pending</th><th className="p-3">Used</th><th className="p-3">Available</th></tr></thead><tbody>{balances.map((item) => <tr className="border-t border-[#edf1ef]" key={item.id}><td className="p-3 font-bold">{leaveTypeName(leaveTypes, item.leave_type_id)}</td><td className="p-3">{item.total_days}</td><td className="p-3">{item.pending_days}</td><td className="p-3">{item.used_days}</td><td className="p-3 font-black text-[#588368]">{item.balance_days}</td></tr>)}</tbody></table></div>
          <div className="mt-5 max-h-[280px] space-y-3 overflow-y-auto pr-2">{ledger.map((item) => <div className="rounded-xl border border-[#edf1ef] p-3 text-sm" key={item.id}><strong className={item.transaction_type === "credit" ? "text-emerald-700" : "text-red-700"}>{item.transaction_type.toUpperCase()} {item.days}</strong><span className="ml-2 text-[#6b7280]">{item.source_type}</span><p className="mt-1 text-xs text-[#6b7280]">{item.remarks || "No remarks"}</p></div>)}</div>
        </div>
      </div>
    </section>
  );
}

function RuleGroup({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="rounded-2xl border border-[#edf1ef] p-4"><legend className="px-2 text-xs font-black uppercase tracking-[0.16em] text-[#588368]">{title}</legend><div className="mt-2 grid gap-3 md:grid-cols-2">{children}</div></fieldset>;
}

function InputField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe8e1] px-4 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} step={type === "number" ? "any" : undefined} type={type} value={value} /></label>;
}

function SelectField({ label, value, onChange, options, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; options: SetupOption[]; placeholder?: string; required?: boolean }) {
  return <label className="block text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe8e1] bg-white px-4 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} value={value}>{placeholder ? <option value="">{placeholder}</option> : null}{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#dbe8e1] bg-white px-4 py-3 text-sm font-bold text-[#374151]"><input className="size-4 rounded border-[#dbe8e1] text-[#588368]" checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{children}</span>;
}
