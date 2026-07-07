"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type WorkerType = {
  id: string;
  code: string;
  name: string;
  classification_group: string;
  attendance_mode: string;
  pay_mode: string;
};

type WorkerProfile = {
  id: string;
  worker_type_id: string;
  worker_type_code?: string;
  worker_type_name?: string;
  classification_group?: string;
  attendance_mode?: string;
  pay_mode?: string;
  employee_id?: string | null;
  employee_user_id?: string | null;
  employee_code?: string | null;
  worker_code?: string | null;
  display_name: string;
  legal_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  profile_status: string;
  start_date?: string | null;
  end_date?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  reporting_manager_id?: string | null;
  work_location_label?: string | null;
  source_partner?: string | null;
  external_reference?: string | null;
  compliance_status: string;
  payroll_status: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

type Employee = {
  id: string;
  user_id: string;
  employee_code?: string | null;
  firstname: string;
  middle_name?: string | null;
  lastname?: string | null;
  email?: string | null;
  mobile?: string | null;
  branch_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
};

type Branch = {
  id: string;
  name?: string;
  branch_name?: string;
};

type Department = {
  id: string;
  name: string;
};

type WorkerProfileForm = {
  worker_type_id: string;
  employee_id: string;
  worker_code: string;
  display_name: string;
  legal_name: string;
  email: string;
  mobile: string;
  profile_status: string;
  start_date: string;
  end_date: string;
  branch_id: string;
  department_id: string;
  reporting_manager_id: string;
  work_location_label: string;
  source_partner: string;
  external_reference: string;
  compliance_status: string;
  payroll_status: string;
  notes: string;
  metadata: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const profileStatuses = [
  ["draft", "Draft"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["ended", "Ended"],
  ["blacklisted", "Blacklisted"],
];

const complianceStatuses = [
  ["pending", "Pending"],
  ["ready", "Ready"],
  ["review_required", "Review"],
  ["blocked", "Blocked"],
];

const payrollStatuses = [
  ["not_applicable", "Not Applicable"],
  ["pending", "Pending"],
  ["ready", "Ready"],
  ["blocked", "Blocked"],
];

const groupOptions = [
  ["employee", "Employee"],
  ["contractor", "Contractor"],
  ["trainee", "Trainee"],
  ["agency", "Agency"],
];

const emptyForm: WorkerProfileForm = {
  worker_type_id: "",
  employee_id: "",
  worker_code: "",
  display_name: "",
  legal_name: "",
  email: "",
  mobile: "",
  profile_status: "active",
  start_date: "",
  end_date: "",
  branch_id: "",
  department_id: "",
  reporting_manager_id: "",
  work_location_label: "",
  source_partner: "",
  external_reference: "",
  compliance_status: "pending",
  payroll_status: "not_applicable",
  notes: "",
  metadata: "{\n  \"source\": \"workforce_hub\"\n}",
};

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function prettyJSON(value: unknown) {
  if (!value || typeof value !== "object") return "{\n  \"source\": \"workforce_hub\"\n}";
  return JSON.stringify(value, null, 2);
}

function parseJSONObject(value: string) {
  const parsed = value.trim() ? JSON.parse(value) : {};
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Metadata must be a JSON object.");
  return parsed as Record<string, unknown>;
}

function dateForInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function labelFor(options: string[][], value?: string | null) {
  if (!value) return "-";
  return options.find(([key]) => key === value)?.[1] || value.replaceAll("_", " ");
}

function employeeName(employee: Employee) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ");
}

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function formFromProfile(item: WorkerProfile): WorkerProfileForm {
  return {
    worker_type_id: item.worker_type_id || "",
    employee_id: item.employee_id || "",
    worker_code: item.worker_code || "",
    display_name: item.display_name || "",
    legal_name: item.legal_name || "",
    email: item.email || "",
    mobile: item.mobile || "",
    profile_status: item.profile_status || "active",
    start_date: dateForInput(item.start_date),
    end_date: dateForInput(item.end_date),
    branch_id: item.branch_id || "",
    department_id: item.department_id || "",
    reporting_manager_id: item.reporting_manager_id || "",
    work_location_label: item.work_location_label || "",
    source_partner: item.source_partner || "",
    external_reference: item.external_reference || "",
    compliance_status: item.compliance_status || "pending",
    payroll_status: item.payroll_status || "not_applicable",
    notes: item.notes || "",
    metadata: prettyJSON(item.metadata),
  };
}

export function WorkforceHubSection({
  isSuperAdmin,
  tenants,
  tenantsLoading,
  tenantsError,
  onOpenEmployees,
}: {
  isSuperAdmin: boolean;
  tenants: BranchTenantOption[];
  tenantsLoading: boolean;
  tenantsError: string;
  onOpenEmployees: () => void;
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
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Workforce Hub</h1>
            <p className="mt-3 text-sm text-[#6b7280]">Select a tenant to manage employee-linked and external worker profiles.</p>
          </div>
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
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr>
                ) : filteredTenants.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No tenants match your search.</td></tr>
                ) : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} / {tenant.kind}</span></td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Hub</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <WorkforceHubManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} onOpenEmployees={onOpenEmployees} tenant={selectedTenant} />;
}

function WorkforceHubManager({ isSuperAdmin, tenant, onBack, onOpenEmployees }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void; onOpenEmployees: () => void }) {
  const [profiles, setProfiles] = useState<WorkerProfile[]>([]);
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<WorkerProfile | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<WorkerProfileForm>(emptyForm);

  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("worker_type_id", typeFilter);
      if (groupFilter) params.set("classification_group", groupFilter);
      if (statusFilter) params.set("profile_status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const [profilesData, typesData, employeesData, branchesData, departmentsData] = await Promise.all([
        apiRequest<WorkerProfile[]>(`${basePath}/worker-profiles${suffix}`),
        apiRequest<WorkerType[]>(`${basePath}/worker-types`),
        apiRequest<Employee[]>(`${basePath}/employees`),
        apiRequest<Branch[]>(`${basePath}/branches`),
        apiRequest<Department[]>(`${basePath}/departments`),
      ]);
      setProfiles(profilesData);
      setWorkerTypes(typesData);
      setEmployees(employeesData);
      setBranches(branchesData);
      setDepartments(departmentsData);
      setForm((current) => ({ ...current, worker_type_id: current.worker_type_id || typesData[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workforce hub.");
    } finally {
      setLoading(false);
    }
  }, [basePath, groupFilter, search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const summary = useMemo(() => {
    const active = profiles.filter((item) => item.profile_status === "active").length;
    const employeeLinked = profiles.filter((item) => item.employee_id).length;
    const external = profiles.length - employeeLinked;
    const review = profiles.filter((item) => item.compliance_status === "review_required" || item.compliance_status === "blocked").length;
    return { total: profiles.length, active, employeeLinked, external, review };
  }, [profiles]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, worker_type_id: workerTypes[0]?.id || "" });
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(item: WorkerProfile) {
    setEditing(item);
    setForm(formFromProfile(item));
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function selectEmployee(employeeID: string) {
    const employee = employees.find((item) => item.id === employeeID);
    setForm((current) => ({
      ...current,
      employee_id: employeeID,
      display_name: employee ? current.display_name || employeeName(employee) : current.display_name,
      worker_code: employee?.employee_code || current.worker_code,
      email: employee?.email || current.email,
      mobile: employee?.mobile || current.mobile,
      branch_id: employee?.branch_id || current.branch_id,
      department_id: employee?.department_id || current.department_id,
      reporting_manager_id: employee?.reporting_manager_id || current.reporting_manager_id,
    }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        worker_type_id: form.worker_type_id,
        employee_id: optionalString(form.employee_id),
        worker_code: optionalString(form.worker_code),
        display_name: form.display_name.trim(),
        legal_name: optionalString(form.legal_name),
        email: optionalString(form.email),
        mobile: optionalString(form.mobile),
        profile_status: form.profile_status,
        start_date: optionalString(form.start_date),
        end_date: optionalString(form.end_date),
        branch_id: optionalString(form.branch_id),
        department_id: optionalString(form.department_id),
        reporting_manager_id: optionalString(form.reporting_manager_id),
        work_location_label: optionalString(form.work_location_label),
        source_partner: optionalString(form.source_partner),
        external_reference: optionalString(form.external_reference),
        compliance_status: form.compliance_status,
        payroll_status: form.payroll_status,
        notes: optionalString(form.notes),
        metadata: parseJSONObject(form.metadata),
      };
      if (!payload.worker_type_id) throw new Error("Worker type is required.");
      if (!payload.display_name) throw new Error("Display name is required.");
      if (editing) {
        await apiRequest<WorkerProfile>(`${basePath}/worker-profiles/${editing.id}`, { method: "PUT", body: payload });
        setMessage("Worker profile updated.");
      } else {
        await apiRequest<WorkerProfile>(`${basePath}/worker-profiles`, { method: "POST", body: payload });
        setMessage("Worker profile created.");
      }
      setFormOpen(false);
      setEditing(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save worker profile.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProfile(item: WorkerProfile) {
    if (!window.confirm(`Deactivate ${item.display_name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/worker-profiles/${item.id}`, { method: "DELETE" });
      setMessage("Worker profile deactivated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate worker profile.");
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Workforce Hub` : "Workforce Hub"}</h1>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreate} type="button">Add Worker</button>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-5">
        <SummaryCard label="Profiles" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Employee Linked" value={summary.employeeLinked} />
        <SummaryCard label="External" value={summary.external} />
        <SummaryCard label="Compliance Review" value={summary.review} tone="warning" />
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#111827]">Worker Profiles</h2>
              <InfoButton text="Use this hub for non-employee workers too. Link to an employee only when the person has a normal employee profile." />
            </div>
            <p className="text-sm text-[#6b7280]">{profiles.length} profiles shown</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] xl:w-[260px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search workers" value={search} />
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
              <option value="">All types</option>
              {workerTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setGroupFilter(event.target.value)} value={groupFilter}>
              <option value="">All groups</option>
              {groupOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All statuses</option>
              {profileStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
              <tr><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Organization</th><th className="px-5 py-4">Readiness</th><th className="px-5 py-4">Link</th><th className="px-5 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {loading ? (
                <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading workforce hub...</td></tr>
              ) : profiles.length === 0 ? (
                <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No worker profiles found.</td></tr>
              ) : profiles.map((item) => (
                <tr className="hover:bg-[#f8faf9]" key={item.id}>
                  <td className="px-5 py-5">
                    <strong className="block text-sm text-[#111827]">{item.display_name}</strong>
                    <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.worker_code || item.email || item.mobile || "No code captured"}</span>
                  </td>
                  <td className="px-5 py-5">
                    <span className="block text-sm font-bold text-[#111827]">{item.worker_type_name || workerTypes.find((type) => type.id === item.worker_type_id)?.name || "-"}</span>
                    <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{labelFor(groupOptions, item.classification_group)} / {labelFor([], item.pay_mode)}</span>
                  </td>
                  <td className="px-5 py-5"><StatusChip value={labelFor(profileStatuses, item.profile_status)} /></td>
                  <td className="px-5 py-5 text-sm text-[#4b5563]">{item.branch_name || "No branch"}<span className="block text-xs font-semibold text-[#6b7280]">{item.department_name || item.work_location_label || "No department"}</span></td>
                  <td className="px-5 py-5 text-sm text-[#4b5563]">Compliance: <strong>{labelFor(complianceStatuses, item.compliance_status)}</strong><span className="block text-xs font-semibold text-[#6b7280]">Payroll: {labelFor(payrollStatuses, item.payroll_status)}</span></td>
                  <td className="px-5 py-5">{item.employee_id ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#588368]" onClick={onOpenEmployees} type="button">Employee {item.employee_code || ""}</button> : <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#9a3412]">External</span>}</td>
                  <td className="px-5 py-5 text-right">
                    <button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] hover:border-[#588368]" onClick={() => openEdit(item)} type="button">Edit</button>
                    <button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50" onClick={() => deactivateProfile(item)} type="button">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf1ef] bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-[#111827]">{editing ? "Edit Worker" : "Add Worker"}</h2>
                <p className="text-sm text-[#6b7280]">Classification, linkage, status, and readiness.</p>
              </div>
              <button className="rounded-full border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => setFormOpen(false)} type="button">Close</button>
            </div>
            <form className="grid gap-5 p-6" onSubmit={saveProfile}>
              <div className="grid gap-4 md:grid-cols-3">
                <FormSelect label="Worker type" onChange={(value) => setForm((current) => ({ ...current, worker_type_id: value }))} value={form.worker_type_id}>
                  <option value="">Select type</option>
                  {workerTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </FormSelect>
                <FormSelect label="Employee link" onChange={selectEmployee} value={form.employee_id}>
                  <option value="">External or no employee link</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeName(employee)} {employee.employee_code ? `(${employee.employee_code})` : ""}</option>)}
                </FormSelect>
                <FormInput label="Worker code" onChange={(value) => setForm((current) => ({ ...current, worker_code: value }))} value={form.worker_code} />
                <FormInput label="Display name" onChange={(value) => setForm((current) => ({ ...current, display_name: value }))} required value={form.display_name} />
                <FormInput label="Legal name" onChange={(value) => setForm((current) => ({ ...current, legal_name: value }))} value={form.legal_name} />
                <FormInput label="Email" onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" value={form.email} />
                <FormInput label="Mobile" onChange={(value) => setForm((current) => ({ ...current, mobile: value }))} value={form.mobile} />
                <FormSelect label="Status" onChange={(value) => setForm((current) => ({ ...current, profile_status: value }))} value={form.profile_status}>{profileStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
                <FormSelect label="Compliance" onChange={(value) => setForm((current) => ({ ...current, compliance_status: value }))} value={form.compliance_status}>{complianceStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
                <FormSelect label="Payroll" onChange={(value) => setForm((current) => ({ ...current, payroll_status: value }))} value={form.payroll_status}>{payrollStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
                <FormInput label="Start date" onChange={(value) => setForm((current) => ({ ...current, start_date: value }))} type="date" value={form.start_date} />
                <FormInput label="End date" onChange={(value) => setForm((current) => ({ ...current, end_date: value }))} type="date" value={form.end_date} />
                <FormSelect label="Branch" onChange={(value) => setForm((current) => ({ ...current, branch_id: value }))} value={form.branch_id}>
                  <option value="">No branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || branch.branch_name || branch.id}</option>)}
                </FormSelect>
                <FormSelect label="Department" onChange={(value) => setForm((current) => ({ ...current, department_id: value }))} value={form.department_id}>
                  <option value="">No department</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </FormSelect>
                <FormInput label="Work location" onChange={(value) => setForm((current) => ({ ...current, work_location_label: value }))} value={form.work_location_label} />
                <FormInput label="Source partner" onChange={(value) => setForm((current) => ({ ...current, source_partner: value }))} value={form.source_partner} />
                <FormInput label="External reference" onChange={(value) => setForm((current) => ({ ...current, external_reference: value }))} value={form.external_reference} />
              </div>
              <label className="grid gap-2 text-sm font-bold text-[#374151]">
                <span className="flex items-center gap-2">Notes <InfoButton text="Keep operational notes brief. Longer contracts or documents should be managed in the document module later." /></span>
                <textarea className="min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} value={form.notes} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#374151]">
                <span className="flex items-center gap-2">Metadata <InfoButton text="Use JSON only for extra machine-readable attributes that do not yet deserve first-class fields." /></span>
                <textarea className="min-h-28 rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, metadata: event.target.value }))} value={form.metadata} />
              </label>
              <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
                <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setFormOpen(false)} type="button">Cancel</button>
                <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Worker"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "warning" }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tone === "warning" ? "border-amber-100 bg-amber-50" : "border-[#edf1ef] bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p>
      <strong className="mt-3 block text-3xl font-black text-[#111827]">{value}</strong>
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  return <span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-black text-[#588368]">{value}</span>;
}

function InfoButton({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button aria-label={text} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" type="button">i</button>
      <span className="pointer-events-none absolute left-0 top-7 z-20 hidden w-64 rounded-xl border border-[#edf1ef] bg-white p-3 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span>
    </span>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#374151]">
      {label}
      <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} />
    </label>
  );
}

function FormSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#374151]">
      {label}
      <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}
