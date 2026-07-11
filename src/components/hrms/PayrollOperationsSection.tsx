"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";

type FY = { id: string; name: string; is_active?: boolean };
type Template = { id: string; name: string; fy_id: string; is_active?: boolean };
type Branch = { id: string; branch_name?: string; name?: string; state?: string | null };
type Department = { id: string; name: string };
type EmploymentType = { id: string; name: string };
type Employee = { id: string; user_id: string; employee_code?: string | null; firstname: string; lastname?: string | null };
type PayrollLock = { id: string; month: number; year: number; status: string; notes?: string | null; unlock_reason?: string | null; events?: { id: string; action: string; from_status?: string | null; to_status?: string | null; created_at: string }[] };
type StatRule = { id: string; rule_type: string; name: string; state?: string | null; branch_id?: string | null; effective_from: string; effective_to?: string | null; min_gross_salary?: number | null; max_gross_salary?: number | null; employee_amount: number; employer_amount: number; frequency: string; deduction_month?: number | null; notes?: string | null };
type ImportBatch = { id: string; import_type: string; status: string; total_rows: number; valid_rows: number; invalid_rows: number; applied_rows: number; created_at: string; rows?: ImportRow[] };
type ImportRow = { id: string; row_number: number; employee_code?: string | null; employee_name?: string | null; gross_salary?: number | null; status: string; error_message?: string | null };
type SheetRow = { salary_slip_id: string; employee_code?: string | null; firstname: string; lastname?: string | null; branch_name?: string | null; department_name?: string | null; gross_salary: number; total_earnings: number; total_deductions: number; absent_deduction: number; net_salary: number; present_days: number; absent_days: number; lwp_days: number };
type ReconcileRow = { employee_id: string; employee_code?: string | null; firstname: string; lastname?: string | null; branch_name?: string | null; department_name?: string | null; salary_slip_id?: string | null; present_days?: number | null; absent_days?: number | null; lwp_days?: number | null; net_salary?: number | null; reconciliation_status: string };
type PayGroup = { id: string; code: string; name: string; description?: string | null; grouping_type: string; branch_id?: string | null; department_id?: string | null; employment_type_id?: string | null; reporting_tag?: string | null; is_active: boolean; employee_count?: number; members?: PayGroupMember[] };
type PayGroupMember = { id: string; pay_group_id: string; user_id: string; membership_type: string; effective_from?: string | null; effective_to?: string | null };
type PayGroupEmployee = { employee_id: string; user_id: string; employee_code?: string | null; firstname: string; lastname?: string | null; branch_name?: string | null; department_name?: string | null; employment_type_name?: string | null; match_source: string };
type PayRunEmployee = { id: string; user_id: string; readiness_status: string; blocker_reason?: string | null; salary_slip_id?: string | null; employee_code?: string | null; firstname?: string | null; lastname?: string | null; branch_name?: string | null; department_name?: string | null; gross_amount?: number; earnings_amount?: number; deductions_amount?: number; net_amount?: number };
type PayRun = { id: string; pay_group_id: string; fy_id: string; month: number; year: number; status: string; employee_count: number; ready_count: number; blocked_count: number; generated_count: number; notes?: string | null; employees?: PayRunEmployee[] };
type PayRunLedgerSummary = { pay_run_id: string; employee_count: number; draft_employee_count: number; gross_amount: number; total_earnings: number; total_deductions: number; net_amount: number; employer_cost_amount: number; input_count: number; component_count: number };
type PayRunInput = { id: string; user_id: string; input_type: string; source_type: string; description: string; quantity?: number | null; amount?: number | null; employee_code?: string | null; firstname?: string | null; lastname?: string | null };
type PayRunComponent = { id: string; user_id: string; component_type: string; code: string; name: string; amount: number; statutory?: boolean; employer_cost?: boolean; employee_code?: string | null; firstname?: string | null; lastname?: string | null };
type PayRunCommandCenter = { run: PayRun; summary: PayRunLedgerSummary; inputs?: PayRunInput[]; components?: PayRunComponent[] };

function nowMonth() { return new Date().getMonth() + 1; }
function nowYear() { return new Date().getFullYear(); }
function dateOnly(value?: string | null) { return value ? value.slice(0, 10) : "-"; }
function name(first: string, last?: string | null) { return [first, last].filter(Boolean).join(" "); }
function money(value?: number | null) { return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value || 0); }
function badge(status: string) {
  if (["applied", "locked", "ok"].includes(status)) return "bg-[#e7f6ed] text-[#237a45]";
  if (["failed", "missing_payslip", "lop_without_deduction"].includes(status)) return "bg-[#fee2e2] text-[#b91c1c]";
  if (["partial", "unlocked"].includes(status)) return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

export function PayrollOperationsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const rows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Payroll Operations</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage imports, statutory rules, salary sheets, reconciliation, and period locks.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setTenant(row)} type="button">Open Payroll</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <PayrollOpsWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function PayrollOpsWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [month, setMonth] = useState(nowMonth());
  const [year, setYear] = useState(nowYear());
  const [fys, setFys] = useState<FY[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locks, setLocks] = useState<PayrollLock[]>([]);
  const [rules, setRules] = useState<StatRule[]>([]);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [sheet, setSheet] = useState<SheetRow[]>([]);
  const [reconcile, setReconcile] = useState<ReconcileRow[]>([]);
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [payGroupPreview, setPayGroupPreview] = useState<PayGroupEmployee[]>([]);
  const [selectedPayGroupID, setSelectedPayGroupID] = useState("");
  const [selectedPayRunID, setSelectedPayRunID] = useState("");
  const [commandCenter, setCommandCenter] = useState<PayRunCommandCenter | null>(null);
  const [payModal, setPayModal] = useState<"" | "group" | "member" | "run">("");
  const [selectedImport, setSelectedImport] = useState<ImportBatch | null>(null);
  const [csvText, setCsvText] = useState("employee_code,gross_salary\n");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [ruleForm, setRuleForm] = useState({ rule_type: "pt", name: "", state: "", branch_id: "", effective_from: new Date().toISOString().slice(0, 10), effective_to: "", min_gross_salary: "", max_gross_salary: "", employee_amount: "0", employer_amount: "0", frequency: "monthly", deduction_month: "", notes: "" });
  const [importForm, setImportForm] = useState({ fy_id: "", template_id: "", apply: true, file_name: "payroll-import.csv" });
  const [payGroupForm, setPayGroupForm] = useState({ code: "", name: "", description: "", grouping_type: "all", branch_id: "", department_id: "", employment_type_id: "", reporting_tag: "", is_active: true });
  const [memberForm, setMemberForm] = useState({ pay_group_id: "", user_id: "", membership_type: "manual_include", effective_from: "", effective_to: "" });
  const [payRunForm, setPayRunForm] = useState({ pay_group_id: "", fy_id: "", month: String(month), year: String(year), notes: "" });

  const load = useCallback(async () => {
    const [fyRows, templateRows, branchRows, departmentRows, employmentTypeRows, employeeRows, lockRows, ruleRows, importRows, sheetRows, reconcileRows, payGroupRows, payRunRows] = await Promise.all([
      apiRequest<FY[]>(`${basePath}/financial-years`).catch(() => []),
      apiRequest<Template[]>(`${basePath}/salary-templates`).catch(() => []),
      apiRequest<Branch[]>(`${basePath}/branches`).catch(() => []),
      apiRequest<Department[]>(`${basePath}/departments`).catch(() => []),
      apiRequest<EmploymentType[]>(`${basePath}/employment-types`).catch(() => []),
      apiRequest<Employee[]>(`${basePath}/employees`).catch(() => []),
      apiRequest<PayrollLock[]>(`${basePath}/payroll-locks`).catch(() => []),
      apiRequest<StatRule[]>(`${basePath}/payroll-statutory-rules`).catch(() => []),
      apiRequest<ImportBatch[]>(`${basePath}/payroll-imports?limit=20`).catch(() => []),
      apiRequest<SheetRow[]>(`${basePath}/consolidated-salary-sheet?month=${month}&year=${year}`).catch(() => []),
      apiRequest<ReconcileRow[]>(`${basePath}/payroll-reconciliation?month=${month}&year=${year}`).catch(() => []),
      apiRequest<PayGroup[]>(`${basePath}/pay-groups`).catch(() => []),
      apiRequest<PayRun[]>(`${basePath}/pay-runs?month=${month}&year=${year}`).catch(() => []),
    ]);
    setFys(fyRows); setTemplates(templateRows); setBranches(branchRows); setDepartments(departmentRows); setEmploymentTypes(employmentTypeRows); setEmployees(employeeRows); setLocks(lockRows); setRules(ruleRows); setImports(importRows); setSheet(sheetRows); setReconcile(reconcileRows); setPayGroups(payGroupRows); setPayRuns(payRunRows);
    setSelectedPayRunID((current) => current || payRunRows[0]?.id || "");
    setImportForm((current) => ({ ...current, fy_id: current.fy_id || fyRows.find((item) => item.is_active)?.id || fyRows[0]?.id || "", template_id: current.template_id || templateRows.find((item) => item.is_active)?.id || templateRows[0]?.id || "" }));
    setPayRunForm((current) => ({ ...current, pay_group_id: current.pay_group_id || payGroupRows[0]?.id || "", fy_id: current.fy_id || fyRows.find((item) => item.is_active)?.id || fyRows[0]?.id || "", month: String(month), year: String(year) }));
    setMemberForm((current) => ({ ...current, pay_group_id: current.pay_group_id || payGroupRows[0]?.id || "" }));
  }, [basePath, month, year]);

  useEffect(() => { const timer = window.setTimeout(() => { void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load payroll operations.")); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const loadCommandCenter = useCallback(async (id: string) => {
    if (!id) { setCommandCenter(null); return; }
    setCommandCenter(await apiRequest<PayRunCommandCenter>(`${basePath}/pay-runs/${id}/command-center`));
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCommandCenter(selectedPayRunID).catch(() => setCommandCenter(null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCommandCenter, selectedPayRunID]);

  async function setLock(status: string) {
    setError(""); setNotice("");
    try {
      await apiRequest(`${basePath}/payroll-locks`, { method: "PUT", body: { month, year, status, notes: `${status} from payroll operations console`, unlock_reason: status === "unlocked" ? "Payroll correction required" : null } });
      setNotice(`Payroll period ${status}.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update lock."); }
  }

  async function saveRule() {
    setError(""); setNotice("");
    try {
      await apiRequest(`${basePath}/payroll-statutory-rules`, { method: "POST", body: { ...ruleForm, branch_id: ruleForm.branch_id || null, state: ruleForm.state || null, effective_to: ruleForm.effective_to || "", min_gross_salary: ruleForm.min_gross_salary ? Number(ruleForm.min_gross_salary) : null, max_gross_salary: ruleForm.max_gross_salary ? Number(ruleForm.max_gross_salary) : null, employee_amount: Number(ruleForm.employee_amount || 0), employer_amount: Number(ruleForm.employer_amount || 0), deduction_month: ruleForm.deduction_month ? Number(ruleForm.deduction_month) : null, notes: ruleForm.notes || null } });
      setNotice("Statutory rule saved.");
      setRuleForm({ ...ruleForm, name: "", employee_amount: "0", employer_amount: "0", notes: "" });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save statutory rule."); }
  }

  async function importPayroll() {
    setError(""); setNotice("");
    try {
      const rows = parseImportCSV(csvText);
      const batch = await apiRequest<ImportBatch>(`${basePath}/payroll-imports`, { method: "POST", body: { import_type: "salary_revision", month, year, fy_id: importForm.fy_id || null, template_id: importForm.template_id || null, file_name: importForm.file_name || "payroll-import.csv", apply: importForm.apply, rows } });
      setSelectedImport(batch);
      setNotice(`Import ${batch.status}: ${batch.applied_rows} applied, ${batch.invalid_rows} invalid.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to import payroll data."); }
  }

  async function openImport(id: string) {
    setSelectedImport(await apiRequest<ImportBatch>(`${basePath}/payroll-imports/${id}`));
  }

  async function exportSheet(format: "csv" | "pdf" | "xlsx" = "csv") {
    const { blob, filename } = await apiDownload(`${basePath}/consolidated-salary-sheet/export?month=${month}&year=${year}&format=${format}`);
    saveBlobDownload(blob, filename);
  }

  async function exportReconciliation(format: "pdf" | "xlsx") {
    const { blob, filename } = await apiDownload(`${basePath}/reports/code/payroll.reconciliation/download?month=${month}&year=${year}&format=${format}`);
    saveBlobDownload(blob, filename);
  }

  async function savePayGroup() {
    setError(""); setNotice("");
    try {
      await apiRequest<PayGroup>(`${basePath}/pay-groups`, { method: "POST", body: { code: payGroupForm.code, name: payGroupForm.name, description: payGroupForm.description || null, grouping_type: payGroupForm.grouping_type, branch_id: payGroupForm.branch_id || null, department_id: payGroupForm.department_id || null, employment_type_id: payGroupForm.employment_type_id || null, reporting_tag: payGroupForm.reporting_tag || null, rules: {}, is_active: payGroupForm.is_active } });
      setNotice("Pay group saved.");
      setPayModal("");
      setPayGroupForm({ code: "", name: "", description: "", grouping_type: "all", branch_id: "", department_id: "", employment_type_id: "", reporting_tag: "", is_active: true });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save pay group."); }
  }

  async function savePayGroupMember() {
    setError(""); setNotice("");
    try {
      await apiRequest<PayGroupMember>(`${basePath}/pay-groups/${memberForm.pay_group_id}/members`, { method: "POST", body: { user_id: memberForm.user_id, membership_type: memberForm.membership_type, effective_from: memberForm.effective_from, effective_to: memberForm.effective_to } });
      setNotice("Pay group override saved.");
      setPayModal("");
      await load();
      if (memberForm.pay_group_id) await previewPayGroup(memberForm.pay_group_id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save pay group override."); }
  }

  async function createPayRun() {
    setError(""); setNotice("");
    try {
      const result = await apiRequest<PayRun>(`${basePath}/pay-runs`, { method: "POST", body: { pay_group_id: payRunForm.pay_group_id, fy_id: payRunForm.fy_id, month: Number(payRunForm.month), year: Number(payRunForm.year), notes: payRunForm.notes || null } });
      setNotice("Pay run created and readiness checked.");
      setSelectedPayRunID(result.id);
      setPayModal("");
      await load();
      await loadCommandCenter(result.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create pay run."); }
  }

  async function previewPayGroup(id: string) {
    setSelectedPayGroupID(id);
    if (!id) { setPayGroupPreview([]); return; }
    setPayGroupPreview(await apiRequest<PayGroupEmployee[]>(`${basePath}/pay-groups/${id}/employees`).catch(() => []));
  }

  async function payRunAction(id: string, action: "assess" | "freeze" | "generate" | "lock" | "unlock") {
    setError(""); setNotice("");
    try {
      await apiRequest<PayRun>(`${basePath}/pay-runs/${id}/${action}`, { method: "POST", body: action === "generate" ? { regenerate: false } : {} });
      setNotice(`Pay run ${action} complete.`);
      setSelectedPayRunID(id);
      await load();
      await loadCommandCenter(id);
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action} pay run.`); }
  }

  const currentLock = locks.find((item) => item.month === month && item.year === year);
  const sheetNet = sheet.reduce((sum, row) => sum + row.net_salary, 0);
  const exceptions = reconcile.filter((row) => row.reconciliation_status !== "ok").length;
  const selectedPayGroup = payGroups.find((item) => item.id === selectedPayGroupID) || payGroups[0];

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Payroll Operations` : "Payroll Operations"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Control payroll inputs, PT/LWF rules, LOP reconciliation, salary sheet exports, and period locks.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4"><Metric label="Payslips" value={sheet.length} /><Metric label="Net Payroll" value={money(sheetNet)} /><Metric label="Exceptions" value={exceptions} /><Metric label="Lock Status" value={currentLock?.status || "open"} /></section>
      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 md:grid-cols-[120px_140px_1fr_auto_auto_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" max={12} min={1} onChange={(e) => setMonth(Number(e.target.value))} type="number" value={month} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setYear(Number(e.target.value))} type="number" value={year} /><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void load()} type="button">Refresh</button><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void exportSheet()} type="button">Export CSV</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => void setLock("locked")} type="button">Lock</button><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void setLock("unlocked")} type="button">Unlock</button></div></section>
      <Panel title="Pay Groups & Phased Runs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setPayModal("group")} type="button">New Pay Group</button><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setPayModal("member")} type="button">Add Override</button><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setPayModal("run")} type="button">New Pay Run</button></div>
          <InfoButton label="Pay groups support staged payroll under one monthly schedule by branch, department, employment type, reporting tag, all employees, or manual overrides." />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="overflow-hidden rounded-xl border border-[#edf1ef]">
            <div className="grid grid-cols-[1fr_96px_100px] bg-[#f8faf9] px-4 py-3 text-xs font-black uppercase text-[#6b7280]"><span>Group</span><span>Employees</span><span>Status</span></div>
            <div className="divide-y divide-[#edf1ef]">{payGroups.length === 0 ? <p className="px-4 py-5 text-sm font-semibold text-[#6b7280]">No pay groups configured.</p> : payGroups.map((group) => <button className={`grid w-full grid-cols-[1fr_96px_100px] px-4 py-3 text-left hover:bg-[#f8faf9] ${selectedPayGroup?.id === group.id ? "bg-[#f8faf9]" : ""}`} key={group.id} onClick={() => void previewPayGroup(group.id)} type="button"><span><strong className="block text-sm text-[#111827]">{group.name}</strong><span className="text-xs font-bold text-[#6b7280]">{group.code} - {group.grouping_type}</span></span><span className="text-sm font-black text-[#111827]">{group.employee_count || 0}</span><span className={`self-start rounded-full px-3 py-1 text-xs font-black ${group.is_active ? "bg-[#e7f6ed] text-[#237a45]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>{group.is_active ? "active" : "inactive"}</span></button>)}</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#edf1ef]">
            <div className="flex items-center justify-between bg-[#f8faf9] px-4 py-3"><strong className="text-sm text-[#111827]">{selectedPayGroup ? `${selectedPayGroup.name} employees` : "Employee preview"}</strong><span className="text-xs font-black text-[#6b7280]">{payGroupPreview.length || selectedPayGroup?.employee_count || 0} shown</span></div>
            <div className="max-h-64 overflow-auto divide-y divide-[#edf1ef]">{payGroupPreview.length === 0 ? <p className="px-4 py-5 text-sm font-semibold text-[#6b7280]">Select a group to preview matching employees.</p> : payGroupPreview.map((employee) => <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3" key={employee.user_id}><span><strong className="block text-sm text-[#111827]">{name(employee.firstname, employee.lastname)}</strong><span className="text-xs font-bold text-[#6b7280]">{employee.employee_code || "-"} - {employee.branch_name || "-"} - {employee.department_name || "-"}</span></span><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{employee.match_source}</span></div>)}</div>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#edf1ef]">
          <table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#f8faf9] text-xs font-black uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Pay Run</th><th>Group</th><th>Status</th><th>Ready</th><th>Blocked</th><th>Generated</th><th className="text-right pr-4">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{payRuns.length === 0 ? <tr><td className="px-4 py-5 text-sm font-semibold text-[#6b7280]" colSpan={7}>No pay runs for this period.</td></tr> : payRuns.map((run) => <tr className={selectedPayRunID === run.id ? "bg-[#f8faf9]" : ""} key={run.id}><td className="px-4 py-3"><strong>{run.month}/{run.year}</strong><p className="text-xs font-bold text-[#6b7280]">{run.employee_count} employees</p></td><td>{payGroups.find((group) => group.id === run.pay_group_id)?.name || "-"}</td><td><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(run.status)}`}>{run.status}</span></td><td>{run.ready_count}</td><td>{run.blocked_count}</td><td>{run.generated_count}</td><td className="pr-4 text-right"><div className="flex flex-wrap justify-end gap-2"><RunAction label="Review" onClick={() => setSelectedPayRunID(run.id)} /><RunAction label="Assess" onClick={() => void payRunAction(run.id, "assess")} /><RunAction label="Freeze" onClick={() => void payRunAction(run.id, "freeze")} /><RunAction label="Generate" onClick={() => void payRunAction(run.id, "generate")} /><RunAction label={run.status === "locked" ? "Unlock" : "Lock"} onClick={() => void payRunAction(run.id, run.status === "locked" ? "unlock" : "lock")} /></div></td></tr>)}</tbody></table>
        </div>
      </Panel>
      <PayrollCommandCenterPanel center={commandCenter} onAction={(id, action) => void payRunAction(id, action)} payGroups={payGroups} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Panel title="Consolidated Salary Sheet"><div className="mb-3 flex flex-wrap gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => void exportSheet("csv")} type="button">CSV</button><button className="rounded-lg border border-[#588368] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => void exportSheet("pdf")} type="button">PDF</button><button className="rounded-lg border border-[#2f6f7d] px-3 py-2 text-xs font-black text-[#2f6f7d]" onClick={() => void exportSheet("xlsx")} type="button">Excel</button></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#f8faf9] text-xs font-black uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Employee</th><th>Branch</th><th>Gross</th><th>Earnings</th><th>Deductions</th><th>LOP</th><th>Net</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{sheet.map((row) => <tr key={row.salary_slip_id}><td className="px-4 py-3"><strong>{name(row.firstname, row.lastname)}</strong><p className="text-xs font-bold text-[#6b7280]">{row.employee_code || "-"}</p></td><td>{row.branch_name || "-"}</td><td>{money(row.gross_salary)}</td><td>{money(row.total_earnings)}</td><td>{money(row.total_deductions)}</td><td>{row.lwp_days}</td><td className="font-black">{money(row.net_salary)}</td></tr>)}</tbody></table></div></Panel>
          <Panel title="Attendance / LOP Reconciliation"><div className="mb-3 flex flex-wrap gap-2"><button className="rounded-lg border border-[#588368] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => void exportReconciliation("pdf")} type="button">PDF</button><button className="rounded-lg border border-[#2f6f7d] px-3 py-2 text-xs font-black text-[#2f6f7d]" onClick={() => void exportReconciliation("xlsx")} type="button">Excel</button></div><div className="grid gap-3 md:grid-cols-2">{reconcile.map((row) => <div className="rounded-xl border border-[#edf1ef] p-4" key={row.employee_id}><div className="flex items-start justify-between gap-3"><div><strong>{name(row.firstname, row.lastname)}</strong><p className="text-xs font-bold text-[#6b7280]">{row.employee_code || "-"} - {row.department_name || "-"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(row.reconciliation_status)}`}>{row.reconciliation_status}</span></div><p className="mt-3 text-xs font-bold text-[#6b7280]">Present {row.present_days ?? "-"} · Absent {row.absent_days ?? "-"} · LWP {row.lwp_days ?? "-"}</p></div>)}</div></Panel>
          <Panel title="Payroll Imports"><div className="space-y-3">{imports.map((item) => <button className="w-full rounded-xl border border-[#edf1ef] p-4 text-left hover:border-[#588368]" key={item.id} onClick={() => void openImport(item.id)} type="button"><div className="flex items-center justify-between"><strong>{dateOnly(item.created_at)} import</strong><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.status)}`}>{item.status}</span></div><p className="mt-1 text-xs font-bold text-[#6b7280]">{item.total_rows} rows · {item.applied_rows} applied · {item.invalid_rows} invalid</p></button>)}</div>{selectedImport ? <div className="mt-5 rounded-xl bg-[#f8faf9] p-4"><h3 className="font-black text-[#111827]">Import rows</h3><div className="mt-3 max-h-72 overflow-auto divide-y divide-[#edf1ef]">{(selectedImport.rows || []).map((row) => <div className="py-2 text-xs" key={row.id}><strong>{row.row_number}. {row.employee_code || "-"}</strong> <span className={`ml-2 rounded-full px-2 py-0.5 font-black ${badge(row.status)}`}>{row.status}</span>{row.error_message ? <p className="mt-1 font-bold text-[#b91c1c]">{row.error_message}</p> : null}</div>)}</div></div> : null}</Panel>
        </div>
        <aside className="space-y-4">
          <Panel title="Bulk Import"><div className="grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setImportForm({ ...importForm, fy_id: e.target.value })} value={importForm.fy_id}><option value="">Financial year</option>{fys.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setImportForm({ ...importForm, template_id: e.target.value })} value={importForm.template_id}><option value="">Salary template</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><textarea className="min-h-44 rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs" onChange={(e) => setCsvText(e.target.value)} value={csvText} /><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={importForm.apply} onChange={(e) => setImportForm({ ...importForm, apply: e.target.checked })} type="checkbox" /> Apply valid salary rows</label><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => void importPayroll()} type="button">Validate & Import</button></div></Panel>
          <Panel title="PT / LWF Rule"><div className="grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })} value={ruleForm.rule_type}><option value="pt">Professional Tax</option><option value="lwf">Labour Welfare Fund</option></select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Rule name" value={ruleForm.name} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, state: e.target.value })} placeholder="State" value={ruleForm.state} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, branch_id: e.target.value })} value={ruleForm.branch_id}><option value="">All branches</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.branch_name || item.name}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, employee_amount: e.target.value })} placeholder="Employee amount" type="number" value={ruleForm.employee_amount} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, employer_amount: e.target.value })} placeholder="Employer amount" type="number" value={ruleForm.employer_amount} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, effective_from: e.target.value })} type="date" value={ruleForm.effective_from} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm" onChange={(e) => setRuleForm({ ...ruleForm, deduction_month: e.target.value })} placeholder="Deduction month" type="number" value={ruleForm.deduction_month} /></div><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => void saveRule()} type="button">Save Rule</button></div><div className="mt-5 space-y-2">{rules.slice(0, 8).map((item) => <div className="rounded-xl bg-[#f8faf9] p-3" key={item.id}><strong className="text-sm">{item.name}</strong><p className="text-xs font-bold text-[#6b7280]">{item.rule_type.toUpperCase()} · {item.state || "all states"} · {money(item.employee_amount)}</p></div>)}</div></Panel>
        </aside>
      </section>
      <HrmsModal onClose={() => setPayModal("")} open={payModal === "group"} title="New Pay Group">
        <div className="grid gap-4">
          <FormHeader title="Group Rules" info="Use one primary grouping rule for predictable payroll ownership. Manual overrides can include or exclude exceptions without changing employee masters." />
          <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-black text-[#374151]">Code<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, code: e.target.value })} value={payGroupForm.code} /></label><label className="text-sm font-black text-[#374151]">Name<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, name: e.target.value })} value={payGroupForm.name} /></label></div>
          <label className="text-sm font-black text-[#374151]">Grouping<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, grouping_type: e.target.value })} value={payGroupForm.grouping_type}><option value="all">All active employees</option><option value="branch">Branch / work location</option><option value="department">Department</option><option value="employment_type">Employment type</option><option value="reporting_tag">Reporting tag</option><option value="manual">Manual only</option><option value="mixed">Mixed selectors</option></select></label>
          <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-black text-[#374151]">Branch<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, branch_id: e.target.value })} value={payGroupForm.branch_id}><option value="">Any branch</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.branch_name || item.name}</option>)}</select></label><label className="text-sm font-black text-[#374151]">Department<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, department_id: e.target.value })} value={payGroupForm.department_id}><option value="">Any department</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-black text-[#374151]">Employment Type<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, employment_type_id: e.target.value })} value={payGroupForm.employment_type_id}><option value="">Any type</option>{employmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]"><label className="text-sm font-black text-[#374151]">Reporting Tag<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, reporting_tag: e.target.value })} value={payGroupForm.reporting_tag} /></label><label className="flex items-center gap-2 pt-7 text-sm font-black text-[#374151]"><input checked={payGroupForm.is_active} onChange={(e) => setPayGroupForm({ ...payGroupForm, is_active: e.target.checked })} type="checkbox" /> Active</label></div>
          <label className="text-sm font-black text-[#374151]">Description<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 font-normal" onChange={(e) => setPayGroupForm({ ...payGroupForm, description: e.target.value })} value={payGroupForm.description} /></label>
          <ModalActions onCancel={() => setPayModal("")} onSubmit={() => void savePayGroup()} submit="Save Group" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={() => setPayModal("")} open={payModal === "member"} title="Pay Group Override">
        <div className="grid gap-4">
          <FormHeader title="Manual Membership" info="Use include for exceptions that must be processed in this group, and exclude when a rule matches an employee who should be processed elsewhere." />
          <label className="text-sm font-black text-[#374151]">Pay Group<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setMemberForm({ ...memberForm, pay_group_id: e.target.value })} value={memberForm.pay_group_id}><option value="">Select group</option>{payGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-black text-[#374151]">Employee<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })} value={memberForm.user_id}><option value="">Select employee</option>{employees.map((employee) => <option key={employee.user_id} value={employee.user_id}>{name(employee.firstname, employee.lastname)}{employee.employee_code ? ` (${employee.employee_code})` : ""}</option>)}</select></label>
          <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-black text-[#374151]">Override<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setMemberForm({ ...memberForm, membership_type: e.target.value })} value={memberForm.membership_type}><option value="manual_include">Include</option><option value="manual_exclude">Exclude</option></select></label><label className="text-sm font-black text-[#374151]">From<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setMemberForm({ ...memberForm, effective_from: e.target.value })} type="date" value={memberForm.effective_from} /></label><label className="text-sm font-black text-[#374151]">To<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setMemberForm({ ...memberForm, effective_to: e.target.value })} type="date" value={memberForm.effective_to} /></label></div>
          <ModalActions onCancel={() => setPayModal("")} onSubmit={() => void savePayGroupMember()} submit="Save Override" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={() => setPayModal("")} open={payModal === "run"} title="New Pay Run">
        <div className="grid gap-4">
          <FormHeader title="Phased Payroll" info="Each pay run belongs to one pay group and month. Readiness checks salary assignment, existing payslips, and payroll reconciliation before generation." />
          <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-black text-[#374151]">Pay Group<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayRunForm({ ...payRunForm, pay_group_id: e.target.value })} value={payRunForm.pay_group_id}><option value="">Select group</option>{payGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-black text-[#374151]">Financial Year<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayRunForm({ ...payRunForm, fy_id: e.target.value })} value={payRunForm.fy_id}><option value="">Select financial year</option>{fys.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
          <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-black text-[#374151]">Month<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" max={12} min={1} onChange={(e) => setPayRunForm({ ...payRunForm, month: e.target.value })} type="number" value={payRunForm.month} /></label><label className="text-sm font-black text-[#374151]">Year<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal" onChange={(e) => setPayRunForm({ ...payRunForm, year: e.target.value })} type="number" value={payRunForm.year} /></label></div>
          <label className="text-sm font-black text-[#374151]">Notes<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 font-normal" onChange={(e) => setPayRunForm({ ...payRunForm, notes: e.target.value })} value={payRunForm.notes} /></label>
          <ModalActions onCancel={() => setPayModal("")} onSubmit={() => void createPayRun()} submit="Create Run" />
        </div>
      </HrmsModal>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-3 block text-3xl text-[#111827]">{value}</strong></div>;
}

function PayrollCommandCenterPanel({ center, payGroups, onAction }: { center: PayRunCommandCenter | null; payGroups: PayGroup[]; onAction: (id: string, action: "assess" | "freeze" | "generate" | "lock" | "unlock") => void }) {
  if (!center?.run) {
    return <Panel title="Payroll Command Center"><div className="rounded-xl border border-dashed border-[#dbe0e5] px-4 py-8 text-center text-sm font-semibold text-[#6b7280]">Create or select a pay run to review payroll readiness and draft ledger.</div></Panel>;
  }
  const run = center.run;
  const summary = center.summary;
  const components = center.components || [];
  const inputs = center.inputs || [];
  const employees = run.employees || [];
  return (
    <Panel title="Payroll Command Center">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-[#111827]">{payGroups.find((group) => group.id === run.pay_group_id)?.name || "Selected pay run"}</h3><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(run.status)}`}>{run.status}</span></div><p className="mt-1 text-xs font-bold text-[#6b7280]">{run.month}/{run.year} · {run.employee_count} employees · {summary?.component_count || 0} ledger rows</p></div>
        <div className="flex flex-wrap gap-2"><RunAction label="Assess" onClick={() => onAction(run.id, "assess")} /><RunAction label="Freeze" onClick={() => onAction(run.id, "freeze")} /><RunAction label="Generate" onClick={() => onAction(run.id, "generate")} /><RunAction label={run.status === "locked" ? "Unlock" : "Lock"} onClick={() => onAction(run.id, run.status === "locked" ? "unlock" : "lock")} /></div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5"><MiniMetric label="Draft Employees" value={summary?.draft_employee_count ?? 0} /><MiniMetric label="Gross" value={money(summary?.gross_amount)} /><MiniMetric label="Deductions" value={money(summary?.total_deductions)} /><MiniMetric label="Net" value={money(summary?.net_amount)} /><MiniMetric label="Blocked" value={run.blocked_count} /></div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="overflow-hidden rounded-xl border border-[#edf1ef]">
          <div className="bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#111827]">Employee Readiness</div>
          <div className="max-h-80 overflow-auto divide-y divide-[#edf1ef]">{employees.length === 0 ? <Empty text="Assess the run to populate employee readiness." /> : employees.map((employee) => <div className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto_auto] md:items-center" key={employee.id}><div><strong className="text-sm text-[#111827]">{name(employee.firstname || "", employee.lastname)}</strong><p className="text-xs font-bold text-[#6b7280]">{employee.employee_code || "-"} · {employee.department_name || "-"}</p>{employee.blocker_reason ? <p className="mt-1 text-xs font-bold text-[#b91c1c]">{employee.blocker_reason}</p> : null}</div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${badge(employee.readiness_status)}`}>{employee.readiness_status}</span><strong className="text-sm text-[#111827]">{money(employee.net_amount)}</strong></div>)}</div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#edf1ef]">
          <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#f8faf9] text-xs font-black uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Employee</th><th>Component</th><th>Type</th><th>Amount</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{components.length === 0 ? <tr><td className="px-4 py-5 text-sm font-semibold text-[#6b7280]" colSpan={4}>No draft ledger yet.</td></tr> : components.slice(0, 80).map((item) => <tr key={item.id}><td className="px-4 py-3"><strong>{name(item.firstname || "", item.lastname)}</strong><p className="text-xs font-bold text-[#6b7280]">{item.employee_code || "-"}</p></td><td>{item.name}<p className="text-xs font-bold text-[#6b7280]">{item.code}{item.statutory ? " · statutory" : ""}</p></td><td>{item.component_type}</td><td className="font-black">{money(item.amount)}</td></tr>)}</tbody></table>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{inputs.slice(0, 9).map((item) => <div className="rounded-xl border border-[#edf1ef] p-4" key={item.id}><div className="flex items-start justify-between gap-3"><strong className="text-sm text-[#111827]">{item.description}</strong><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{item.input_type}</span></div><p className="mt-2 text-xs font-bold text-[#6b7280]">{name(item.firstname || "", item.lastname)} · {item.employee_code || "-"}</p><p className="mt-2 text-sm font-black text-[#111827]">{item.amount == null ? "-" : money(item.amount)}</p></div>)}</div>
    </Panel>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3"><p className="text-[11px] font-black uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-1 block text-lg text-[#111827]">{value}</strong></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-5 text-sm font-semibold text-[#6b7280]">{text}</div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">{title}</h2><div className="mt-5">{children}</div></section>;
}

function InfoButton({ label }: { label: string }) {
  return <button aria-label={label} className="h-9 w-9 rounded-full border border-[#dbe0e5] text-sm font-black text-[#588368] hover:bg-[#f8faf9]" title={label} type="button">i</button>;
}

function RunAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] hover:border-[#588368]" onClick={onClick} type="button">{label}</button>;
}

function FormHeader({ title, info }: { title: string; info: string }) {
  return <div className="flex items-center justify-between gap-3"><h3 className="text-base font-black text-[#111827]">{title}</h3><InfoButton label={info} /></div>;
}

function ModalActions({ onCancel, onSubmit, submit }: { onCancel: () => void; onSubmit: () => void; submit: string }) {
  return <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-4"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">{submit}</button></div>;
}

function parseImportCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = values[index] || ""; });
    return { employee_code: row.employee_code || row.code || "", gross_salary: row.gross_salary ? Number(row.gross_salary) : null, present_days: row.present_days ? Number(row.present_days) : null, absent_days: row.absent_days ? Number(row.absent_days) : null, lop_days: row.lop_days ? Number(row.lop_days) : null, raw_data: row };
  });
}

function parseCSVLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { values.push(current.trim()); current = ""; continue; }
    current += char;
  }
  values.push(current.trim());
  return values;
}
