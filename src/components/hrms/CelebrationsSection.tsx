"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type CelebrationType = { id: string; name: string; is_yearly: boolean; is_user_celebration: boolean };
type EmployeeRow = { user_id: string; employee_code?: string | null; firstname: string; middle_name?: string | null; lastname?: string | null; inactive: boolean };
type BranchRow = { id: string; name: string; inactive: boolean };
type Celebration = {
  id: string;
  branch_id?: string | null;
  user_id?: string | null;
  celebration_type_id: string;
  celebration_type_name: string;
  celebration_date?: string | null;
  custom_title?: string | null;
  description?: string | null;
  is_yearly: boolean;
  is_user_celebration: boolean;
  employee_name?: string | null;
  employee_code?: string | null;
  branch_name?: string | null;
  next_occurrence_date?: string | null;
  days_until_next_occurrence?: number | null;
  updated_at: string;
};

type FormState = { celebrationTypeID: string; userID: string; branchID: string; celebrationDate: string; customTitle: string; description: string };

const emptyForm: FormState = { celebrationTypeID: "", userID: "", branchID: "", celebrationDate: "", customTitle: "", description: "" };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeName(employee: EmployeeRow) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ") || employee.employee_code || employee.user_id;
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function dateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function titleFor(item: Celebration) {
  return item.custom_title || item.employee_name || item.celebration_type_name;
}

export function CelebrationsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Engagement</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Celebrations</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage employee birthdays, anniversaries, company events, and festival reminders.</p></div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Celebrations</button></td></tr>)}</tbody></table></div></section>
      </div>
    );
  }

  return <CelebrationsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function CelebrationsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [types, setTypes] = useState<CelebrationType[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [items, setItems] = useState<Celebration[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Celebration | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selectedType = types.find((type) => type.id === form.celebrationTypeID) || null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [typeRows, employeeRows, branchRows, celebrationRows] = await Promise.all([
        apiRequest<CelebrationType[]>(`${basePath}/celebration-types`),
        apiRequest<EmployeeRow[]>(`${basePath}/employees`),
        apiRequest<BranchRow[]>(`${basePath}/branches`),
        apiRequest<Celebration[]>(`${basePath}/celebrations`),
      ]);
      setTypes(typeRows);
      setEmployees(employeeRows.filter((employee) => !employee.inactive));
      setBranches(branchRows.filter((branch) => !branch.inactive));
      setItems(celebrationRows);
      setForm((current) => ({ ...current, celebrationTypeID: current.celebrationTypeID || typeRows[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load celebrations.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => !query || [titleFor(item), item.celebration_type_name, item.employee_name || "", item.employee_code || "", item.branch_name || ""].some((value) => value.toLowerCase().includes(query)));
  }, [items, search]);

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, celebrationTypeID: types[0]?.id || "" });
  }

  function editItem(item: Celebration) {
    setEditing(item);
    setForm({ celebrationTypeID: item.celebration_type_id, userID: item.user_id || "", branchID: item.branch_id || "", celebrationDate: dateInput(item.celebration_date), customTitle: item.custom_title || "", description: item.description || "" });
  }

  async function saveCelebration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    if (!form.celebrationTypeID || !form.celebrationDate) {
      setSaving(false);
      setError("Celebration type and date are required.");
      return;
    }
    if (selectedType?.is_user_celebration && !form.userID) {
      setSaving(false);
      setError("Employee is required for this celebration type.");
      return;
    }
    const payload = { celebration_type_id: form.celebrationTypeID, user_id: form.userID || null, branch_id: form.branchID || null, celebration_date: form.celebrationDate, custom_title: form.customTitle.trim() || null, description: form.description.trim() || null };
    try {
      if (editing) {
        await apiRequest<Celebration>(`${basePath}/celebrations/${editing.id}`, { method: "PUT", body: payload });
        setMessage("Celebration updated.");
      } else {
        await apiRequest<Celebration>(`${basePath}/celebrations`, { method: "POST", body: payload });
        setMessage("Celebration created.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save celebration.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: Celebration) {
    if (!window.confirm(`Deactivate ${titleFor(item)}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest<void>(`${basePath}/celebrations/${item.id}`, { method: "DELETE" });
      setMessage("Celebration deactivated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate celebration.");
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Engagement</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Celebrations` : "Celebrations"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Create recurring employee celebrations and company events. Upcoming items are sorted by next occurrence.</p></div>
        <div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}<button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">Refresh</button></div>
      </div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#111827]">{editing ? "Edit Celebration" : "Create Celebration"}</h2>
          <form className="mt-5 space-y-4" onSubmit={saveCelebration}>
            <Select label="Type" value={form.celebrationTypeID} onChange={(value) => setForm({ ...form, celebrationTypeID: value, userID: types.find((type) => type.id === value)?.is_user_celebration ? form.userID : "" })} options={types.map((type) => ({ value: type.id, label: `${type.name} (${type.is_yearly ? "Yearly" : "One-time"})` }))} />
            <Select disabled={!selectedType?.is_user_celebration} label="Employee" value={form.userID} onChange={(value) => setForm({ ...form, userID: value })} options={[{ value: "", label: selectedType?.is_user_celebration ? "Select employee" : "Not required" }, ...employees.map((employee) => ({ value: employee.user_id, label: `${employeeName(employee)}${employee.employee_code ? ` (${employee.employee_code})` : ""}` }))]} />
            <Select label="Branch" value={form.branchID} onChange={(value) => setForm({ ...form, branchID: value })} options={[{ value: "", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.name }))]} />
            <label className="block text-sm font-bold text-[#374151]">Date<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, celebrationDate: event.target.value })} type="date" value={form.celebrationDate} /></label>
            <label className="block text-sm font-bold text-[#374151]">Custom title<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, customTitle: event.target.value })} placeholder="Optional display title" value={form.customTitle} /></label>
            <label className="block text-sm font-bold text-[#374151]">Description<textarea className="mt-2 min-h-[86px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional notes" value={form.description} /></label>
            <div className="flex flex-wrap gap-3"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={saving || types.length === 0} type="submit">{saving ? "Saving..." : editing ? "Update Celebration" : "Create Celebration"}</button>{editing ? <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Cancel</button> : null}</div>
          </form>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-[#111827]">Celebration Calendar</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : `${filtered.length} shown from ${items.length}`}</p></div><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[280px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search celebrations" value={search} /></div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? <p className="text-sm font-semibold text-[#6b7280]">Loading celebrations...</p> : filtered.length === 0 ? <p className="text-sm font-semibold text-[#6b7280]">No celebrations found.</p> : filtered.map((item) => (
              <article className="rounded-2xl border border-[#edf1ef] bg-[#fbfcfb] p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{item.celebration_type_name}</span><h3 className="mt-3 text-lg font-black text-[#111827]">{titleFor(item)}</h3></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#374151]">{item.days_until_next_occurrence === 0 ? "Today" : `${item.days_until_next_occurrence ?? "-"}d`}</span></div>
                <p className="mt-3 text-sm font-semibold text-[#6b7280]">Date: {fmtDate(item.celebration_date)} · Next: {fmtDate(item.next_occurrence_date)}</p>
                <p className="mt-2 text-sm font-semibold text-[#6b7280]">{item.employee_code ? `${item.employee_code} · ` : ""}{item.employee_name || (item.is_user_celebration ? "Employee not found" : "Company-wide")}{item.branch_name ? ` · ${item.branch_name}` : ""}</p>
                {item.description ? <p className="mt-3 text-sm leading-6 text-[#6b7280]">{item.description}</p> : null}
                <div className="mt-4 flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => editItem(item)} type="button">Edit</button><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700" onClick={() => void deleteItem(item)} type="button">Deactivate</button></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368] disabled:bg-[#f3f4f6]" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option.value || "empty"} value={option.value}>{option.label}</option>)}</select></label>;
}
