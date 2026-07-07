"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type FinancialYear = {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  payroll_year: boolean;
  leave_year: boolean;
  holiday_year: boolean;
  reporting_year: boolean;
  is_locked: boolean;
  locked_at?: string | null;
  close_note?: string | null;
  inactive: boolean;
  created_at: string;
  updated_at: string;
};

type FinancialYearFormState = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  payrollYear: boolean;
  leaveYear: boolean;
  holidayYear: boolean;
  reportingYear: boolean;
  closeNote: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const emptyForm: FinancialYearFormState = {
  name: "",
  startDate: "",
  endDate: "",
  isActive: false,
  payrollYear: true,
  leaveYear: true,
  holidayYear: true,
  reportingYear: true,
  closeNote: "",
};

function financialYearToForm(item: FinancialYear): FinancialYearFormState {
  return {
    name: item.name || "",
    startDate: toDateInput(item.start_date),
    endDate: toDateInput(item.end_date),
    isActive: item.is_active,
    payrollYear: item.payroll_year,
    leaveYear: item.leave_year,
    holidayYear: item.holiday_year,
    reportingYear: item.reporting_year,
    closeNote: item.close_note || "",
  };
}

function cleanFinancialYearPayload(form: FinancialYearFormState) {
  return {
    name: form.name.trim(),
    start_date: form.startDate,
    end_date: form.endDate,
    is_active: form.isActive,
    payroll_year: form.payrollYear,
    leave_year: form.leaveYear,
    holiday_year: form.holidayYear,
    reporting_year: form.reportingYear,
    close_note: form.closeNote.trim() || null,
  };
}

function toDateInput(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

export function FinancialYearsSection({
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
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Financial Years</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. Financial years are tenant-owned and drive HRMS leave, holiday, payroll, and reporting periods.</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenant{tenants.length === 1 ? "" : "s"}</p>
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
                <tr>
                  <th className="px-5 py-4">Tenant</th>
                  <th className="px-5 py-4">Subdomain</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading tenants...</td></tr>
                ) : filteredTenants.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No tenants match your search.</td></tr>
                ) : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4f1] text-sm font-black text-[#588368]">{tenant.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong className="block text-sm text-[#111827]">{tenant.name}</strong>
                          <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.joined}</td>
                    <td className="px-5 py-5 text-right">
                      <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage FY</button>
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

  return <FinancialYearManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function FinancialYearManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<FinancialYear[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<FinancialYear | null>(null);
  const [form, setForm] = useState<FinancialYearFormState>(emptyForm);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/financial-years` : "/hrms/financial-years";

  const loadFinancialYears = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await apiRequest<FinancialYear[]>(basePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load financial years.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadFinancialYears, 0);
    return () => window.clearTimeout(timer);
  }, [loadFinancialYears]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => !query || [item.name, item.start_date, item.end_date, item.close_note || ""].some((value) => value.toLowerCase().includes(query)));
  }, [items, search]);

  const activeYear = items.find((item) => item.is_active);
  const lockedCount = items.filter((item) => item.is_locked).length;
  const title = tenant ? `${tenant.name} Financial Years` : "Financial Years";

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function saveFinancialYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = cleanFinancialYearPayload(form);
    if (!payload.start_date || !payload.end_date) {
      setSaving(false);
      setError("Start date and end date are required.");
      return;
    }
    try {
      if (editing) {
        await apiRequest<FinancialYear>(`${basePath}/${editing.id}`, { method: "PUT", body: payload });
        setMessage("Financial year updated.");
      } else {
        await apiRequest<FinancialYear>(basePath, { method: "POST", body: payload });
        setMessage("Financial year created.");
      }
      resetForm();
      await loadFinancialYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save financial year.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(item: FinancialYear) {
    setError("");
    setMessage("");
    try {
      await apiRequest<FinancialYear>(`${basePath}/${item.id}/active`, { method: "PUT" });
      setMessage(`${item.name} is now active.`);
      await loadFinancialYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set active financial year.");
    }
  }

  async function setLock(item: FinancialYear) {
    const closeNote = item.is_locked ? item.close_note || "" : window.prompt("Close note for this financial year", item.close_note || "") || "";
    setError("");
    setMessage("");
    try {
      await apiRequest<FinancialYear>(`${basePath}/${item.id}/lock`, { method: "PUT", body: { is_locked: !item.is_locked, close_note: closeNote.trim() || null } });
      setMessage(item.is_locked ? "Financial year unlocked." : "Financial year locked.");
      await loadFinancialYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update lock status.");
    }
  }

  async function deleteFinancialYear(item: FinancialYear) {
    if (!window.confirm(`Deactivate ${item.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/${item.id}`, { method: "DELETE" });
      setMessage("Financial year deactivated.");
      await loadFinancialYears();
      if (editing?.id === item.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate financial year.");
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Set tenant financial years for payroll, leave, holiday calendars, and reports. Lock a year after year-end close to prevent later edits.</p>
        </div>
        <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search financial years" value={search} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total years" value={String(items.length)} />
        <SummaryCard label="Active year" value={activeYear?.name || "Not set"} />
        <SummaryCard label="Locked years" value={String(lockedCount)} />
      </div>

      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg bg-[#eef9f2] px-4 py-3 text-sm font-semibold text-[#2f6f4f]">{message}</p> : null}

      <div className="grid gap-8">
        <form className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" onSubmit={saveFinancialYear}>
          <div className="mb-5">
            <h2 className="text-lg font-black text-[#111827]">{editing ? "Edit Financial Year" : "Add Financial Year"}</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Name is optional. If blank, the system creates a FY label from the dates.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-[#374151]">Name<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="FY 2026-2027" value={form.name} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-[#374151]">Start date<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} required type="date" value={form.startDate} /></label>
              <label className="block text-sm font-bold text-[#374151]">End date<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} required type="date" value={form.endDate} /></label>
            </div>
            <label className="block text-sm font-bold text-[#374151]">Close note<textarea className="mt-2 min-h-[82px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, closeNote: event.target.value }))} placeholder="Year-end notes, payroll close notes, or audit remarks" value={form.closeNote} /></label>

            <div className="rounded-xl bg-[#f8faf9] p-4">
              <p className="mb-3 text-sm font-black text-[#111827]">Applies to</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <CheckField checked={form.payrollYear} label="Payroll" onChange={(checked) => setForm((current) => ({ ...current, payrollYear: checked }))} />
                <CheckField checked={form.leaveYear} label="Leave accrual" onChange={(checked) => setForm((current) => ({ ...current, leaveYear: checked }))} />
                <CheckField checked={form.holidayYear} label="Holiday calendar" onChange={(checked) => setForm((current) => ({ ...current, holidayYear: checked }))} />
                <CheckField checked={form.reportingYear} label="Reports" onChange={(checked) => setForm((current) => ({ ...current, reportingYear: checked }))} />
              </div>
            </div>
            <CheckField checked={form.isActive} label="Set as active financial year" onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
            {editing ? <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Cancel</button> : null}
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5">
            <h2 className="text-lg font-black text-[#111827]">Financial Year List</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Only one financial year can be active for a tenant.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">Year</th>
                  <th className="px-5 py-4">Period</th>
                  <th className="px-5 py-4">Applies To</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Updated</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading financial years...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No financial years found.</td></tr>
                ) : filteredItems.map((item) => (
                  <tr className="hover:bg-[#f8faf9]" key={item.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong>{item.close_note ? <span className="mt-1 block max-w-[220px] truncate text-xs text-[#6b7280]">{item.close_note}</span> : null}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.start_date)} - {formatDate(item.end_date)}</td>
                    <td className="px-5 py-5"><div className="flex flex-wrap gap-2">{usageLabels(item).map((label) => <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]" key={label}>{label}</span>)}</div></td>
                    <td className="px-5 py-5"><div className="flex flex-wrap gap-2">{item.is_active ? <StatusPill tone="green" label="Active" /> : <StatusPill tone="gray" label="Inactive" />}{item.is_locked ? <StatusPill tone="orange" label="Locked" /> : <StatusPill tone="gray" label="Open" />}</div></td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td>
                    <td className="px-5 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151] disabled:opacity-40" disabled={item.is_locked} onClick={() => { setEditing(item); setForm(financialYearToForm(item)); }} title="Edit" type="button">Edit</button>
                        <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151] disabled:opacity-40" disabled={item.is_active || item.is_locked} onClick={() => setActive(item)} title="Set active" type="button">Active</button>
                        <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => setLock(item)} title={item.is_locked ? "Unlock" : "Lock"} type="button">{item.is_locked ? "Unlock" : "Lock"}</button>
                        <button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600 disabled:opacity-40" disabled={item.is_locked} onClick={() => deleteFinancialYear(item)} title="Deactivate" type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-2 block text-2xl text-[#111827]">{value}</strong></div>;
}

function CheckField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 text-sm font-bold text-[#374151]"><input checked={checked} className="h-4 w-4 accent-[#588368]" onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "orange" | "gray" }) {
  const className = tone === "green" ? "bg-[#e9f8ef] text-[#2f6f4f]" : tone === "orange" ? "bg-[#fff4e8] text-[#b45309]" : "bg-[#f3f4f6] text-[#4b5563]";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>;
}

function usageLabels(item: FinancialYear) {
  const labels: string[] = [];
  if (item.payroll_year) labels.push("Payroll");
  if (item.leave_year) labels.push("Leave");
  if (item.holiday_year) labels.push("Holiday");
  if (item.reporting_year) labels.push("Reports");
  return labels.length ? labels : ["None"];
}
