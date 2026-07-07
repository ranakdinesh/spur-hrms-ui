"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type CelebrationType = {
  id: string;
  tenant_id: string;
  name: string;
  is_yearly: boolean;
  is_user_celebration: boolean;
  inactive: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  isYearly: boolean;
  isUserCelebration: boolean;
};

const emptyForm: FormState = { name: "", isYearly: true, isUserCelebration: true };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function toForm(item: CelebrationType): FormState {
  return { name: item.name, isYearly: item.is_yearly, isUserCelebration: item.is_user_celebration };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function CelebrationTypesSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Celebration Types</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage birthday, anniversary, festival, and event type masters.</p>
          </div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Types</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <CelebrationTypeManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function CelebrationTypeManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/celebration-types` : "/hrms/celebration-types";
  const [items, setItems] = useState<CelebrationType[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<CelebrationType | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await apiRequest<CelebrationType[]>(basePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load celebration types.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadItems, 0);
    return () => window.clearTimeout(timer);
  }, [loadItems]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => !query || [item.name, item.is_yearly ? "yearly" : "one time", item.is_user_celebration ? "user" : "tenant"].some((value) => value.toLowerCase().includes(query)));
  }, [items, search]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function saveType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = { name: form.name.trim(), is_yearly: form.isYearly, is_user_celebration: form.isUserCelebration };
    if (!payload.name) {
      setSaving(false);
      setError("Celebration type name is required.");
      return;
    }
    try {
      if (editing) {
        await apiRequest<CelebrationType>(`${basePath}/${editing.id}`, { method: "PUT", body: payload });
        setMessage("Celebration type updated.");
      } else {
        await apiRequest<CelebrationType>(basePath, { method: "POST", body: payload });
        setMessage("Celebration type created.");
      }
      resetForm();
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save celebration type.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteType(item: CelebrationType) {
    if (!window.confirm(`Deactivate ${item.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest<void>(`${basePath}/${item.id}`, { method: "DELETE" });
      setMessage("Celebration type deactivated.");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate celebration type.");
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Celebration Types` : "Celebration Types"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Configure reusable celebration masters. User celebrations attach to employees; tenant celebrations are company-wide events.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
          <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void loadItems()} type="button">Refresh</button>
        </div>
      </div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#111827]">{editing ? "Edit Type" : "Create Type"}</h2>
          <form className="mt-5 space-y-4" onSubmit={saveType}>
            <label className="block text-sm font-bold text-[#374151]">Name<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Birthday" value={form.name} /></label>
            <label className="flex min-h-[48px] items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.isYearly} onChange={(event) => setForm({ ...form, isYearly: event.target.checked })} type="checkbox" />Repeats every year</label>
            <label className="flex min-h-[48px] items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.isUserCelebration} onChange={(event) => setForm({ ...form, isUserCelebration: event.target.checked })} type="checkbox" />Linked to employee/user</label>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update Type" : "Create Type"}</button>
              {editing ? <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Cancel</button> : null}
            </div>
          </form>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-black text-[#111827]">Configured Types</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : `${filtered.length} shown from ${items.length}`}</p></div>
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[280px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search types" value={search} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Recurrence</th><th className="px-5 py-4">Scope</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading celebration types...</td></tr> : filtered.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No celebration types found.</td></tr> : filtered.map((item) => (
                  <tr className="hover:bg-[#f8faf9]" key={item.id}>
                    <td className="px-5 py-5"><strong className="text-sm text-[#111827]">{item.name}</strong></td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{item.is_yearly ? "Yearly" : "One-time"}</span></td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4f7fb] px-3 py-1 text-xs font-black text-[#374151]">{item.is_user_celebration ? "Employee" : "Company"}</span></td>
                    <td className="px-5 py-5 text-sm text-[#6b7280]">{formatDate(item.updated_at)}</td>
                    <td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => { setEditing(item); setForm(toForm(item)); }} type="button">Edit</button><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700" onClick={() => void deleteType(item)} type="button">Deactivate</button></div></td>
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
