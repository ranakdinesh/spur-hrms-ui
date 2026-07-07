"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";

type Holiday = {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  fy_id?: string | null;
  name: string;
  date: string;
  is_optional: boolean;
  inactive: boolean;
  updated_at: string;
};

type Branch = { id: string; name: string; city?: string | null };
type FinancialYear = { id: string; name: string; start_date: string; end_date: string; is_active: boolean };
type FormState = { name: string; date: string; branchIDs: string[]; fyID: string; isOptional: boolean };
type TenantSortKey = "name" | "status" | "plan" | "joined";

const emptyForm: FormState = { name: "", date: "", branchIDs: [], fyID: "", isOptional: false };

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function itemToForm(item: Holiday): FormState {
  return { name: item.name, date: toDateInput(item.date), branchIDs: item.branch_id ? [item.branch_id] : [], fyID: item.fy_id || "", isOptional: item.is_optional };
}

function payloadFromForm(form: FormState, branchID: string | null) {
  return { name: form.name.trim(), date: form.date, branch_id: branchID || null, fy_id: form.fyID || null, is_optional: form.isOptional };
}

function toDateInput(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", weekday: "short" }).format(date);
}

function monthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

function sameHoliday(item: Holiday, form: FormState, branchID: string | null) {
  return item.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    && toDateInput(item.date) === form.date
    && (item.branch_id || "") === (branchID || "")
    && (item.fy_id || "") === form.fyID
    && item.is_optional === form.isOptional;
}

export function HolidaysSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Holidays</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. Holidays can be global, branch-specific, optional, and tied to a financial year.</p>
        </div>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
              <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}><option value="name">Sort by name</option><option value="status">Sort by status</option><option value="plan">Sort by plan</option><option value="joined">Sort by joined</option></select>
            </div>
          </div>
          {tenantsError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td><td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Holidays</button></td></tr>
                ))}
              </tbody></table>
          </div>
        </section>
      </div>
    );
  }

  return <HolidaysManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function HolidaysManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [search, setSearch] = useState("");
  const [fyFilter, setFYFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [holidayResult, branchResult, fyResult] = await Promise.all([apiRequest<Holiday[]>(`${basePath}/holidays`), apiRequest<Branch[]>(`${basePath}/branches`), apiRequest<FinancialYear[]>(`${basePath}/financial-years`)]);
      setItems(holidayResult);
      setBranches(branchResult);
      setFinancialYears(fyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load holidays.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const branchName = branches.find((branch) => branch.id === item.branch_id)?.name || "All branches";
      const fyName = financialYears.find((fy) => fy.id === item.fy_id)?.name || "No FY";
      const matchesSearch = !query || [item.name, branchName, fyName, formatDate(item.date)].some((value) => value.toLowerCase().includes(query));
      const matchesFY = !fyFilter || item.fy_id === fyFilter;
      const matchesBranch = !branchFilter || item.branch_id === branchFilter;
      const matchesType = typeFilter === "all" || (typeFilter === "optional" ? item.is_optional : !item.is_optional);
      return matchesSearch && matchesFY && matchesBranch && matchesType;
    });
  }, [branchFilter, branches, financialYears, fyFilter, items, search, typeFilter]);

  const grouped = useMemo(() => filteredItems.reduce<Record<string, Holiday[]>>((acc, item) => {
    const key = monthKey(item.date);
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {}), [filteredItems]);

  function resetForm() { setEditing(null); setForm(emptyForm); }
  function openCreateForm() { resetForm(); setFormOpen(true); }
  function openEditForm(item: Holiday) { setEditing(item); setForm(itemToForm(item)); setFormOpen(true); }
  function closeForm() { resetForm(); setFormOpen(false); }

  async function saveHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const targetBranchIDs = form.branchIDs.length > 0 ? form.branchIDs : [""];
      const [primaryBranchID, ...extraBranchIDs] = targetBranchIDs;
      const primaryDuplicate = items.find((item) => item.id !== editing?.id && sameHoliday(item, form, primaryBranchID || null));
      if (primaryDuplicate) {
        throw new Error(`A matching holiday already exists for ${branchName(primaryBranchID, branches)}.`);
      }

      let createdCount = 0;
      let skippedCount = 0;
      if (editing) {
        await apiRequest<Holiday>(`${basePath}/holidays/${editing.id}`, { method: "PUT", body: payloadFromForm(form, primaryBranchID || null) });
      } else {
        await apiRequest<Holiday>(`${basePath}/holidays`, { method: "POST", body: payloadFromForm(form, primaryBranchID || null) });
        createdCount += 1;
      }

      for (const branchID of extraBranchIDs) {
        if (items.some((item) => sameHoliday(item, form, branchID || null))) {
          skippedCount += 1;
          continue;
        }
        await apiRequest<Holiday>(`${basePath}/holidays`, { method: "POST", body: payloadFromForm(form, branchID || null) });
        createdCount += 1;
      }

      if (editing) {
        setMessage(extraBranchIDs.length > 0 ? `Holiday updated and copied to ${createdCount} branch${createdCount === 1 ? "" : "es"}${skippedCount ? `; ${skippedCount} existing branch holiday skipped` : ""}.` : "Holiday updated.");
      } else {
        setMessage(`Holiday created for ${createdCount} branch scope${createdCount === 1 ? "" : "s"}${skippedCount ? `; ${skippedCount} existing branch holiday skipped` : ""}.`);
      }
      resetForm(); setFormOpen(false); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save holiday."); }
    finally { setSaving(false); }
  }

  async function deleteHoliday(item: Holiday) {
    if (!window.confirm(`Deactivate ${item.name}?`)) return;
    setError(""); setMessage("");
    try { await apiRequest(`${basePath}/holidays/${item.id}`, { method: "DELETE" }); setMessage("Holiday deactivated."); await loadData(); if (editing?.id === item.id) closeForm(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to deactivate holiday."); }
  }

  const title = tenant ? `${tenant.name} Holidays` : "Holidays";
  const upcoming = items.filter((item) => new Date(item.date) >= new Date()).length;
  const submitLabel = saving ? "Saving..." : editing ? "Update" : form.branchIDs.length > 1 ? `Create for ${form.branchIDs.length} branches` : "Create";

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>{onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to tenants</button> : null}<h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Maintain the holiday calendar used by attendance and leave rules. Optional holidays and branch calendars stay explicit.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search holiday, branch, FY" value={search} /><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button">New Holiday</button></div>
      </div>
      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg bg-[#eef9f2] px-4 py-3 text-sm font-semibold text-[#2f6f4f]">{message}</p> : null}
      <div className="mb-6 grid gap-4 lg:grid-cols-4"><Metric label="Active holidays" value={String(items.length)} /><Metric label="Upcoming" value={String(upcoming)} /><Metric label="Optional" value={String(items.filter((item) => item.is_optional).length)} /><Metric label="Branch-specific" value={String(items.filter((item) => item.branch_id).length)} /></div>
      <div className="grid gap-8">
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5"><div><h2 className="text-lg font-black text-[#111827]">Holidays List</h2><p className="text-sm text-[#6b7280]">{filteredItems.length} shown from {items.length} active holidays.</p></div><div className="grid gap-3 md:grid-cols-3"><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setFYFilter(event.target.value)} value={fyFilter}><option value="">All financial years</option>{financialYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}</option>)}</select><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setBranchFilter(event.target.value)} value={branchFilter}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="all">Mandatory + optional</option><option value="mandatory">Mandatory only</option><option value="optional">Optional only</option></select></div></div>
          <div className="divide-y divide-[#edf1ef]">{loading ? <p className="p-10 text-center text-sm font-semibold text-[#6b7280]">Loading holidays...</p> : filteredItems.length === 0 ? <p className="p-10 text-center text-sm font-semibold text-[#6b7280]">No holidays found.</p> : Object.entries(grouped).map(([month, rows]) => <div key={month} className="p-5"><h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[#6b7280]">{month}</h3><div className="space-y-3">{rows.map((item) => <div className="flex flex-col gap-3 rounded-2xl border border-[#edf1ef] bg-[#fbfcfb] p-4 md:flex-row md:items-center md:justify-between" key={item.id}><div><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{formatDate(item.date)} - {branchLabel(item, branches)} - {fyLabel(item, financialYears)}</span></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.is_optional ? "bg-[#fff7ed] text-[#b45309]" : "bg-[#eef9f2] text-[#2f6f4f]"}`}>{item.is_optional ? "Optional" : "Mandatory"}</span><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => openEditForm(item)} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => deleteHoliday(item)} type="button">Delete</button></div></div>)}</div></div>)}</div>
        </section>
        <HrmsModal description="Create or update the holiday calendar without hiding the filtered list." onClose={closeForm} open={formOpen} title={editing ? `Edit ${editing.name}` : "Create Holiday"}>
          <form onSubmit={saveHoliday}>
            <h2 className="text-lg font-black text-[#111827]">{editing ? "Edit Holiday" : "Add Holiday"}</h2>
            <div className="mt-5 space-y-4"><label className="block text-sm font-bold text-[#374151]">Holiday name<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Diwali" required value={form.name} /></label><label className="block text-sm font-bold text-[#374151]">Date<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required type="date" value={form.date} /></label><label className="block text-sm font-bold text-[#374151]">Financial year<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, fyID: event.target.value }))} value={form.fyID}><option value="">None</option>{financialYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}{fy.is_active ? " (active)" : ""}</option>)}</select></label><BranchMultiSelect branches={branches} selectedIDs={form.branchIDs} onChange={(branchIDs) => setForm((current) => ({ ...current, branchIDs }))} /><label className="flex items-center gap-3 text-sm font-bold text-[#374151]"><input checked={form.isOptional} className="h-4 w-4 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, isOptional: event.target.checked }))} type="checkbox" />Optional holiday</label></div>
            <div className="mt-6 flex flex-wrap justify-end gap-3"><button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={closeForm} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{submitLabel}</button></div>
          </form>
        </HrmsModal>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-2 block text-2xl text-[#111827]">{value}</strong></div>; }
function branchLabel(item: Holiday, branches: Branch[]) { return item.branch_id ? branches.find((branch) => branch.id === item.branch_id)?.name || item.branch_id : "All branches"; }
function fyLabel(item: Holiday, financialYears: FinancialYear[]) { return item.fy_id ? financialYears.find((fy) => fy.id === item.fy_id)?.name || item.fy_id : "No FY"; }
function branchName(branchID: string, branches: Branch[]) { return branchID ? branches.find((branch) => branch.id === branchID)?.name || "selected branch" : "All branches"; }

function BranchMultiSelect({ branches, onChange, selectedIDs }: { branches: Branch[]; onChange: (value: string[]) => void; selectedIDs: string[] }) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIDs), [selectedIDs]);
  const allBranchesSelected = branches.length > 0 && selectedIDs.length === branches.length;
  const summary = selectedIDs.length === 0 ? "Company-wide holiday" : allBranchesSelected ? "All branches selected" : selectedIDs.length === 1 ? branchName(selectedIDs[0], branches) : `${selectedIDs.length} branches selected`;

  function toggleBranch(branchID: string) {
    if (selectedSet.has(branchID)) {
      onChange(selectedIDs.filter((id) => id !== branchID));
      return;
    }
    onChange([...selectedIDs, branchID]);
  }

  function toggleAllBranches() {
    onChange(allBranchesSelected ? [] : branches.map((branch) => branch.id));
  }

  return (
    <div className="relative">
      <span className="block text-sm font-bold text-[#374151]">Branches</span>
      <button aria-expanded={open} className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-[#dbe0e5] bg-white px-4 text-left text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]" onClick={() => setOpen((current) => !current)} type="button">
        <span>{summary}</span>
        <span className="text-xs text-[#6b7280]">{open ? "Close" : "Choose"}</span>
      </button>
      {open ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#dbe0e5] bg-white p-2 shadow-xl">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f8faf9]">
            <input checked={allBranchesSelected} className="h-4 w-4 accent-[#588368]" disabled={branches.length === 0} onChange={toggleAllBranches} type="checkbox" />
            All branches
          </label>
          <div className="my-2 border-t border-[#edf1ef]" />
          {branches.length === 0 ? <p className="px-3 py-3 text-sm font-semibold text-[#6b7280]">No branches available.</p> : null}
          {branches.map((branch) => (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f8faf9]" key={branch.id}>
              <input checked={selectedSet.has(branch.id)} className="mt-0.5 h-4 w-4 accent-[#588368]" onChange={() => toggleBranch(branch.id)} type="checkbox" />
              <span><span className="block">{branch.name}</span>{branch.city ? <span className="block text-xs font-medium text-[#6b7280]">{branch.city}</span> : null}</span>
            </label>
          ))}
          {branches.length > 0 ? <div className="mt-2 flex justify-between gap-2 border-t border-[#edf1ef] pt-2"><button className="rounded-lg px-3 py-2 text-xs font-black text-[#588368]" onClick={() => onChange(branches.map((branch) => branch.id))} type="button">Select all</button><button className="rounded-lg px-3 py-2 text-xs font-black text-[#6b7280]" onClick={() => onChange([])} type="button">Company-wide</button></div> : null}
        </div>
      ) : null}
    </div>
  );
}
