"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type LookupItem = {
  id: string;
  tenant_id: string;
  name: string;
  inactive: boolean;
  created_at: string;
  updated_at: string;
};

type LookupFormState = {
  name: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

type LookupKind = "employment" | "marital";

const emptyForm: LookupFormState = { name: "" };

function lookupToForm(item: LookupItem): LookupFormState {
  return { name: item.name || "" };
}

function cleanLookupPayload(form: LookupFormState) {
  return { name: form.name.trim() };
}

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function EmploymentLookupsSection({
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
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Employment Lookups</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. Employment type and marital status values are tenant-owned setup masters.</p>
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
                          <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} · {tenant.kind}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.joined}</td>
                    <td className="px-5 py-5 text-right">
                      <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Lookups</button>
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

  return <LookupManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function LookupManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [employmentTypes, setEmploymentTypes] = useState<LookupItem[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<LookupItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingEmploymentType, setEditingEmploymentType] = useState<LookupItem | null>(null);
  const [editingMaritalStatus, setEditingMaritalStatus] = useState<LookupItem | null>(null);
  const [employmentForm, setEmploymentForm] = useState<LookupFormState>(emptyForm);
  const [maritalForm, setMaritalForm] = useState<LookupFormState>(emptyForm);
  const employmentPath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/employment-types` : "/hrms/employment-types";
  const maritalPath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/marital-statuses` : "/hrms/marital-statuses";

  const loadLookups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [employmentResult, maritalResult] = await Promise.all([
        apiRequest<LookupItem[]>(employmentPath),
        apiRequest<LookupItem[]>(maritalPath),
      ]);
      setEmploymentTypes(employmentResult);
      setMaritalStatuses(maritalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load employment lookups.");
    } finally {
      setLoading(false);
    }
  }, [employmentPath, maritalPath]);

  useEffect(() => {
    const timer = window.setTimeout(loadLookups, 0);
    return () => window.clearTimeout(timer);
  }, [loadLookups]);

  const filteredEmploymentTypes = useMemo(() => filterLookups(employmentTypes, search), [employmentTypes, search]);
  const filteredMaritalStatuses = useMemo(() => filterLookups(maritalStatuses, search), [maritalStatuses, search]);
  const title = tenant ? `${tenant.name} Employment Lookups` : "Employment Lookups";
  const description = tenant ? `Managing lookup values for ${tenant.name}.` : "Manage your tenant lookup values.";

  function resetEmploymentForm() {
    setEditingEmploymentType(null);
    setEmploymentForm(emptyForm);
  }

  function resetMaritalForm() {
    setEditingMaritalStatus(null);
    setMaritalForm(emptyForm);
  }

  async function saveLookup(event: FormEvent<HTMLFormElement>, kind: LookupKind) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const isEmployment = kind === "employment";
    const form = isEmployment ? employmentForm : maritalForm;
    const editing = isEmployment ? editingEmploymentType : editingMaritalStatus;
    const basePath = isEmployment ? employmentPath : maritalPath;
    const label = isEmployment ? "Employment type" : "Marital status";
    const payload = cleanLookupPayload(form);
    if (!payload.name) {
      setSaving(false);
      setError(`${label} name is required.`);
      return;
    }
    try {
      if (editing) {
        await apiRequest<LookupItem>(`${basePath}/${editing.id}`, { method: "PUT", body: payload });
        setMessage(`${label} updated.`);
      } else {
        await apiRequest<LookupItem>(basePath, { method: "POST", body: payload });
        setMessage(`${label} created.`);
      }
      if (isEmployment) resetEmploymentForm();
      else resetMaritalForm();
      await loadLookups();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to save ${label.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLookup(item: LookupItem, kind: LookupKind) {
    const isEmployment = kind === "employment";
    const basePath = isEmployment ? employmentPath : maritalPath;
    const label = isEmployment ? "employment type" : "marital status";
    if (!window.confirm(`Deactivate ${item.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/${item.id}`, { method: "DELETE" });
      setMessage(`${titleCase(label)} deactivated.`);
      await loadLookups();
      if (isEmployment && editingEmploymentType?.id === item.id) resetEmploymentForm();
      if (!isEmployment && editingMaritalStatus?.id === item.id) resetMaritalForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to deactivate ${label}.`);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">← Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">{description} Defaults are seeded automatically, and tenants can rename, add, or deactivate values.</p>
        </div>
        <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search lookup values" value={search} />
      </div>

      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

      <div className="grid gap-8">
        <LookupPanel
          emptyLabel="No employment types found."
          form={employmentForm}
          isEditing={Boolean(editingEmploymentType)}
          items={filteredEmploymentTypes}
          loading={loading}
          onClear={resetEmploymentForm}
          onDelete={(item) => deleteLookup(item, "employment")}
          onEdit={(item) => { setEditingEmploymentType(item); setEmploymentForm(lookupToForm(item)); setError(""); setMessage(""); }}
          onNameChange={(value) => setEmploymentForm({ name: value })}
          onSubmit={(event) => saveLookup(event, "employment")}
          saving={saving}
          title="Employment Types"
          subtitle="Examples: Permanent, Probation, Contract, Consultant, Intern, Part-time."
        />
        <LookupPanel
          emptyLabel="No marital statuses found."
          form={maritalForm}
          isEditing={Boolean(editingMaritalStatus)}
          items={filteredMaritalStatuses}
          loading={loading}
          onClear={resetMaritalForm}
          onDelete={(item) => deleteLookup(item, "marital")}
          onEdit={(item) => { setEditingMaritalStatus(item); setMaritalForm(lookupToForm(item)); setError(""); setMessage(""); }}
          onNameChange={(value) => setMaritalForm({ name: value })}
          onSubmit={(event) => saveLookup(event, "marital")}
          saving={saving}
          title="Marital Statuses"
          subtitle="Examples: Single, Married, Divorced, Widowed, Separated."
        />
      </div>
    </div>
  );
}

function filterLookups(items: LookupItem[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => item.name.toLowerCase().includes(query));
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function LookupPanel({
  emptyLabel,
  form,
  isEditing,
  items,
  loading,
  onClear,
  onDelete,
  onEdit,
  onNameChange,
  onSubmit,
  saving,
  subtitle,
  title,
}: {
  emptyLabel: string;
  form: LookupFormState;
  isEditing: boolean;
  items: LookupItem[];
  loading: boolean;
  onClear: () => void;
  onDelete: (item: LookupItem) => void;
  onEdit: (item: LookupItem) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
      <div className="border-b border-[#edf1ef] p-5">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Lookup Master</p>
        <h2 className="mt-2 text-2xl font-black text-[#111827]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">{subtitle}</p>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border border-[#edf1ef]">
          <table className="w-full min-w-[520px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-sm font-semibold text-[#6b7280]" colSpan={3}>Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-sm font-semibold text-[#6b7280]" colSpan={3}>{emptyLabel}</td></tr>
              ) : items.map((item) => (
                <tr className="hover:bg-[#f8faf9]" key={item.id}>
                  <td className="px-4 py-4 text-sm font-black text-[#111827]">{item.name}</td>
                  <td className="px-4 py-4 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <IconButton label={`Edit ${item.name}`} onClick={() => onEdit(item)}><EditIcon /></IconButton>
                      <IconButton danger label={`Deactivate ${item.name}`} onClick={() => onDelete(item)}><TrashIcon /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="rounded-xl bg-[#f8faf9] p-4" onSubmit={onSubmit}>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#588368]">{isEditing ? "Edit" : "Create"}</p>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-[#111827]">Name</span>
            <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => onNameChange(event.target.value)} required value={form.name} />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button className="rounded-lg border border-[#dbe0e5] bg-white px-3 py-2 text-xs font-bold text-[#374151]" onClick={onClear} type="button">Clear</button>
            <button className="rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : isEditing ? "Save" : "Create"}</button>
          </div>
        </form>
      </div>
    </section>
  );
}

function IconButton({ children, danger = false, label, onClick }: { children: ReactNode; danger?: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${danger ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border-[#dbe0e5] bg-white text-[#374151] hover:border-[#588368] hover:bg-[#f4fbf8] hover:text-[#588368]"}`} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m12 20 9-9-8-8-9 9-2 10 10-2Z" />
      <path d="m14 5 5 5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
