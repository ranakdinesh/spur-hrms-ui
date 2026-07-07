"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type FinancialYear = { id: string; name: string; is_active: boolean; payroll_year: boolean };
type EmployeeRow = { id: string; user_id: string; employee_code?: string | null; firstname: string; middle_name?: string | null; lastname?: string | null; email?: string | null; department_name?: string | null; designation_name?: string | null; branch_name?: string | null; inactive: boolean };
type SalaryTemplate = { id: string; fy_id: string; code: string; name: string; template_type: string; currency_code: string; is_active: boolean; items?: SalaryTemplateItem[] };
type SalaryTemplateItem = { id: string; item_type: string; code: string; name: string; percentage?: number | null; amount?: number | null; calculation_mode: string; calculation_base: string; cap_amount?: number | null; min_amount?: number | null; max_amount?: number | null; sort_order: number };
type EmployeeSalary = { id: string; user_id: string; fy_id: string; template_id: string; gross_salary: number; effective_from?: string | null; created_at: string; structures?: EmployeeSalaryStructure[]; template?: SalaryTemplate | null };
type EmployeeSalaryStructure = { id?: string; item_type: string; code: string; name: string; amount: number; sort_order: number };
type SalaryCalculation = { salary_id: string; month: number; year: number; present_days: number; absent_days: number; total_days: number; lwp_days: number; is_special: boolean; gross_salary: number; salary_result: { total_earnings: number; total_deductions: number; absent_deduction: number; net_salary: number; items: EmployeeSalaryStructure[] } };

type SalaryForm = { employeeUserID: string; fyID: string; templateID: string; grossSalary: string; effectiveFrom: string };
type CalculationForm = { month: string; year: string; presentDays: string; absentDays: string; totalDays: string; isSpecial: boolean };

const emptyForm: SalaryForm = { employeeUserID: "", fyID: "", templateID: "", grossSalary: "", effectiveFrom: "" };
const now = new Date();
const emptyCalculationForm: CalculationForm = { month: String(now.getMonth() + 1), year: String(now.getFullYear()), presentDays: "", absentDays: "", totalDays: "", isSpecial: false };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeName(employee: EmployeeRow) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ");
}

function money(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { currency, maximumFractionDigits: 2, style: "currency" }).format(value || 0);
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function optionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value.trim() !== "" ? parsed : undefined;
}

function calculatePreview(items: SalaryTemplateItem[], grossSalary: number): EmployeeSalaryStructure[] {
  const amounts: Record<string, number> = { ctc: grossSalary, gross: grossSalary };
  return items
    .filter((item) => item.item_type === "earning" || item.item_type === "deduction")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => {
      let amount = 0;
      if (item.calculation_mode === "fixed" || item.calculation_mode === "manual") amount = item.amount || 0;
      if (item.calculation_mode === "percentage") amount = (amounts[item.calculation_base] ?? grossSalary) * ((item.percentage || 0) / 100);
      if (item.cap_amount != null && amount > item.cap_amount) amount = item.cap_amount;
      if (item.min_amount != null && amount < item.min_amount) amount = item.min_amount;
      if (item.max_amount != null && amount > item.max_amount) amount = item.max_amount;
      const rounded = Math.round(Math.max(0, amount) * 100) / 100;
      amounts[item.code] = rounded;
      if (item.code === "basic") amounts.basic = rounded;
      return { item_type: item.item_type, code: item.code, name: item.name, amount: rounded, sort_order: item.sort_order };
    });
}

export function EmployeeSalarySection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants.filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query))).sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b)));
  }, [tenantSearch, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll / Employee Salary</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Employee Salary</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to assign salary templates and persist employee salary structures.</p></div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Salaries</button></td></tr>)}</tbody></table></div></section>
      </div>
    );
  }

  return <EmployeeSalaryWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function EmployeeSalaryWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [form, setForm] = useState<SalaryForm>(emptyForm);
  const [calculationForm, setCalculationForm] = useState<CalculationForm>(emptyCalculationForm);
  const [calculation, setCalculation] = useState<SalaryCalculation | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const selectedEmployee = employees.find((employee) => employee.user_id === form.employeeUserID) || null;
  const selectedTemplate = templates.find((template) => template.id === form.templateID) || null;
  const currentSalary = salaries.find((salary) => salary.fy_id === form.fyID) || null;
  const grossSalary = Number(form.grossSalary) || 0;
  const preview = selectedTemplate ? calculatePreview(selectedTemplate.items || [], grossSalary) : [];
  const totalEarnings = preview.filter((item) => item.item_type === "earning").reduce((total, item) => total + item.amount, 0);
  const totalDeductions = preview.filter((item) => item.item_type === "deduction").reduce((total, item) => total + item.amount, 0);

  const loadFoundation = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [employeeRows, fys] = await Promise.all([apiRequest<EmployeeRow[]>(`${basePath}/employees`), apiRequest<FinancialYear[]>(`${basePath}/financial-years`)]);
      setEmployees(employeeRows.filter((employee) => !employee.inactive));
      setFinancialYears(fys);
      const activeFY = form.fyID || fys.find((fy) => fy.is_active && fy.payroll_year)?.id || fys[0]?.id || "";
      setForm((current) => ({ ...current, fyID: current.fyID || activeFY }));
      if (activeFY) setTemplates(await apiRequest<SalaryTemplate[]>(`${basePath}/salary-templates?fy_id=${activeFY}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load salary setup.");
    } finally {
      setLoading(false);
    }
  }, [basePath, form.fyID]);

  const loadSalaries = useCallback(async (userID: string) => {
    if (!userID) { setSalaries([]); return; }
    try { setSalaries(await apiRequest<EmployeeSalary[]>(`${basePath}/employee-salaries?user_id=${userID}`)); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load employee salaries."); }
  }, [basePath]);

  useEffect(() => { const timer = window.setTimeout(loadFoundation, 0); return () => window.clearTimeout(timer); }, [loadFoundation]);
  useEffect(() => { const timer = window.setTimeout(() => void loadSalaries(form.employeeUserID), 0); return () => window.clearTimeout(timer); }, [form.employeeUserID, loadSalaries]);

  async function changeFY(fyID: string) {
    setForm((current) => ({ ...current, fyID, templateID: "" }));
    setTemplates(await apiRequest<SalaryTemplate[]>(`${basePath}/salary-templates?fy_id=${fyID}`));
  }

  async function submitSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const payload = { user_id: form.employeeUserID, fy_id: form.fyID, template_id: form.templateID, gross_salary: grossSalary, effective_from: form.effectiveFrom || null };
      await apiRequest<EmployeeSalary>(`${basePath}/employee-salaries`, { method: "POST", body: payload });
      setCalculation(null); setMessage("Employee salary structure saved."); await loadSalaries(form.employeeUserID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save employee salary.");
    }
  }

  async function calculateSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const payload = {
        user_id: form.employeeUserID,
        fy_id: form.fyID,
        salary_id: currentSalary?.id,
        month: Number(calculationForm.month),
        year: Number(calculationForm.year),
        present_days: optionalNumber(calculationForm.presentDays),
        absent_days: optionalNumber(calculationForm.absentDays),
        total_days: optionalNumber(calculationForm.totalDays),
        is_special: calculationForm.isSpecial,
      };
      setCalculation(await apiRequest<SalaryCalculation>(`${basePath}/employee-salaries/calculate`, { method: "POST", body: payload }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to calculate salary.");
    }
  }

  async function deleteSalary(item: EmployeeSalary) {
    if (!window.confirm("Delete this salary assignment?")) return;
    setError(""); setMessage("");
    try { await apiRequest(`${basePath}/employee-salaries/${item.id}`, { method: "DELETE" }); setMessage("Employee salary assignment deleted."); await loadSalaries(form.employeeUserID); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete salary assignment."); }
  }

  const filteredEmployees = useMemo(() => {
    const query = employeeQuery.trim().toLowerCase();
    return employees.filter((employee) => !query || [employeeName(employee), employee.employee_code || "", employee.email || "", employee.department_name || "", employee.designation_name || ""].some((value) => value.toLowerCase().includes(query)));
  }, [employeeQuery, employees]);

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll / Employee Salary</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Employee Salary` : "Employee Salary"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Assign a salary template and gross salary, then persist the calculated employee salary structure for payroll.</p></div>
        <div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}<button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void loadFoundation()} type="button">Refresh</button></div>
      </div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}{message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Employees</h2><input className="mt-4 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="Search employee" value={employeeQuery} /></div>
          <div className="max-h-[620px] overflow-y-auto divide-y divide-[#edf1ef]">{loading ? <p className="p-5 text-sm font-semibold text-[#6b7280]">Loading employees...</p> : filteredEmployees.map((employee) => <button className={`block w-full px-5 py-4 text-left hover:bg-[#f8faf9] ${form.employeeUserID === employee.user_id ? "bg-[#f8faf9]" : ""}`} key={employee.user_id} onClick={() => setForm((current) => ({ ...current, employeeUserID: employee.user_id }))} type="button"><strong className="block text-sm text-[#111827]">{employeeName(employee)}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{employee.employee_code || "No code"} - {employee.department_name || "No department"}</span><span className="mt-1 block text-xs text-[#6b7280]">{employee.designation_name || employee.email || ""}</span></button>)}</div>
        </section>
        <main className="space-y-6">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <form className="grid gap-4 lg:grid-cols-5" onSubmit={submitSalary}>
              <label className="block text-sm font-bold text-[#374151]">Financial Year<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => void changeFY(event.target.value)} value={form.fyID}>{financialYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}{fy.is_active ? " (Active)" : ""}</option>)}</select></label>
              <label className="block text-sm font-bold text-[#374151]">Template<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, templateID: event.target.value })} required value={form.templateID}><option value="">Select template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.is_active ? " (Active)" : ""}</option>)}</select></label>
              <label className="block text-sm font-bold text-[#374151]">Gross Salary<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm({ ...form, grossSalary: event.target.value })} required type="number" value={form.grossSalary} /></label>
              <label className="block text-sm font-bold text-[#374151]">Effective From<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} type="date" value={form.effectiveFrom} /></label>
              <button className="mt-7 h-11 rounded-xl bg-[#588368] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#a8b7ae]" disabled={!selectedEmployee || !form.templateID || grossSalary <= 0} type="submit">Save Structure</button>
            </form>
            {selectedEmployee ? <p className="mt-4 text-sm font-semibold text-[#6b7280]">Selected: <span className="font-black text-[#111827]">{employeeName(selectedEmployee)}</span></p> : null}
          </section>
          <section className="grid gap-4 md:grid-cols-3">
            <Summary label="Gross" value={money(grossSalary, selectedTemplate?.currency_code)} />
            <Summary label="Earnings" value={money(totalEarnings, selectedTemplate?.currency_code)} />
            <Summary label="Net Preview" value={money(totalEarnings - totalDeductions, selectedTemplate?.currency_code)} />
          </section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div><h2 className="text-xl font-black text-[#111827]">Salary Calculation</h2><p className="text-sm font-semibold text-[#6b7280]">Preview absent deduction, special pro-rata, and LWP line from the saved salary structure.</p></div>
              {currentSalary ? <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">Saved structure found</span> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Save structure first</span>}
            </div>
            <form className="grid gap-4 lg:grid-cols-6" onSubmit={calculateSalary}>
              <label className="block text-sm font-bold text-[#374151]">Month<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" max="12" min="1" onChange={(event) => setCalculationForm({ ...calculationForm, month: event.target.value })} required type="number" value={calculationForm.month} /></label>
              <label className="block text-sm font-bold text-[#374151]">Year<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min="2000" onChange={(event) => setCalculationForm({ ...calculationForm, year: event.target.value })} required type="number" value={calculationForm.year} /></label>
              <label className="block text-sm font-bold text-[#374151]">Present Days<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min="0" onChange={(event) => setCalculationForm({ ...calculationForm, presentDays: event.target.value })} placeholder="Auto" type="number" value={calculationForm.presentDays} /></label>
              <label className="block text-sm font-bold text-[#374151]">Absent Days<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min="0" onChange={(event) => setCalculationForm({ ...calculationForm, absentDays: event.target.value })} placeholder="Auto" type="number" value={calculationForm.absentDays} /></label>
              <label className="block text-sm font-bold text-[#374151]">Total Days<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min="1" onChange={(event) => setCalculationForm({ ...calculationForm, totalDays: event.target.value })} placeholder="Month days" type="number" value={calculationForm.totalDays} /></label>
              <button className="mt-7 h-11 rounded-xl bg-[#588368] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#a8b7ae]" disabled={!selectedEmployee || !currentSalary} type="submit">Calculate</button>
              <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151] lg:col-span-2"><input checked={calculationForm.isSpecial} onChange={(event) => setCalculationForm({ ...calculationForm, isSpecial: event.target.checked })} type="checkbox" />Special pro-rata</label>
            </form>
          </section>
          {calculation ? <section className="grid gap-4 md:grid-cols-4"><Summary label="Payable Days" value={`${calculation.present_days}/${calculation.total_days}`} /><Summary label="Absent Deduction" value={money(calculation.salary_result.absent_deduction, selectedTemplate?.currency_code)} /><Summary label="Total Deductions" value={money(calculation.salary_result.total_deductions, selectedTemplate?.currency_code)} /><Summary label="Net Salary" value={money(calculation.salary_result.net_salary, selectedTemplate?.currency_code)} /></section> : null}
          {calculation ? <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Calculation Items</h2><p className="text-sm font-semibold text-[#6b7280]">Includes LWP only when absent deduction is greater than zero.</p></div><SalaryStructureTable currency={selectedTemplate?.currency_code} rows={calculation.salary_result.items || []} /></section> : null}
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Structure Preview</h2><p className="text-sm font-semibold text-[#6b7280]">{selectedTemplate ? `${selectedTemplate.name} - ${label(selectedTemplate.template_type)}` : "Select a salary template"}</p></div><SalaryStructureTable currency={selectedTemplate?.currency_code} rows={preview} /></section>
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Assignment History</h2><p className="text-sm font-semibold text-[#6b7280]">{salaries.length} salary records for the selected employee.</p></div><div className="divide-y divide-[#edf1ef]">{salaries.length === 0 ? <p className="p-5 text-sm font-semibold text-[#6b7280]">No salary assignment yet.</p> : salaries.map((salary) => <div className="p-5" key={salary.id}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><strong className="block text-sm text-[#111827]">{money(salary.gross_salary, selectedTemplate?.currency_code)} gross</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">Effective {salary.effective_from ? salary.effective_from.slice(0, 10) : "not set"} - created {salary.created_at.slice(0, 10)}</span></div><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700" onClick={() => void deleteSalary(salary)} type="button">Delete</button></div><div className="mt-4"><SalaryStructureTable compact currency={selectedTemplate?.currency_code} rows={salary.structures || []} /></div></div>)}</div></section>
        </main>
      </div>
    </div>
  );
}

function Summary({ label: summaryLabel, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{summaryLabel}</p><strong className="mt-2 block text-2xl font-black text-[#111827]">{value}</strong></div>;
}

function SalaryStructureTable({ rows, currency = "INR", compact = false }: { rows: EmployeeSalaryStructure[]; currency?: string; compact?: boolean }) {
  return <div className="overflow-x-auto"><table className={`w-full text-left ${compact ? "min-w-[520px]" : "min-w-[720px]"}`}><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Component</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Order</th><th className="px-5 py-4 text-right">Amount</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.length === 0 ? <tr><td className="px-5 py-8 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>No structure rows to show.</td></tr> : rows.map((item) => <tr key={`${item.code}-${item.sort_order}`}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.code}</span></td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{label(item.item_type)}</td><td className="px-5 py-4 text-sm text-[#4b5563]">{item.sort_order}</td><td className="px-5 py-4 text-right text-sm font-black text-[#111827]">{money(item.amount, currency)}</td></tr>)}</tbody></table></div>;
}
