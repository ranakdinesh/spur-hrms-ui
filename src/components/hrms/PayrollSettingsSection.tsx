"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type PayCycle = PayrollForm & {
  id?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
};

type PayrollForm = {
  name: string;
  cycle_type: string;
  pay_day?: number | null;
  start_day?: number | null;
  end_day?: number | null;
  attendance_source: string;
  attendance_period_type: string;
  attendance_cutoff_day: number;
  payout_timing: string;
  payout_offset_days: number;
  include_weekly_offs: boolean;
  include_holidays: boolean;
  prorate_joining_exit: boolean;
  proration_basis: string;
  allow_arrears: boolean;
  arrears_mode: string;
  allow_negative_net_pay: boolean;
  overtime_component_code?: string | null;
  lwp_component_code: string;
  rounding_mode: string;
  payment_mode: string;
  payment_file_format: string;
  requires_approval: boolean;
  auto_lock_after_approval: boolean;
  payroll_lock_day?: number | null;
  pf_enabled: boolean;
  pf_employee_rate: number;
  pf_employer_rate: number;
  pf_wage_ceiling: number;
  pf_apply_ceiling: boolean;
  esi_enabled: boolean;
  esi_employee_rate: number;
  esi_employer_rate: number;
  esi_wage_ceiling: number;
  professional_tax_enabled: boolean;
  tds_enabled: boolean;
  country_code: string;
  state_code?: string | null;
  notes?: string | null;
};

type PayCyclePeriod = {
  period_start: string;
  period_end: string;
  attendance_start: string;
  attendance_end: string;
  attendance_cutoff: string;
  payout_date: string;
  lock_date?: string | null;
};

const defaultForm: PayrollForm = {
  name: "Monthly Payroll",
  cycle_type: "monthly",
  pay_day: 30,
  start_day: 1,
  end_day: 31,
  attendance_source: "attendance",
  attendance_period_type: "current_month",
  attendance_cutoff_day: 25,
  payout_timing: "same_month",
  payout_offset_days: 0,
  include_weekly_offs: true,
  include_holidays: true,
  prorate_joining_exit: true,
  proration_basis: "calendar_days",
  allow_arrears: true,
  arrears_mode: "next_cycle",
  allow_negative_net_pay: false,
  overtime_component_code: null,
  lwp_component_code: "lwp",
  rounding_mode: "nearest_rupee",
  payment_mode: "bank_transfer",
  payment_file_format: "bank_csv",
  requires_approval: true,
  auto_lock_after_approval: true,
  payroll_lock_day: null,
  pf_enabled: true,
  pf_employee_rate: 12,
  pf_employer_rate: 12,
  pf_wage_ceiling: 15000,
  pf_apply_ceiling: true,
  esi_enabled: true,
  esi_employee_rate: 0.75,
  esi_employer_rate: 3.25,
  esi_wage_ceiling: 21000,
  professional_tax_enabled: true,
  tds_enabled: true,
  country_code: "IN",
  state_code: null,
  notes: "Default India payroll setup. Confirm applicability with payroll/legal advisor for your company and state.",
};

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function optionLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function nullableString(value?: string | null) {
  const clean = String(value || "").trim();
  return clean ? clean : null;
}

function nullableDay(value?: number | null) {
  if (!value || value < 1 || value > 31) return null;
  return Math.trunc(value);
}

function cleanPayload(form: PayrollForm): PayrollForm {
  return {
    ...form,
    pay_day: nullableDay(form.pay_day),
    start_day: nullableDay(form.start_day),
    end_day: nullableDay(form.end_day),
    payroll_lock_day: nullableDay(form.payroll_lock_day),
    overtime_component_code: nullableString(form.overtime_component_code),
    state_code: nullableString(form.state_code),
    notes: nullableString(form.notes),
    country_code: (form.country_code || "IN").toUpperCase(),
    pf_employee_rate: Number(form.pf_employee_rate || 0),
    pf_employer_rate: Number(form.pf_employer_rate || 0),
    pf_wage_ceiling: Number(form.pf_wage_ceiling || 0),
    esi_employee_rate: Number(form.esi_employee_rate || 0),
    esi_employer_rate: Number(form.esi_employer_rate || 0),
    esi_wage_ceiling: Number(form.esi_wage_ceiling || 0),
  };
}

export function PayrollSettingsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b)));
  }, [tenantSearch, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Payroll Settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to configure payroll cycle, statutory defaults, approval and payment controls.</p></div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : null}{!tenantsLoading && filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Payroll</button></td></tr>)}</tbody></table></div></section>
      </div>
    );
  }

  return <PayrollSettingsWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function PayrollSettingsWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [form, setForm] = useState<PayrollForm>(defaultForm);
  const [period, setPeriod] = useState<PayCyclePeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const now = new Date();
  const [previewMonth, setPreviewMonth] = useState(now.getMonth() + 1);
  const [previewYear, setPreviewYear] = useState(now.getFullYear());
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/pay-cycle` : "/hrms/pay-cycle";
  const title = tenant ? `${tenant.name} Payroll Settings` : "Payroll Settings";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<PayCycle>(basePath).catch((err) => {
        if (err instanceof Error && err.message.toLowerCase().includes("not found")) return defaultForm as PayCycle;
        throw err;
      });
      setForm({ ...defaultForm, ...result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payroll settings.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  const loadPeriod = useCallback(async () => {
    try {
      setPeriod(await apiRequest<PayCyclePeriod>(`${basePath}/period?month=${previewMonth}&year=${previewYear}`));
    } catch {
      setPeriod(null);
    }
  }, [basePath, previewMonth, previewYear]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (loading) return undefined;
    const timer = window.setTimeout(loadPeriod, 0);
    return () => window.clearTimeout(timer);
  }, [loadPeriod, loading]);

  function update<K extends keyof PayrollForm>(key: K, value: PayrollForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await apiRequest<PayCycle>(basePath, { method: "PUT", body: cleanPayload(form) });
      setForm({ ...defaultForm, ...saved });
      setMessage("Payroll settings saved.");
      await loadPeriod();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save payroll settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings / Payroll</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Configure how payroll periods are cut, how attendance feeds salary, how statutory deductions are applied, and when finance can approve and lock payroll.</p></div><div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}<button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">Refresh</button></div></div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {loading ? <div className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-sm font-semibold text-[#6b7280]">Loading payroll settings...</div> : (
        <form className="grid gap-6 xl:grid-cols-[1fr_360px]" onSubmit={save}>
          <div className="space-y-6">
            <Panel title="Cycle and Attendance" description="Most India companies process monthly payroll, often with attendance cutoff before month-end and arrears in next cycle.">
              <div className="grid gap-4 md:grid-cols-3"><TextInput label="Config name" value={form.name} onChange={(value) => update("name", value)} /><SelectInput label="Cycle type" value={form.cycle_type} onChange={(value) => update("cycle_type", value)} options={["monthly", "semi_monthly", "weekly", "bi_weekly", "custom"]} /><NumberInput label="Pay day" value={form.pay_day || 30} onChange={(value) => update("pay_day", value)} /></div>
              <div className="mt-4 grid gap-4 md:grid-cols-3"><NumberInput label="Attendance start day" value={form.start_day || 1} onChange={(value) => update("start_day", value)} /><NumberInput label="Attendance end day" value={form.end_day || 31} onChange={(value) => update("end_day", value)} /><NumberInput label="Attendance cutoff day" value={form.attendance_cutoff_day} onChange={(value) => update("attendance_cutoff_day", value)} /></div>
              <div className="mt-4 grid gap-4 md:grid-cols-3"><SelectInput label="Attendance source" value={form.attendance_source} onChange={(value) => update("attendance_source", value)} options={["attendance", "manual", "import", "none"]} /><SelectInput label="Attendance period" value={form.attendance_period_type} onChange={(value) => update("attendance_period_type", value)} options={["current_month", "previous_month", "custom_days"]} /><SelectInput label="Proration basis" value={form.proration_basis} onChange={(value) => update("proration_basis", value)} options={["calendar_days", "working_days", "fixed_26", "fixed_30"]} /></div>
            </Panel>
            <Panel title="Payout, Arrears and Locking" description="Control salary disbursement timing, retro corrections and finance approval gates.">
              <div className="grid gap-4 md:grid-cols-3"><SelectInput label="Payout timing" value={form.payout_timing} onChange={(value) => update("payout_timing", value)} options={["same_month", "next_month", "fixed_offset"]} /><NumberInput label="Payout offset days" value={form.payout_offset_days} onChange={(value) => update("payout_offset_days", value)} /><NumberInput label="Payroll lock day" value={form.payroll_lock_day || 0} onChange={(value) => update("payroll_lock_day", value || null)} /></div>
              <div className="mt-4 grid gap-3 md:grid-cols-3"><CheckInput label="Allow arrears" checked={form.allow_arrears} onChange={(value) => update("allow_arrears", value)} /><CheckInput label="Requires approval" checked={form.requires_approval} onChange={(value) => update("requires_approval", value)} /><CheckInput label="Auto-lock after approval" checked={form.auto_lock_after_approval} onChange={(value) => update("auto_lock_after_approval", value)} /></div>
              <div className="mt-4 grid gap-4 md:grid-cols-3"><SelectInput label="Arrears mode" value={form.arrears_mode} onChange={(value) => update("arrears_mode", value)} options={["same_cycle", "next_cycle", "manual"]} /><SelectInput label="Rounding" value={form.rounding_mode} onChange={(value) => update("rounding_mode", value)} options={["none", "nearest_rupee", "ceil_rupee", "floor_rupee", "two_decimals"]} /><TextInput label="LWP component code" value={form.lwp_component_code} onChange={(value) => update("lwp_component_code", value)} /></div>
            </Panel>
            <Panel title="India Statutory Defaults" description="Defaults are configurable because PF, ESI, PT and TDS applicability varies by company, wage level, state and employee category.">
              <div className="grid gap-3 md:grid-cols-4"><CheckInput label="PF enabled" checked={form.pf_enabled} onChange={(value) => update("pf_enabled", value)} /><CheckInput label="Apply PF ceiling" checked={form.pf_apply_ceiling} onChange={(value) => update("pf_apply_ceiling", value)} /><CheckInput label="ESI enabled" checked={form.esi_enabled} onChange={(value) => update("esi_enabled", value)} /><CheckInput label="TDS enabled" checked={form.tds_enabled} onChange={(value) => update("tds_enabled", value)} /></div>
              <div className="mt-4 grid gap-4 md:grid-cols-4"><NumberInput label="PF employee %" value={form.pf_employee_rate} onChange={(value) => update("pf_employee_rate", value)} step="0.01" /><NumberInput label="PF employer %" value={form.pf_employer_rate} onChange={(value) => update("pf_employer_rate", value)} step="0.01" /><NumberInput label="PF wage ceiling" value={form.pf_wage_ceiling} onChange={(value) => update("pf_wage_ceiling", value)} /><NumberInput label="ESI wage ceiling" value={form.esi_wage_ceiling} onChange={(value) => update("esi_wage_ceiling", value)} /></div>
              <div className="mt-4 grid gap-4 md:grid-cols-4"><NumberInput label="ESI employee %" value={form.esi_employee_rate} onChange={(value) => update("esi_employee_rate", value)} step="0.01" /><NumberInput label="ESI employer %" value={form.esi_employer_rate} onChange={(value) => update("esi_employer_rate", value)} step="0.01" /><CheckInput label="Professional tax" checked={form.professional_tax_enabled} onChange={(value) => update("professional_tax_enabled", value)} /><TextInput label="State code" value={form.state_code || ""} onChange={(value) => update("state_code", value)} /></div>
            </Panel>
            <Panel title="Payment and Notes" description="Set how finance will disburse salaries and export payment files."><div className="grid gap-4 md:grid-cols-3"><SelectInput label="Payment mode" value={form.payment_mode} onChange={(value) => update("payment_mode", value)} options={["bank_transfer", "cash", "cheque", "upi", "mixed"]} /><SelectInput label="Payment file format" value={form.payment_file_format} onChange={(value) => update("payment_file_format", value)} options={["bank_csv", "bank_xlsx", "nach", "none", "custom"]} /><TextInput label="Overtime component" value={form.overtime_component_code || ""} onChange={(value) => update("overtime_component_code", value)} /></div><label className="mt-4 block text-sm font-bold text-[#374151]">Notes<textarea className="mt-2 min-h-[92px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => update("notes", event.target.value)} value={form.notes || ""} /></label></Panel>
            <div className="flex justify-end"><button className="rounded-xl bg-[#588368] px-6 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Payroll Settings"}</button></div>
          </div>
          <aside className="space-y-5"><section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#111827]">Period Preview</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">Preview attendance and payout dates before salary generation.</p><div className="mt-4 grid grid-cols-2 gap-3"><NumberInput label="Month" value={previewMonth} onChange={setPreviewMonth} /><NumberInput label="Year" value={previewYear} onChange={setPreviewYear} /></div><button className="mt-4 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void loadPeriod()} type="button">Preview Period</button>{period ? <div className="mt-5 space-y-3 text-sm"><PreviewRow label="Payroll period" value={`${toDate(period.period_start)} - ${toDate(period.period_end)}`} /><PreviewRow label="Attendance" value={`${toDate(period.attendance_start)} - ${toDate(period.attendance_end)}`} /><PreviewRow label="Cutoff" value={toDate(period.attendance_cutoff)} /><PreviewRow label="Payout" value={toDate(period.payout_date)} /><PreviewRow label="Lock" value={toDate(period.lock_date)} /></div> : <p className="mt-5 rounded-xl bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#6b7280]">Save settings to enable preview.</p>}</section><section className="rounded-2xl border border-[#dfe6e2] bg-[#fbf7ee] p-5"><h2 className="text-lg font-black text-[#111827]">India Payroll Notes</h2><p className="mt-2 text-sm font-semibold leading-6 text-[#6b7280]">PF, ESI, PT and TDS are configurable because applicability depends on establishment coverage, wage limits, employee category and state.</p></section></aside>
        </form>
      )}
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">{title}</h2><p className="mt-1 text-sm font-semibold leading-6 text-[#6b7280]">{description}</p><div className="mt-5">{children}</div></section>;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function NumberInput({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(Number(event.target.value))} step={step} type="number" value={Number.isFinite(value) ? value : 0} /></label>;
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>;
}

function CheckInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f8faf9] px-4 py-3"><span className="block text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</span><strong className="mt-1 block text-sm text-[#111827]">{value}</strong></div>;
}
