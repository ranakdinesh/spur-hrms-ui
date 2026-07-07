"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";
import { HrmsModal } from "@/components/hrms/HrmsModal";

type LeaveType = {
  id: string;
  tenant_id: string;
  name: string;
  shortcode?: string | null;
  description?: string | null;
  is_paid: boolean;
  is_carry_forward: boolean;
  max_carry_forward: number;
  is_consecutive_limit: boolean;
  consecutive_days_limit: number;
  is_enabled: boolean;
  is_system: boolean;
  inactive: boolean;
  updated_at: string;
};

type LeaveTypeForm = {
  name: string;
  shortcode: string;
  description: string;
  isPaid: boolean;
  isCarryForward: boolean;
  maxCarryForward: string;
  isConsecutiveLimit: boolean;
  consecutiveDaysLimit: string;
  isEnabled: boolean;
};

const emptyForm: LeaveTypeForm = {
  name: "",
  shortcode: "",
  description: "",
  isPaid: true,
  isCarryForward: false,
  maxCarryForward: "0",
  isConsecutiveLimit: false,
  consecutiveDaysLimit: "0",
  isEnabled: true,
};

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function leaveTypeToForm(item: LeaveType): LeaveTypeForm {
  return {
    name: item.name,
    shortcode: item.shortcode || "",
    description: item.description || "",
    isPaid: item.is_paid,
    isCarryForward: item.is_carry_forward,
    maxCarryForward: String(item.max_carry_forward || 0),
    isConsecutiveLimit: item.is_consecutive_limit,
    consecutiveDaysLimit: String(item.consecutive_days_limit || 0),
    isEnabled: item.is_enabled,
  };
}

function payload(form: LeaveTypeForm) {
  return {
    name: form.name.trim(),
    shortcode: optionalString(form.shortcode)?.toUpperCase() || null,
    description: optionalString(form.description),
    is_paid: form.isPaid,
    is_carry_forward: form.isCarryForward,
    max_carry_forward: form.isCarryForward ? Number.parseInt(form.maxCarryForward || "0", 10) || 0 : 0,
    is_consecutive_limit: form.isConsecutiveLimit,
    consecutive_days_limit: form.isConsecutiveLimit ? Number.parseInt(form.consecutiveDaysLimit || "0", 10) || 0 : 0,
    is_enabled: form.isEnabled,
  };
}

export function LeaveTypesSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Settings</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Leave Types</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage system defaults and tenant-only custom leave types.</p>
          </div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5"><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : null}
                {!tenantsLoading && filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Leave Types</button></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <LeaveTypeWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function LeaveTypeWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [form, setForm] = useState<LeaveTypeForm>(emptyForm);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const title = tenant ? `${tenant.name} Leave Types` : "Leave Types";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await apiRequest<LeaveType[]>(`${basePath}/leave-types`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave types.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredItems = useMemo(() => items.filter((item) => !sourceFilter || (sourceFilter === "system" ? item.is_system : !item.is_system)), [items, sourceFilter]);
  const stats = useMemo(() => ({ enabled: items.filter((item) => item.is_enabled).length, system: items.filter((item) => item.is_system).length, tenant: items.filter((item) => !item.is_system).length, paid: items.filter((item) => item.is_paid).length }), [items]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editing) {
        await apiRequest<LeaveType>(`${basePath}/leave-types/${editing.id}`, { method: "PUT", body: payload(form) });
        setMessage("Leave type updated.");
      } else {
        await apiRequest<LeaveType>(`${basePath}/leave-types`, { method: "POST", body: payload(form) });
        setMessage("Tenant leave type created.");
      }
      resetForm();
      setFormOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save leave type.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: LeaveType) {
    if (item.is_system) return;
    if (!window.confirm(`Deactivate ${item.name}?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<void>(`${basePath}/leave-types/${item.id}`, { method: "DELETE" });
      setMessage("Leave type deactivated.");
      await loadData();
      if (editing?.id === item.id) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate leave type.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(item: LeaveType) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<LeaveType>(`${basePath}/leave-types/${item.id}`, {
        method: "PUT",
        body: {
          name: item.name,
          shortcode: item.shortcode || null,
          description: item.description || null,
          is_paid: item.is_paid,
          is_carry_forward: item.is_carry_forward,
          max_carry_forward: item.max_carry_forward,
          is_consecutive_limit: item.is_consecutive_limit,
          consecutive_days_limit: item.consecutive_days_limit,
          is_enabled: !item.is_enabled,
        },
      });
      setMessage(item.is_enabled ? "Leave type disabled for this tenant." : "Leave type enabled for this tenant.");
      await loadData();
      if (editing?.id === item.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update leave type availability.");
    } finally {
      setSaving(false);
    }
  }

  function edit(item: LeaveType) {
    if (item.is_system) return;
    setEditing(item);
    setForm(leaveTypeToForm(item));
    setFormOpen(true);
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to tenants</button> : null}
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Settings</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">System defaults cover common leave categories. Enable only the leave types this tenant offers, then create tenant-only types for special cases.</p>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button">New Leave Type</button>
      </div>

      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <MetricCard label="Enabled Types" value={stats.enabled} tone="dark" />
        <MetricCard label="System Defaults" value={stats.system} tone="blue" />
        <MetricCard label="Tenant Custom" value={stats.tenant} tone="green" />
        <MetricCard label="Paid Types" value={stats.paid} tone="blue" />
      </div>

      <div className="grid gap-8">
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-black text-[#111827]">Leave Type List</h2><p className="text-sm text-[#6b7280]">{filteredItems.length} shown from {items.length} leave types.</p></div>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSourceFilter(event.target.value)} value={sourceFilter}><option value="">All sources</option><option value="system">System defaults</option><option value="tenant">Tenant custom</option></select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Leave Type</th><th className="px-5 py-4">Rules</th><th className="px-5 py-4">Source</th><th className="px-5 py-4">Availability</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading leave types...</td></tr> : null}
                {!loading && filteredItems.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No leave types found.</td></tr> : null}
                {!loading && filteredItems.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.shortcode || "No code"} - {item.description || "No description"}</span></td><td className="px-5 py-5"><div className="flex flex-wrap gap-2"><Pill tone={item.is_paid ? "green" : "red"}>{item.is_paid ? "Paid" : "Unpaid"}</Pill>{item.is_carry_forward ? <Pill tone="blue">Carry {item.max_carry_forward}d</Pill> : null}{item.is_consecutive_limit ? <Pill tone="dark">Limit {item.consecutive_days_limit}d</Pill> : null}</div></td><td className="px-5 py-5"><Pill tone={item.is_system ? "blue" : "green"}>{item.is_system ? "System" : "Tenant"}</Pill></td><td className="px-5 py-5"><Pill tone={item.is_enabled ? "green" : "red"}>{item.is_enabled ? "Enabled" : "Disabled"}</Pill></td><td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td><td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" disabled={saving} onClick={() => void toggleEnabled(item)} type="button">{item.is_enabled ? "Disable" : "Enable"}</button>{item.is_system ? null : <><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => edit(item)} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => void remove(item)} type="button">Delete</button></>}</div></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
        <HrmsModal description="Create tenant-specific leave types or update an existing tenant custom type. System leave types can be enabled or disabled directly from the grid." onClose={closeForm} open={formOpen} title={editing ? `Edit ${editing.name}` : "Create Leave Type"}>
          <form onSubmit={save}>
            <h2 className="text-lg font-black text-[#111827]">{editing ? "Edit Tenant Leave Type" : "Add Tenant Leave Type"}</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Custom leave types are tenant-scoped. System defaults keep their metadata, but can be enabled or disabled per tenant.</p>
            <div className="mt-5 space-y-4">
              <Field label="Leave type" required value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
              <Field label="Shortcode" placeholder="e.g. WFH, BDY" required value={form.shortcode} onChange={(value) => setForm((current) => ({ ...current, shortcode: value.toUpperCase() }))} />
              <label className="block text-sm font-bold text-[#374151]">Description<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <CheckField label="Paid leave" checked={form.isPaid} onChange={(checked) => setForm((current) => ({ ...current, isPaid: checked }))} />
                <CheckField label="Carry forward" checked={form.isCarryForward} onChange={(checked) => setForm((current) => ({ ...current, isCarryForward: checked }))} />
                <CheckField label="Enabled for company" checked={form.isEnabled} onChange={(checked) => setForm((current) => ({ ...current, isEnabled: checked }))} />
              </div>
              {form.isCarryForward ? <Field label="Max carry forward days" type="number" value={form.maxCarryForward} onChange={(value) => setForm((current) => ({ ...current, maxCarryForward: value }))} /> : null}
              <CheckField label="Consecutive leave limit" checked={form.isConsecutiveLimit} onChange={(checked) => setForm((current) => ({ ...current, isConsecutiveLimit: checked }))} />
              {form.isConsecutiveLimit ? <Field label="Consecutive days limit" type="number" value={form.consecutiveDaysLimit} onChange={(value) => setForm((current) => ({ ...current, consecutiveDaysLimit: value }))} /> : null}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={closeForm} type="button">Cancel</button>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
            </div>
          </form>
        </HrmsModal>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "dark" | "green" | "red" | "blue" }) {
  const tones = { dark: "bg-[#111827]", green: "bg-[#16a34a]", red: "bg-[#ef4444]", blue: "bg-[#3b82f6]" };
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><span className={`flex size-12 items-center justify-center rounded-full text-lg font-black text-white ${tones[tone]}`}>{value}</span><div><p className="text-xs font-bold text-[#6b7280]">{label}</p><h3 className="text-2xl font-black text-[#111827]">{value}</h3></div></div></div>;
}

function Field({ label, value, onChange, type = "text", required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} /></label>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-bold text-[#374151]"><input className="size-4 rounded border-[#dbe0e5] text-[#588368]" checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function Pill({ children, tone }: { children: ReactNode; tone: "dark" | "green" | "red" | "blue" }) {
  const tones = { dark: "bg-[#111827] text-white", green: "bg-[#eef9f2] text-[#2f6f4f]", red: "bg-red-50 text-red-700", blue: "bg-[#eef4ff] text-[#315699]" };
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}>{children}</span>;
}
