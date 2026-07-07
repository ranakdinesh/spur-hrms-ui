"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type PolicyType = { id: string; tenant_id?: string | null; name: string; is_system: boolean; inactive: boolean; updated_at: string };
type CompanyPolicy = { id: string; tenant_id: string; policy_type_id?: string | null; title: string; file_path?: string | null; description?: string | null; inactive: boolean; updated_at: string };
type PolicyFormState = { title: string; policyTypeID: string; filePath: string; description: string };
type TypeFormState = { name: string };
type TenantSortKey = "name" | "status" | "plan" | "joined";

const emptyPolicyForm: PolicyFormState = { title: "", policyTypeID: "", filePath: "", description: "" };
const emptyTypeForm: TypeFormState = { name: "" };

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function policyToForm(item: CompanyPolicy): PolicyFormState {
  return { title: item.title, policyTypeID: item.policy_type_id || "", filePath: item.file_path || "", description: item.description || "" };
}

function policyPayload(form: PolicyFormState) {
  return { title: form.title.trim(), policy_type_id: form.policyTypeID || null, file_path: form.filePath.trim() || null, description: form.description.trim() || null };
}

function typePayload(form: TypeFormState) { return { name: form.name.trim() }; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
function typeName(item: CompanyPolicy, types: PolicyType[]) { return item.policy_type_id ? types.find((type) => type.id === item.policy_type_id)?.name || "Unknown type" : "Uncategorized"; }

export function PoliciesSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Policies</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. System policy types are shared; tenant policy types stay isolated to the tenant.</p>
        </div>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p></div>
            <div className="flex flex-col gap-3 sm:flex-row"><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} /><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}><option value="name">Sort by name</option><option value="status">Sort by status</option><option value="plan">Sort by plan</option><option value="joined">Sort by joined</option></select></div>
          </div>
          {tenantsError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td><td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Policies</button></td></tr>)}</tbody></table></div>
        </section>
      </div>
    );
  }
  return <PoliciesManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function PoliciesManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<CompanyPolicy[]>([]);
  const [types, setTypes] = useState<PolicyType[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<CompanyPolicy | null>(null);
  const [editingType, setEditingType] = useState<PolicyType | null>(null);
  const [form, setForm] = useState<PolicyFormState>(emptyPolicyForm);
  const [typeForm, setTypeForm] = useState<TypeFormState>(emptyTypeForm);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try { const [policyResult, typeResult] = await Promise.all([apiRequest<CompanyPolicy[]>(`${basePath}/policies`), apiRequest<PolicyType[]>(`${basePath}/policy-types`)]); setItems(policyResult); setTypes(typeResult); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load policies."); }
    finally { setLoading(false); }
  }, [basePath]);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const resolvedType = typeName(item, types);
      const matchesSearch = !query || [item.title, item.description || "", item.file_path || "", resolvedType].some((value) => value.toLowerCase().includes(query));
      const matchesType = !typeFilter || item.policy_type_id === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter, types]);

  function resetPolicyForm() { setEditing(null); setForm(emptyPolicyForm); }
  function resetTypeForm() { setEditingType(null); setTypeForm(emptyTypeForm); }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try { if (editing) { await apiRequest<CompanyPolicy>(`${basePath}/policies/${editing.id}`, { method: "PUT", body: policyPayload(form) }); setMessage("Policy updated."); } else { await apiRequest<CompanyPolicy>(`${basePath}/policies`, { method: "POST", body: policyPayload(form) }); setMessage("Policy created."); } resetPolicyForm(); await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save policy."); }
    finally { setSaving(false); }
  }

  async function saveType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try { if (editingType) { await apiRequest<PolicyType>(`${basePath}/policy-types/${editingType.id}`, { method: "PUT", body: typePayload(typeForm) }); setMessage("Policy type updated."); } else { await apiRequest<PolicyType>(`${basePath}/policy-types`, { method: "POST", body: typePayload(typeForm) }); setMessage("Tenant policy type created."); } resetTypeForm(); await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save policy type."); }
    finally { setSaving(false); }
  }

  async function deletePolicy(item: CompanyPolicy) { if (!window.confirm(`Deactivate ${item.title}?`)) return; setError(""); setMessage(""); try { await apiRequest(`${basePath}/policies/${item.id}`, { method: "DELETE" }); setMessage("Policy deactivated."); await loadData(); if (editing?.id === item.id) resetPolicyForm(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to deactivate policy."); } }
  async function deleteType(item: PolicyType) { if (item.is_system) return; if (!window.confirm(`Deactivate ${item.name}?`)) return; setError(""); setMessage(""); try { await apiRequest(`${basePath}/policy-types/${item.id}`, { method: "DELETE" }); setMessage("Policy type deactivated."); await loadData(); if (editingType?.id === item.id) resetTypeForm(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to deactivate policy type."); } }

  const title = tenant ? `${tenant.name} Policies` : "Policies";
  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div>{onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to tenants</button> : null}<h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Use system policy types or create tenant-specific types. Tenant policy types are visible only to this tenant.</p></div><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search title, type, file" value={search} /></div>
      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}{message ? <p className="mb-5 rounded-lg bg-[#eef9f2] px-4 py-3 text-sm font-semibold text-[#2f6f4f]">{message}</p> : null}
      <div className="mb-6 grid gap-4 lg:grid-cols-4"><Metric label="Policies" value={String(items.length)} /><Metric label="System types" value={String(types.filter((type) => type.is_system).length)} /><Metric label="Tenant types" value={String(types.filter((type) => !type.is_system).length)} /><Metric label="With files" value={String(items.filter((item) => item.file_path).length)} /></div>
      <div className="grid gap-8">
        <div className="space-y-6">
          <form className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" onSubmit={savePolicy}><h2 className="text-lg font-black text-[#111827]">{editing ? "Edit Policy" : "Add Policy"}</h2><div className="mt-5 space-y-4"><label className="block text-sm font-bold text-[#374151]">Title<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required value={form.title} /></label><label className="block text-sm font-bold text-[#374151]">Policy type<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, policyTypeID: event.target.value }))} value={form.policyTypeID}><option value="">Uncategorized</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name} ({type.is_system ? "System" : "Tenant"})</option>)}</select></label><label className="block text-sm font-bold text-[#374151]">File object path<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, filePath: event.target.value }))} placeholder="policies/tenant/policy/file.pdf" value={form.filePath} /></label><label className="block text-sm font-bold text-[#374151]">Choose file metadata<input className="mt-2 block w-full rounded-xl border border-dashed border-[#dbe0e5] p-4 text-sm font-normal" onChange={(event) => { const file = event.target.files?.[0]; if (file) setForm((current) => ({ ...current, filePath: current.filePath || `policies/uploads/${Date.now()}-${file.name}` })); }} type="file" /></label><label className="block text-sm font-bold text-[#374151]">Description<textarea className="mt-2 min-h-28 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} /></label></div><div className="mt-6 flex flex-wrap gap-3"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>{editing ? <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={resetPolicyForm} type="button">Cancel</button> : null}</div></form>
          <form className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" onSubmit={saveType}><h2 className="text-lg font-black text-[#111827]">{editingType ? "Edit Tenant Policy Type" : "Add Tenant Policy Type"}</h2><p className="mt-1 text-sm text-[#6b7280]">System policy types are managed by the platform and are read-only here.</p><div className="mt-5 flex gap-3"><input className="h-11 min-w-0 flex-1 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTypeForm({ name: event.target.value })} placeholder="Custom policy type" required value={typeForm.name} /><button className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white" type="submit">{editingType ? "Update" : "Add"}</button></div>{editingType ? <button className="mt-3 text-sm font-black text-[#588368]" onClick={resetTypeForm} type="button">Cancel type edit</button> : null}</form>
        </div>
        <div className="space-y-6"><PoliciesTable filteredItems={filteredItems} items={items} loading={loading} onDelete={deletePolicy} onEdit={(item) => { setEditing(item); setForm(policyToForm(item)); }} setTypeFilter={setTypeFilter} typeFilter={typeFilter} types={types} /><PolicyTypesTable onDelete={deleteType} onEdit={(type) => { if (type.is_system) return; setEditingType(type); setTypeForm({ name: type.name }); }} types={types} /></div>
      </div>
    </div>
  );
}

function PoliciesTable({ filteredItems, items, loading, onDelete, onEdit, setTypeFilter, typeFilter, types }: { filteredItems: CompanyPolicy[]; items: CompanyPolicy[]; loading: boolean; onDelete: (item: CompanyPolicy) => void; onEdit: (item: CompanyPolicy) => void; setTypeFilter: (value: string) => void; typeFilter: string; types: PolicyType[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black text-[#111827]">Policies List</h2><p className="text-sm text-[#6b7280]">{filteredItems.length} shown from {items.length} active policies.</p></div><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="">All types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Policy</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">File</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading policies...</td></tr> : filteredItems.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No policies found.</td></tr> : filteredItems.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.title}</strong><span className="mt-1 block max-w-[360px] truncate text-xs text-[#6b7280]">{item.description || "No description"}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{typeName(item, types)}</span></td><td className="px-5 py-5 text-sm text-[#4b5563]">{item.file_path || "No file"}</td><td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td><td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => onEdit(item)} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => onDelete(item)} type="button">Delete</button></div></td></tr>)}</tbody></table></div></section>;
}

function PolicyTypesTable({ onDelete, onEdit, types }: { onDelete: (item: PolicyType) => void; onEdit: (item: PolicyType) => void; types: PolicyType[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><h2 className="text-lg font-black text-[#111827]">Policy Types</h2><p className="text-sm text-[#6b7280]">System types are shared across tenants. Tenant types are visible only to this tenant.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Source</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{types.map((type) => <tr className="hover:bg-[#f8faf9]" key={type.id}><td className="px-5 py-4 text-sm font-bold text-[#111827]">{type.name}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${type.is_system ? "bg-[#eef4ff] text-[#315699]" : "bg-[#eef9f2] text-[#2f6f4f]"}`}>{type.is_system ? "System" : "Tenant"}</span></td><td className="px-5 py-4 text-sm text-[#4b5563]">{formatDate(type.updated_at)}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2">{type.is_system ? <span className="rounded-lg bg-[#f8faf9] px-3 py-2 text-xs font-black text-[#6b7280]">Read-only</span> : <><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => onEdit(type)} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => onDelete(type)} type="button">Delete</button></>}</div></td></tr>)}</tbody></table></div></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-2 block text-2xl text-[#111827]">{value}</strong></div>; }
