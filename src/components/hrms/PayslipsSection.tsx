"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";

type FinancialYear = { id: string; name: string; is_active: boolean; payroll_year: boolean };
type EmployeeRow = { user_id: string; employee_code?: string | null; firstname: string; middle_name?: string | null; lastname?: string | null; email?: string | null; inactive: boolean };
type SalarySlipFormat = { title: string; subtitle?: string | null; logo_path?: string | null; primary_color: string; accent_color: string; show_leave_balance: boolean; show_ytd_summary: boolean; show_employee_bank: boolean; show_employer_contributions: boolean; footer_text?: string | null; custom_fields?: Record<string, unknown> };
type SalarySlip = { id: string; user_id: string; month: number; year: number; gross_salary: number; total_earnings: number; total_deductions: number; absent_deduction: number; net_salary: number; is_regenerated: boolean; created_at: string };

type FormatForm = { title: string; subtitle: string; logoPath: string; primaryColor: string; accentColor: string; showLeaveBalance: boolean; showYTDSummary: boolean; showEmployeeBank: boolean; showEmployerContributions: boolean; footerText: string };
type GenerateForm = { userID: string; fyID: string; month: string; year: string; regenerate: boolean; isSpecial: boolean; presentDays: string; absentDays: string; totalDays: string };

const defaultFormat: FormatForm = { title: "Salary Slip", subtitle: "", logoPath: "", primaryColor: "#111827", accentColor: "#588368", showLeaveBalance: true, showYTDSummary: false, showEmployeeBank: true, showEmployerContributions: false, footerText: "" };
const currentDate = new Date();
const defaultGenerate: GenerateForm = { userID: "", fyID: "", month: String(currentDate.getMonth() + 1), year: String(currentDate.getFullYear()), regenerate: false, isSpecial: false, presentDays: "", absentDays: "", totalDays: "" };

function employeeName(employee: EmployeeRow) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ");
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(value || 0);
}

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function optionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value.trim() !== "" ? parsed : undefined;
}

async function downloadFile(path: string) {
  const { blob, filename } = await apiDownload(path);
  saveBlobDownload(blob, filename);
}

export function PayslipsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants.filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query))).sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b)));
  }, [tenantSearch, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll / Payslips</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Payslips</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to generate, format, and download salary slips.</p></div><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} /></div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Payslips</button></td></tr>)}</tbody></table></div></section>
      </div>
    );
  }
  return <PayslipWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function PayslipWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [format, setFormat] = useState<FormatForm>(defaultFormat);
  const [generate, setGenerate] = useState<GenerateForm>(defaultGenerate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [employeeRows, fys, slipFormat] = await Promise.all([apiRequest<EmployeeRow[]>(`${basePath}/employees`), apiRequest<FinancialYear[]>(`${basePath}/financial-years`), apiRequest<SalarySlipFormat>(`${basePath}/salary-slip-format`)]);
      setEmployees(employeeRows.filter((employee) => !employee.inactive));
      setFinancialYears(fys);
      const activeFY = generate.fyID || fys.find((fy) => fy.is_active && fy.payroll_year)?.id || fys[0]?.id || "";
      setGenerate((current) => ({ ...current, fyID: current.fyID || activeFY }));
      setFormat({ title: slipFormat.title || "Salary Slip", subtitle: slipFormat.subtitle || "", logoPath: slipFormat.logo_path || "", primaryColor: slipFormat.primary_color || "#111827", accentColor: slipFormat.accent_color || "#588368", showLeaveBalance: slipFormat.show_leave_balance, showYTDSummary: slipFormat.show_ytd_summary, showEmployeeBank: slipFormat.show_employee_bank, showEmployerContributions: slipFormat.show_employer_contributions, footerText: slipFormat.footer_text || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payslip setup.");
    } finally { setLoading(false); }
  }, [basePath, generate.fyID]);

  const loadSlips = useCallback(async () => {
    setError("");
    try {
      const query = generate.userID ? `user_id=${generate.userID}` : `month=${generate.month}&year=${generate.year}`;
      setSlips(await apiRequest<SalarySlip[]>(`${basePath}/salary-slips?${query}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payslips.");
    }
  }, [basePath, generate.month, generate.userID, generate.year]);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);
  useEffect(() => { const timer = window.setTimeout(loadSlips, 0); return () => window.clearTimeout(timer); }, [loadSlips]);

  async function saveFormat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await apiRequest<SalarySlipFormat>(`${basePath}/salary-slip-format`, { method: "PUT", body: { title: format.title, subtitle: format.subtitle || null, logo_path: format.logoPath || null, primary_color: format.primaryColor, accent_color: format.accentColor, show_leave_balance: format.showLeaveBalance, show_ytd_summary: format.showYTDSummary, show_employee_bank: format.showEmployeeBank, show_employer_contributions: format.showEmployerContributions, footer_text: format.footerText || null, custom_fields: {} } });
      setMessage("Salary slip format saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save salary slip format."); }
  }

  async function generateSlip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await apiRequest<SalarySlip>(`${basePath}/salary-slips`, { method: "POST", body: { user_id: generate.userID, fy_id: generate.fyID, month: Number(generate.month), year: Number(generate.year), regenerate: generate.regenerate, is_special: generate.isSpecial, present_days: optionalNumber(generate.presentDays), absent_days: optionalNumber(generate.absentDays), total_days: optionalNumber(generate.totalDays) } });
      setMessage("Salary slip generated."); await loadSlips();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to generate salary slip."); }
  }

  async function bulkGenerate() {
    setError(""); setMessage("");
    try {
      await apiRequest<SalarySlip[]>(`${basePath}/salary-slips/bulk-generate`, { method: "POST", body: { fy_id: generate.fyID, month: Number(generate.month), year: Number(generate.year), regenerate: generate.regenerate } });
      setMessage("Bulk salary slip generation completed."); await loadSlips();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to bulk generate salary slips."); }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll / Payslips</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Payslips` : "Payslips"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Generate monthly salary slips, maintain tenant-specific PDF format, and download single or bulk files.</p></div><div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}<button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">Refresh</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={() => void downloadFile(`${basePath}/salary-slips/recent-download?months=6`)} type="button">My Recent ZIP</button></div></div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}{message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Slip Format</h2><form className="mt-5 space-y-4" onSubmit={saveFormat}><Field label="Title" value={format.title} onChange={(value) => setFormat({ ...format, title: value })} /><Field label="Subtitle" value={format.subtitle} onChange={(value) => setFormat({ ...format, subtitle: value })} /><Field label="Logo path" value={format.logoPath} onChange={(value) => setFormat({ ...format, logoPath: value })} /><div className="grid gap-3 sm:grid-cols-2"><Field label="Primary color" type="color" value={format.primaryColor} onChange={(value) => setFormat({ ...format, primaryColor: value })} /><Field label="Accent color" type="color" value={format.accentColor} onChange={(value) => setFormat({ ...format, accentColor: value })} /></div><TextArea label="Footer text" value={format.footerText} onChange={(value) => setFormat({ ...format, footerText: value })} /><div className="grid gap-3 sm:grid-cols-2"><Check label="Leave balance" checked={format.showLeaveBalance} onChange={(value) => setFormat({ ...format, showLeaveBalance: value })} /><Check label="YTD summary" checked={format.showYTDSummary} onChange={(value) => setFormat({ ...format, showYTDSummary: value })} /><Check label="Employee bank" checked={format.showEmployeeBank} onChange={(value) => setFormat({ ...format, showEmployeeBank: value })} /><Check label="Employer contributions" checked={format.showEmployerContributions} onChange={(value) => setFormat({ ...format, showEmployerContributions: value })} /></div><button className="w-full rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" type="submit">Save Format</button></form></section>
        <main className="space-y-6">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Generate Payslip</h2><form className="mt-5 grid gap-4 lg:grid-cols-4" onSubmit={generateSlip}><Select label="Employee" value={generate.userID} onChange={(value) => setGenerate({ ...generate, userID: value })} options={[{ value: "", label: "Select employee" }, ...employees.map((employee) => ({ value: employee.user_id, label: `${employeeName(employee)} ${employee.employee_code ? `(${employee.employee_code})` : ""}` }))]} /><Select label="Financial year" value={generate.fyID} onChange={(value) => setGenerate({ ...generate, fyID: value })} options={financialYears.map((fy) => ({ value: fy.id, label: fy.name }))} /><Field label="Month" type="number" value={generate.month} onChange={(value) => setGenerate({ ...generate, month: value })} /><Field label="Year" type="number" value={generate.year} onChange={(value) => setGenerate({ ...generate, year: value })} /><Field label="Present days" type="number" value={generate.presentDays} onChange={(value) => setGenerate({ ...generate, presentDays: value })} /><Field label="Absent days" type="number" value={generate.absentDays} onChange={(value) => setGenerate({ ...generate, absentDays: value })} /><Field label="Total days" type="number" value={generate.totalDays} onChange={(value) => setGenerate({ ...generate, totalDays: value })} /><div className="space-y-3"><Check label="Regenerate" checked={generate.regenerate} onChange={(value) => setGenerate({ ...generate, regenerate: value })} /><Check label="Special pro-rata" checked={generate.isSpecial} onChange={(value) => setGenerate({ ...generate, isSpecial: value })} /></div><div className="flex flex-wrap gap-3 lg:col-span-4"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!generate.userID || !generate.fyID} type="submit">Generate</button><button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void bulkGenerate()} type="button">Generate All Staff</button><button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void downloadFile(`${basePath}/salary-slips/bulk-download?month=${generate.month}&year=${generate.year}`)} type="button">Download Month ZIP</button></div></form></section>
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Generated Slips</h2><p className="text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : `${slips.length} slips shown.`}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Period</th><th className="px-5 py-4">Employee</th><th className="px-5 py-4">Gross</th><th className="px-5 py-4">Deductions</th><th className="px-5 py-4">Net</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{slips.map((slip) => <tr key={slip.id}><td className="px-5 py-4 text-sm font-black text-[#111827]">{String(slip.month).padStart(2, "0")}/{slip.year}</td><td className="px-5 py-4 text-xs font-semibold text-[#6b7280]">{slip.user_id}</td><td className="px-5 py-4 text-sm text-[#4b5563]">{money(slip.gross_salary)}</td><td className="px-5 py-4 text-sm text-[#4b5563]">{money(slip.total_deductions)}</td><td className="px-5 py-4 text-sm font-black text-[#111827]">{money(slip.net_salary)}</td><td className="px-5 py-4 text-right"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => void downloadFile(`${basePath}/salary-slips/${slip.id}/pdf`)} type="button">PDF</button></td></tr>)}</tbody></table></div></section>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<textarea className="mt-2 min-h-[86px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}
