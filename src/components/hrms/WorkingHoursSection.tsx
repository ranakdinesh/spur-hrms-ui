"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type WorkingHour = {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  user_id?: string | null;
  day_of_week: string;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  break_minutes: number;
  source?: string;
  inactive: boolean;
  updated_at: string;
};

type Branch = {
  id: string;
  name: string;
  city?: string | null;
};

type UserOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type FormState = {
  scope: "tenant" | "branch" | "user";
  branchID: string;
  userID: string;
  dayOfWeek: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  breakMinutes: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const emptyForm: FormState = { scope: "tenant", branchID: "", userID: "", dayOfWeek: "Monday", isWorkingDay: true, startTime: "09:00", endTime: "18:00", breakMinutes: "60" };

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function itemToForm(item: WorkingHour): FormState {
  return {
    scope: item.user_id ? "user" : item.branch_id ? "branch" : "tenant",
    branchID: item.branch_id || "",
    userID: item.user_id || "",
    dayOfWeek: item.day_of_week,
    isWorkingDay: item.is_working_day,
    startTime: item.start_time || "09:00",
    endTime: item.end_time || "18:00",
    breakMinutes: String(item.break_minutes ?? 0),
  };
}

function payloadFromForm(form: FormState) {
  return {
    branch_id: form.scope === "branch" ? form.branchID || null : null,
    user_id: form.scope === "user" ? form.userID || null : null,
    day_of_week: form.dayOfWeek,
    is_working_day: form.isWorkingDay,
    start_time: form.isWorkingDay ? form.startTime : "00:00",
    end_time: form.isWorkingDay ? form.endTime : "00:00",
    break_minutes: form.isWorkingDay ? Number(form.breakMinutes || 0) : 0,
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function WorkingHoursSection({
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Working Hours</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. Working hours support tenant defaults, branch overrides, and user-specific overrides.</p>
        </div>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p>
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
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Hours</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <WorkingHoursManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function WorkingHoursManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<WorkingHour[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [copyBranchID, setCopyBranchID] = useState("");
  const [resolveDay, setResolveDay] = useState("Monday");
  const [resolveBranchID, setResolveBranchID] = useState("");
  const [resolveUserID, setResolveUserID] = useState("");
  const [resolved, setResolved] = useState<WorkingHour | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<WorkingHour | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const identityUsersPath = isSuperAdmin && tenant ? `/tenants/${tenant.id}/users` : "";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hourResult, branchResult] = await Promise.all([apiRequest<WorkingHour[]>(`${basePath}/working-hours`), apiRequest<Branch[]>(`${basePath}/branches`)]);
      setItems(hourResult);
      setBranches(branchResult);
      if (identityUsersPath) {
        try {
          setUsers(await apiRequest<UserOption[]>(identityUsersPath));
        } catch {
          setUsers([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load working hours.");
    } finally {
      setLoading(false);
    }
  }, [basePath, identityUsersPath]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const scope = item.user_id ? "user" : item.branch_id ? "branch" : "tenant";
      const branch = branches.find((row) => row.id === item.branch_id)?.name || "";
      const user = userName(users.find((row) => row.id === item.user_id));
      const matchesScope = scopeFilter === "all" || scopeFilter === scope;
      const matchesSearch = !query || [item.day_of_week, scope, branch, user, item.start_time, item.end_time].some((value) => value.toLowerCase().includes(query));
      return matchesScope && matchesSearch;
    });
  }, [branches, items, scopeFilter, search, users]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function saveWorkingHour(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = payloadFromForm(form);
    if (form.scope === "branch" && !payload.branch_id) {
      setSaving(false);
      setError("Select a branch for branch-specific working hours.");
      return;
    }
    if (form.scope === "user" && !payload.user_id) {
      setSaving(false);
      setError("Enter or select a user for user-specific working hours.");
      return;
    }
    try {
      if (editing) {
        await apiRequest<WorkingHour>(`${basePath}/working-hours/${editing.id}`, { method: "PUT", body: payload });
        setMessage("Working hour updated.");
      } else {
        await apiRequest<WorkingHour>(`${basePath}/working-hours`, { method: "POST", body: payload });
        setMessage("Working hour created.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save working hour.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkingHour(item: WorkingHour) {
    if (!window.confirm(`Deactivate ${item.day_of_week} working hour?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/working-hours/${item.id}`, { method: "DELETE" });
      setMessage("Working hour deactivated.");
      await loadData();
      if (editing?.id === item.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate working hour.");
    }
  }

  async function copyToBranch() {
    if (!copyBranchID) {
      setError("Select a branch before copying tenant defaults.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await apiRequest<WorkingHour[]>(`${basePath}/working-hours/copy-to-branch`, { method: "POST", body: { branch_id: copyBranchID } });
      setMessage("Tenant default working hours copied to branch.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to copy working hours.");
    }
  }

  async function resolveWorkingHour() {
    setResolved(null);
    setError("");
    const params = new URLSearchParams({ day_of_week: resolveDay });
    if (resolveBranchID) params.set("branch_id", resolveBranchID);
    if (resolveUserID) params.set("user_id", resolveUserID);
    try {
      setResolved(await apiRequest<WorkingHour>(`${basePath}/working-hours/resolve?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resolve working hour.");
    }
  }

  const title = tenant ? `${tenant.name} Working Hours` : "Working Hours";

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Configure tenant defaults first. Branch and user rows override those defaults during attendance status resolution.</p>
        </div>
        <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search day, scope, branch, user" value={search} />
      </div>

      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg bg-[#eef9f2] px-4 py-3 text-sm font-semibold text-[#2f6f4f]">{message}</p> : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <SetupCard label="Tenant defaults" value={String(items.filter((item) => !item.branch_id && !item.user_id).length)} />
        <SetupCard label="Branch overrides" value={String(items.filter((item) => item.branch_id && !item.user_id).length)} />
        <SetupCard label="User overrides" value={String(items.filter((item) => item.user_id).length)} />
      </div>

      <div className="grid gap-8">
        <div className="space-y-6">
          <form className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" onSubmit={saveWorkingHour}>
            <h2 className="text-lg font-black text-[#111827]">{editing ? "Edit Working Hour" : "Add Working Hour"}</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-[#374151]">Scope<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as FormState["scope"], branchID: "", userID: "" }))} value={form.scope}><option value="tenant">Tenant default</option><option value="branch">Branch override</option><option value="user">User override</option></select></label>
              {form.scope === "branch" ? <BranchSelect branches={branches} label="Branch" onChange={(value) => setForm((current) => ({ ...current, branchID: value }))} value={form.branchID} /> : null}
              {form.scope === "user" ? <UserSelector onChange={(value) => setForm((current) => ({ ...current, userID: value }))} users={users} value={form.userID} /> : null}
              <label className="block text-sm font-bold text-[#374151]">Day<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))} value={form.dayOfWeek}>{days.map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
              <label className="flex items-center gap-3 text-sm font-bold text-[#374151]"><input checked={form.isWorkingDay} className="h-4 w-4 accent-[#588368]" onChange={(event) => setForm((current) => ({ ...current, isWorkingDay: event.target.checked }))} type="checkbox" />Working day</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-[#374151]">Start<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" disabled={!form.isWorkingDay} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} type="time" value={form.startTime} /></label>
                <label className="block text-sm font-bold text-[#374151]">End<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" disabled={!form.isWorkingDay} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} type="time" value={form.endTime} /></label>
              </div>
              <label className="block text-sm font-bold text-[#374151]">Break minutes<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" disabled={!form.isWorkingDay} min="0" onChange={(event) => setForm((current) => ({ ...current, breakMinutes: event.target.value }))} type="number" value={form.breakMinutes} /></label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>{editing ? <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Cancel</button> : null}</div>
          </form>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Copy To Branch</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Copies tenant default rows to a branch and replaces existing branch-level rows.</p>
            <div className="mt-4 flex gap-3"><select className="h-11 min-w-0 flex-1 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setCopyBranchID(event.target.value)} value={copyBranchID}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><button className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white" onClick={copyToBranch} type="button">Copy</button></div>
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Resolve Preview</h2>
            <div className="mt-4 space-y-3"><select className="h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setResolveDay(event.target.value)} value={resolveDay}>{days.map((day) => <option key={day} value={day}>{day}</option>)}</select><BranchSelect branches={branches} label="Branch optional" onChange={setResolveBranchID} value={resolveBranchID} /><UserSelector onChange={setResolveUserID} users={users} value={resolveUserID} /><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={resolveWorkingHour} type="button">Resolve</button></div>
            {resolved ? <p className="mt-4 rounded-xl bg-[#f8faf9] p-4 text-sm font-semibold text-[#374151]">{resolved.day_of_week}: {resolved.is_working_day ? `${resolved.start_time} - ${resolved.end_time}, break ${resolved.break_minutes}m` : "Week off"} ({resolved.source || "resolved"})</p> : null}
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black text-[#111827]">Working Hour Rows</h2><p className="text-sm text-[#6b7280]">{filteredItems.length} shown from {items.length} active rows.</p></div><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setScopeFilter(event.target.value)} value={scopeFilter}><option value="all">All scopes</option><option value="tenant">Tenant</option><option value="branch">Branch</option><option value="user">User</option></select></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Scope</th><th className="px-5 py-4">Day</th><th className="px-5 py-4">Hours</th><th className="px-5 py-4">Break</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading working hours...</td></tr> : filteredItems.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No working hours found.</td></tr> : filteredItems.map((item) => (
                  <tr className="hover:bg-[#f8faf9]" key={item.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{scopeLabel(item)}</strong><span className="mt-1 block text-xs text-[#6b7280]">{scopeDetail(item, branches, users)}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#374151]">{item.day_of_week}</td>
                    <td className="px-5 py-5">{item.is_working_day ? <span className="text-sm text-[#4b5563]">{item.start_time} - {item.end_time}</span> : <span className="rounded-full bg-[#fff4ed] px-3 py-1 text-xs font-black text-[#b54708]">Week off</span>}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{item.break_minutes} min</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td>
                    <td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => { setEditing(item); setForm(itemToForm(item)); }} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => deleteWorkingHour(item)} type="button">Delete</button></div></td>
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

function SetupCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-2 block text-2xl text-[#111827]">{value}</strong></div>;
}

function BranchSelect({ branches, label, onChange, value }: { branches: Branch[]; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="block text-sm font-bold text-[#374151]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}><option value="">None</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>;
}

function UserSelector({ onChange, users, value }: { onChange: (value: string) => void; users: UserOption[]; value: string }) {
  if (users.length > 0) {
    return <label className="block text-sm font-bold text-[#374151]">User<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}><option value="">None</option>{users.map((user) => <option key={user.id} value={user.id}>{userName(user)} - {user.email}</option>)}</select></label>;
  }
  return <label className="block text-sm font-bold text-[#374151]">User ID<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} placeholder="UUID" value={value} /></label>;
}

function scopeLabel(item: WorkingHour) {
  if (item.user_id) return "User override";
  if (item.branch_id) return "Branch override";
  return "Tenant default";
}

function scopeDetail(item: WorkingHour, branches: Branch[], users: UserOption[]) {
  if (item.user_id) return userName(users.find((user) => user.id === item.user_id)) || item.user_id;
  if (item.branch_id) return branches.find((branch) => branch.id === item.branch_id)?.name || item.branch_id;
  return "Applies when no branch/user override exists";
}

function userName(user?: UserOption) {
  if (!user) return "";
  return `${user.first_name} ${user.last_name}`.trim() || user.email;
}
