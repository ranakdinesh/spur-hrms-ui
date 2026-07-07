"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import { HrmsModal } from "@/components/hrms/HrmsModal";

type Branch = {
  id: string;
  tenant_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  phone?: string | null;
  branch_manager_user_id?: string | null;
  hr_user_id?: string | null;
  accounts_user_id?: string | null;
  inactive: boolean;
  created_at: string;
  updated_at: string;
};

type BranchUserOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string | null;
};

export type BranchTenantOption = {
  id: string;
  name: string;
  code: string;
  kind: string;
  subdomainUrl: string;
  status: string;
  plan: string;
  joined: string;
};

type BranchFormState = {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  branch_manager_user_id: string;
  hr_user_id: string;
  accounts_user_id: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const emptyForm: BranchFormState = {
  name: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  phone: "",
  branch_manager_user_id: "",
  hr_user_id: "",
  accounts_user_id: "",
};

function branchToForm(branch: Branch): BranchFormState {
  return {
    name: branch.name || "",
    address: branch.address || "",
    city: branch.city || "",
    state: branch.state || "",
    country: branch.country || "",
    pincode: branch.pincode || "",
    phone: branch.phone || "",
    branch_manager_user_id: branch.branch_manager_user_id || "",
    hr_user_id: branch.hr_user_id || "",
    accounts_user_id: branch.accounts_user_id || "",
  };
}

function cleanBranchPayload(form: BranchFormState) {
  return {
    name: form.name.trim(),
    address: optionalString(form.address),
    city: optionalString(form.city),
    state: optionalString(form.state),
    country: optionalString(form.country),
    pincode: optionalString(form.pincode),
    phone: optionalString(form.phone),
    branch_manager_user_id: optionalString(form.branch_manager_user_id),
    hr_user_id: optionalString(form.hr_user_id),
    accounts_user_id: optionalString(form.accounts_user_id),
  };
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function formatBranchDate(value: string) {
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

export function BranchesSection({
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
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Branches</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. Branches are tenant-owned, so super admins manage them inside a specific tenant context.</p>
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
                      <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Branches</button>
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

  return <BranchManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function BranchManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<BranchFormState>(emptyForm);
  const [users, setUsers] = useState<BranchUserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/branches` : "/hrms/branches";
  const usersPath = isSuperAdmin && tenant ? `/tenants/${tenant.id}/users` : "/users/";

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<Branch[]>(basePath);
      setBranches(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load branches.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const result = await apiRequest<BranchUserOption[]>(usersPath);
      setUsers(result);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPath]);

  useEffect(() => {
    const timer = window.setTimeout(loadBranches, 0);
    return () => window.clearTimeout(timer);
  }, [loadBranches]);

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const userLabels = useMemo(() => {
    const labels = new Map<string, string>();
    users.forEach((user) => {
      const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
      labels.set(user.id, name);
    });
    return labels;
  }, [users]);

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return branches;
    return branches.filter((branch) =>
      [
        branch.name,
        branch.address || "",
        branch.city || "",
        branch.state || "",
        branch.country || "",
        branch.pincode || "",
        branch.phone || "",
        branch.branch_manager_user_id ? userLabels.get(branch.branch_manager_user_id) || "" : "",
        branch.hr_user_id ? userLabels.get(branch.hr_user_id) || "" : "",
        branch.accounts_user_id ? userLabels.get(branch.accounts_user_id) || "" : "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [branches, search, userLabels]);

  function updateField(field: keyof BranchFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingBranch(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(branch: Branch) {
    setEditingBranch(branch);
    setForm(branchToForm(branch));
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = cleanBranchPayload(form);
    if (!payload.name) {
      setSaving(false);
      setError("Branch name is required.");
      return;
    }
    try {
      if (editingBranch) {
        await apiRequest<Branch>(`${basePath}/${editingBranch.id}`, { method: "PUT", body: payload });
        setMessage("Branch updated.");
      } else {
        await apiRequest<Branch>(basePath, { method: "POST", body: payload });
        setMessage("Branch created.");
      }
      setEditingBranch(null);
      setForm(emptyForm);
      setFormOpen(false);
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save branch.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBranch(branch: Branch) {
    if (!window.confirm(`Deactivate ${branch.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/${branch.id}`, { method: "DELETE" });
      setMessage("Branch deactivated.");
      await loadBranches();
      if (editingBranch?.id === branch.id) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate branch.");
    }
  }

  const title = tenant ? `${tenant.name} Branches` : "Branches";
  const description = tenant ? `Managing branches for ${tenant.name}.` : "Manage your tenant branch locations.";

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">← Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">{description} Branches are used by employees, holidays, working hours, attendance, and celebrations.</p>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button">New Branch</button>
      </div>

      <div className="grid gap-8">
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Branch Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredBranches.length} shown from {branches.length} branch{branches.length === 1 ? "" : "es"}</p>
            </div>
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search branches" value={search} />
          </div>

          {error ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="m-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">Branch</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Linked Employees</th>
                  <th className="px-5 py-4">Updated</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading branches...</td></tr>
                ) : filteredBranches.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No branches found.</td></tr>
                ) : filteredBranches.map((branch) => (
                  <tr className="hover:bg-[#f8faf9]" key={branch.id}>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4f1] text-sm font-black text-[#588368]">{branch.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong className="block text-sm text-[#111827]">{branch.name}</strong>
                          <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{branch.address || "Address not set"}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{[branch.city, branch.state, branch.country].filter(Boolean).join(", ") || "-"}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{branch.phone || "-"}{branch.pincode ? <span className="block text-xs font-semibold text-[#9ca3af]">PIN {branch.pincode}</span> : null}</td>
                    <td className="px-5 py-5 text-xs text-[#4b5563]">
                      <BranchRoleLine label="Manager" userID={branch.branch_manager_user_id} userLabels={userLabels} />
                      <BranchRoleLine label="HR" userID={branch.hr_user_id} userLabels={userLabels} />
                      <BranchRoleLine label="Accounts" userID={branch.accounts_user_id} userLabels={userLabels} />
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{formatBranchDate(branch.updated_at)}</td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        <BranchIconButton label={`Edit ${branch.name}`} onClick={() => openEditForm(branch)}><EditIcon /></BranchIconButton>
                        <BranchIconButton danger label={`Deactivate ${branch.name}`} onClick={() => deleteBranch(branch)}><TrashIcon /></BranchIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <HrmsModal description="Create or update branch details without losing the grid context." onClose={closeForm} open={formOpen} title={editingBranch ? `Edit ${editingBranch.name}` : "Create Branch"}>
          <form onSubmit={saveBranch}>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">{editingBranch ? "Edit Branch" : "New Branch"}</p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">{editingBranch ? editingBranch.name : "Create Branch"}</h2>
            <div className="mt-5 grid gap-4">
              <BranchField label="Branch Name" onChange={(value) => updateField("name", value)} required value={form.name} />
              <BranchField label="Address" onChange={(value) => updateField("address", value)} value={form.address} />
              <div className="grid gap-4 sm:grid-cols-2">
                <BranchField label="City" onChange={(value) => updateField("city", value)} value={form.city} />
                <BranchField label="State" onChange={(value) => updateField("state", value)} value={form.state} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <BranchField label="Country" onChange={(value) => updateField("country", value)} value={form.country} />
                <BranchField label="Pincode" onChange={(value) => updateField("pincode", value)} value={form.pincode} />
              </div>
              <BranchField label="Phone" onChange={(value) => updateField("phone", value)} type="tel" value={form.phone} />
              <div className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4">
                <h3 className="text-sm font-black text-[#111827]">Linked Employees</h3>
                <p className="mt-1 text-xs leading-5 text-[#6b7280]">Assign tenant users for future branch-level approvals, HR operations, and accounts workflows.</p>
                <div className="mt-4 grid gap-4">
                  <BranchUserSelect label="Branch Manager" loading={usersLoading} onChange={(value) => updateField("branch_manager_user_id", value)} users={users} value={form.branch_manager_user_id} />
                  <BranchUserSelect label="HR" loading={usersLoading} onChange={(value) => updateField("hr_user_id", value)} users={users} value={form.hr_user_id} />
                  <BranchUserSelect label="Accounts" loading={usersLoading} onChange={(value) => updateField("accounts_user_id", value)} users={users} value={form.accounts_user_id} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-semibold text-[#374151]" onClick={closeForm} type="button">Cancel</button>
              <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editingBranch ? "Save Branch" : "Create Branch"}</button>
            </div>
          </form>
        </HrmsModal>
      </div>
    </div>
  );
}

function BranchRoleLine({ label, userID, userLabels }: { label: string; userID?: string | null; userLabels: Map<string, string> }) {
  return (
    <span className="block">
      <strong className="text-[#111827]">{label}:</strong> {userID ? userLabels.get(userID) || "Assigned user" : "Not assigned"}
    </span>
  );
}

function BranchUserSelect({
  label,
  loading,
  users,
  value,
  onChange,
}: {
  label: string;
  loading: boolean;
  users: BranchUserOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <select className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 outline-none focus:border-[#588368]" disabled={loading} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{loading ? "Loading users..." : "Not assigned"}</option>
        {users.map((user) => {
          const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
          return <option key={user.id} value={user.id}>{name} · {user.email}</option>;
        })}
      </select>
    </label>
  );
}

function BranchField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} />
    </label>
  );
}

function BranchIconButton({ children, danger = false, label, onClick }: { children: ReactNode; danger?: boolean; label: string; onClick: () => void }) {
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
