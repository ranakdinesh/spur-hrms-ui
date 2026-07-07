"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type LeaveType = { id: string; name: string; shortcode?: string | null; is_system: boolean };
type FinancialYear = { id: string; name: string; start_date: string; end_date: string; is_active: boolean; is_locked: boolean };
type LeavePolicy = {
  id: string;
  tenant_id: string;
  leave_type_id: string;
  fy_id: string;
  total_days: number;
  allocation_type: "fixed" | "monthly";
  jan: number; feb: number; mar: number; apr: number; may: number; jun: number; jul: number; aug: number; sep: number; oct: number; nov: number; dec: number;
  is_sandwich_applicable: boolean;
  updated_at: string;
};

type PolicyForm = {
  leaveTypeID: string;
  fyID: string;
  totalDays: string;
  allocationType: "fixed" | "monthly";
  isSandwichApplicable: boolean;
};

const emptyForm: PolicyForm = { leaveTypeID: "", fyID: "", totalDays: "12", allocationType: "fixed", isSandwichApplicable: false };
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function distribute(totalDays: number) {
  const whole = Math.max(0, Math.floor(totalDays));
  const base = Math.floor(whole / 12);
  const remainder = whole % 12;
  return monthLabels.map((label, index) => ({ label, value: base + (index < remainder ? 1 : 0) }));
}

function policyToForm(item: LeavePolicy): PolicyForm {
  return {
    leaveTypeID: item.leave_type_id,
    fyID: item.fy_id,
    totalDays: String(item.total_days || 0),
    allocationType: item.allocation_type,
    isSandwichApplicable: item.is_sandwich_applicable,
  };
}

function policyPayload(form: PolicyForm) {
  const totalDays = Number.parseFloat(form.totalDays || "0") || 0;
  const distribution = distribute(totalDays);
  const body: Record<string, unknown> = {
    leave_type_id: form.leaveTypeID,
    fy_id: form.fyID,
    total_days: totalDays,
    allocation_type: form.allocationType,
    is_sandwich_applicable: form.isSandwichApplicable,
  };
  months.forEach((month, index) => {
    body[month] = form.allocationType === "monthly" ? distribution[index].value : 0;
  });
  return body;
}

export function LeavePoliciesSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Settings</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Leave Policies</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to configure fixed or monthly leave allocation policies.</p></div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5"><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : null}{!tenantsLoading && filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Policies</button></td></tr>)}</tbody></table></div>
        </section>
      </div>
    );
  }

  return <LeavePolicyWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function LeavePolicyWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [form, setForm] = useState<PolicyForm>(emptyForm);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const title = tenant ? `${tenant.name} Leave Policies` : "Leave Policies";
  const monthlyPreview = distribute(Number.parseFloat(form.totalDays || "0") || 0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [policyResult, typeResult, fyResult] = await Promise.all([
        apiRequest<LeavePolicy[]>(`${basePath}/leave-policies`),
        apiRequest<LeaveType[]>(`${basePath}/leave-types`),
        apiRequest<FinancialYear[]>(`${basePath}/financial-years`),
      ]);
      setPolicies(policyResult);
      setLeaveTypes(typeResult);
      setFinancialYears(fyResult);
      setForm((current) => ({ ...current, leaveTypeID: current.leaveTypeID || typeResult[0]?.id || "", fyID: current.fyID || fyResult.find((fy) => fy.is_active)?.id || fyResult[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave policies.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, leaveTypeID: leaveTypes[0]?.id || "", fyID: financialYears.find((fy) => fy.is_active)?.id || financialYears[0]?.id || "" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editing) {
        await apiRequest<LeavePolicy>(`${basePath}/leave-policies/${editing.id}`, { method: "PUT", body: policyPayload(form) });
        setMessage("Leave policy updated.");
      } else {
        await apiRequest<LeavePolicy>(`${basePath}/leave-policies`, { method: "POST", body: policyPayload(form) });
        setMessage("Leave policy created.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save leave policy.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: LeavePolicy) {
    if (!window.confirm("Deactivate this leave policy?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<void>(`${basePath}/leave-policies/${item.id}`, { method: "DELETE" });
      setMessage("Leave policy deactivated.");
      await loadData();
      if (editing?.id === item.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate leave policy.");
    } finally {
      setSaving(false);
    }
  }

  function leaveTypeName(id: string) {
    const item = leaveTypes.find((type) => type.id === id);
    return item ? `${item.name}${item.shortcode ? ` (${item.shortcode})` : ""}` : "Unknown leave type";
  }

  function financialYearName(id: string) {
    const item = financialYears.find((fy) => fy.id === id);
    return item ? item.name : "Unknown FY";
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>{onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to tenants</button> : null}<p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Settings</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Configure annual quotas, fixed allocation, monthly allocation, and sandwich leave policy flags.</p></div>
      </div>
      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

      <div className="grid gap-8">
        <form className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" onSubmit={save}>
          <h2 className="text-lg font-black text-[#111827]">{editing ? "Edit Leave Policy" : "Add Leave Policy"}</h2>
          <div className="mt-5 space-y-4">
            <SelectField label="Leave type" value={form.leaveTypeID} onChange={(value) => setForm((current) => ({ ...current, leaveTypeID: value }))} options={leaveTypes.map((item) => ({ id: item.id, label: `${item.name}${item.shortcode ? ` (${item.shortcode})` : ""}` }))} />
            <SelectField label="Financial year" value={form.fyID} onChange={(value) => setForm((current) => ({ ...current, fyID: value }))} options={financialYears.map((item) => ({ id: item.id, label: `${item.name}${item.is_active ? " - Active" : ""}${item.is_locked ? " - Locked" : ""}` }))} />
            <Field label="Total days" required type="number" value={form.totalDays} onChange={(value) => setForm((current) => ({ ...current, totalDays: value }))} />
            <label className="block text-sm font-bold text-[#374151]">Allocation type<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, allocationType: event.target.value as "fixed" | "monthly" }))} value={form.allocationType}><option value="fixed">Fixed yearly allocation</option><option value="monthly">Monthly allocation</option></select></label>
            <CheckField label="Sandwich leave applicable" checked={form.isSandwichApplicable} onChange={(checked) => setForm((current) => ({ ...current, isSandwichApplicable: checked }))} />
            {form.allocationType === "monthly" ? <div className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4"><h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Monthly Distribution</h3><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{monthlyPreview.map((item) => <div className="rounded-xl bg-white px-3 py-2 text-center" key={item.label}><p className="text-xs font-bold text-[#6b7280]">{item.label}</p><p className="text-lg font-black text-[#111827]">{item.value}</p></div>)}</div></div> : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving || !form.leaveTypeID || !form.fyID} type="submit">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>{editing ? <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Cancel</button> : null}</div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5"><h2 className="text-lg font-black text-[#111827]">Leave Policy List</h2><p className="text-sm text-[#6b7280]">{policies.length} active policies.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Policy</th><th className="px-5 py-4">Allocation</th><th className="px-5 py-4">Monthly</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading policies...</td></tr> : null}{!loading && policies.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No leave policies found.</td></tr> : null}{!loading && policies.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{leaveTypeName(item.leave_type_id)}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{financialYearName(item.fy_id)} - {item.total_days} days</span></td><td className="px-5 py-5"><div className="flex flex-wrap gap-2"><Pill tone={item.allocation_type === "monthly" ? "blue" : "dark"}>{item.allocation_type}</Pill>{item.is_sandwich_applicable ? <Pill tone="green">Sandwich</Pill> : null}</div></td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{item.allocation_type === "monthly" ? months.map((month) => item[month]).join(" / ") : "-"}</td><td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td><td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => { setEditing(item); setForm(policyToForm(item)); }} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => void remove(item)} type="button">Delete</button></div></td></tr>)}</tbody></table></div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; label: string }> }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}><option value="">Select</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-bold text-[#374151]"><input className="size-4 rounded border-[#dbe0e5] text-[#588368]" checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function Pill({ children, tone }: { children: string; tone: "dark" | "green" | "blue" }) {
  const tones = { dark: "bg-[#111827] text-white", green: "bg-[#eef9f2] text-[#2f6f4f]", blue: "bg-[#eef4ff] text-[#315699]" };
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tones[tone]}`}>{children}</span>;
}
