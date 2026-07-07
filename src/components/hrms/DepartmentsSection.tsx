"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";

type Department = {
  id: string;
  tenant_id: string;
  name: string;
  short_code: string;
  description?: string | null;
  inactive: boolean;
  created_at: string;
  updated_at: string;
};

type DepartmentFormState = {
  name: string;
  shortCode: string;
  description: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const emptyForm: DepartmentFormState = {
  name: "",
  shortCode: "",
  description: "",
};

function departmentToForm(department: Department): DepartmentFormState {
  return {
    name: department.name || "",
    shortCode: department.short_code || "",
    description: department.description || "",
  };
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function cleanDepartmentPayload(form: DepartmentFormState) {
  return {
    name: form.name.trim(),
    short_code: form.shortCode.trim().toUpperCase(),
    description: optionalString(form.description),
  };
}

function formatDepartmentDate(value: string) {
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

export function DepartmentsSection({
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
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Departments</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. Departments are tenant-owned and cannot be managed globally.</p>
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
                      <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Departments</button>
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

  return <DepartmentManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function DepartmentManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DepartmentFormState>(emptyForm);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/departments` : "/hrms/departments";

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<Department[]>(basePath);
      setDepartments(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadDepartments, 0);
    return () => window.clearTimeout(timer);
  }, [loadDepartments]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((department) => [department.name, department.short_code, department.description || ""].some((value) => value.toLowerCase().includes(query)));
  }, [departments, search]);

  function updateField(field: keyof DepartmentFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingDepartment(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(department: Department) {
    setEditingDepartment(department);
    setForm(departmentToForm(department));
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  async function saveDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = cleanDepartmentPayload(form);
    if (!payload.name) {
      setSaving(false);
      setError("Department name is required.");
      return;
    }
    if (!payload.short_code) {
      setSaving(false);
      setError("Department short code is required.");
      return;
    }
    try {
      if (editingDepartment) {
        await apiRequest<Department>(`${basePath}/${editingDepartment.id}`, { method: "PUT", body: payload });
        setMessage("Department updated.");
      } else {
        await apiRequest<Department>(basePath, { method: "POST", body: payload });
        setMessage("Department created.");
      }
      setEditingDepartment(null);
      setForm(emptyForm);
      setFormOpen(false);
      await loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save department.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDepartment(department: Department) {
    if (!window.confirm(`Deactivate ${department.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/${department.id}`, { method: "DELETE" });
      setMessage("Department deactivated.");
      await loadDepartments();
      if (editingDepartment?.id === department.id) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate department.");
    }
  }

  const title = tenant ? `${tenant.name} Departments` : "Departments";
  const description = tenant ? `Managing departments for ${tenant.name}.` : "Manage your tenant departments.";

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">← Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">{description} Departments group employees for HR operations, policies, reporting, attendance, leave, and payroll workflows.</p>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button">New Department</button>
      </div>

      <div className="grid gap-8">
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Department Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredDepartments.length} shown from {departments.length} department{departments.length === 1 ? "" : "s"}</p>
            </div>
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search departments" value={search} />
          </div>

          {error ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="m-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Short Code</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4">Updated</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading departments...</td></tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No departments found.</td></tr>
                ) : filteredDepartments.map((department) => (
                  <tr className="hover:bg-[#f8faf9]" key={department.id}>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4f1] text-sm font-black text-[#588368]">{department.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong className="block text-sm text-[#111827]">{department.name}</strong>
                          <span className="mt-1 block text-xs font-semibold text-[#6b7280]">Code {department.short_code}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{department.short_code}</span></td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{department.description || "-"}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDepartmentDate(department.updated_at)}</td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        <DepartmentIconButton label={`Edit ${department.name}`} onClick={() => openEditForm(department)}><EditIcon /></DepartmentIconButton>
                        <DepartmentIconButton danger label={`Deactivate ${department.name}`} onClick={() => deleteDepartment(department)}><TrashIcon /></DepartmentIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <HrmsModal description="Create or update department metadata without leaving the department grid." onClose={closeForm} open={formOpen} title={editingDepartment ? `Edit ${editingDepartment.name}` : "Create Department"}>
          <form onSubmit={saveDepartment}>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">{editingDepartment ? "Edit Department" : "New Department"}</p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">{editingDepartment ? editingDepartment.name : "Create Department"}</h2>
            <div className="mt-5 grid gap-4">
              <DepartmentField label="Department Name" onChange={(value) => updateField("name", value)} required value={form.name} />
              <DepartmentField label="Short Code" onChange={(value) => updateField("shortCode", value.toUpperCase())} placeholder="HR, IT, FIN" required value={form.shortCode} />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Description</span>
                <textarea className="min-h-28 w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => updateField("description", event.target.value)} value={form.description} />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-semibold text-[#374151]" onClick={closeForm} type="button">Cancel</button>
              <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editingDepartment ? "Save Department" : "Create Department"}</button>
            </div>
          </form>
        </HrmsModal>
      </div>
    </div>
  );
}

function DepartmentField({ label, value, onChange, type = "text", required = false, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} />
    </label>
  );
}

function DepartmentIconButton({ children, danger = false, label, onClick }: { children: ReactNode; danger?: boolean; label: string; onClick: () => void }) {
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
