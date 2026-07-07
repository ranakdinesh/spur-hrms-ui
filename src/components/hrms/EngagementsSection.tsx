"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Engagement = {
  id: string;
  worker_profile_id: string;
  worker_display_name?: string;
  worker_code?: string | null;
  employee_id?: string | null;
  worker_type_name?: string;
  classification_group?: string;
  engagement_code?: string | null;
  title: string;
  description?: string | null;
  engagement_type: string;
  status: string;
  start_date: string;
  end_date?: string | null;
  hours_budget?: number | null;
  rate_amount?: number | null;
  currency_code: string;
  rate_unit: string;
  branch_id?: string | null;
  branch_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  reporting_manager_id?: string | null;
  project_label?: string | null;
  project_code?: string | null;
  cost_center?: string | null;
  renewal_due_date?: string | null;
  renewal_status: string;
  termination_reason?: string | null;
  terminated_at?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

type WorkerProfile = {
  id: string;
  display_name: string;
  worker_code?: string | null;
  worker_type_name?: string;
  classification_group?: string;
  branch_id?: string | null;
  branch_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
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

type EngagementForm = {
  worker_profile_id: string;
  engagement_code: string;
  title: string;
  description: string;
  engagement_type: string;
  status: string;
  start_date: string;
  end_date: string;
  hours_budget: string;
  rate_amount: string;
  currency_code: string;
  rate_unit: string;
  branch_id: string;
  department_id: string;
  reporting_manager_id: string;
  project_label: string;
  project_code: string;
  cost_center: string;
  renewal_due_date: string;
  renewal_status: string;
  termination_reason: string;
  terminated_at: string;
  notes: string;
  metadata: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const engagementTypes = [
  ["employee_assignment", "Employee Assignment"],
  ["fixed_term", "Fixed Term"],
  ["project", "Project"],
  ["hourly", "Hourly"],
  ["retainer", "Retainer"],
  ["stipend", "Stipend"],
  ["agency", "Agency"],
  ["consulting", "Consulting"],
];

const engagementStatuses = [
  ["draft", "Draft"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["completed", "Completed"],
  ["terminated", "Terminated"],
  ["cancelled", "Cancelled"],
];

const rateUnits = [
  ["none", "None"],
  ["hour", "Hour"],
  ["day", "Day"],
  ["month", "Month"],
  ["milestone", "Milestone"],
  ["retainer", "Retainer"],
  ["stipend", "Stipend"],
];

const renewalStatuses = [
  ["not_required", "Not Required"],
  ["pending", "Pending"],
  ["renewed", "Renewed"],
  ["not_renewed", "Not Renewed"],
];

const emptyForm: EngagementForm = {
  worker_profile_id: "",
  engagement_code: "",
  title: "",
  description: "",
  engagement_type: "employee_assignment",
  status: "draft",
  start_date: "",
  end_date: "",
  hours_budget: "",
  rate_amount: "",
  currency_code: "INR",
  rate_unit: "none",
  branch_id: "",
  department_id: "",
  reporting_manager_id: "",
  project_label: "",
  project_code: "",
  cost_center: "",
  renewal_due_date: "",
  renewal_status: "not_required",
  termination_reason: "",
  terminated_at: "",
  notes: "",
  metadata: "{\n  \"source\": \"engagements\"\n}",
};

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function optionalNumber(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Budget and rate values must be non-negative numbers.");
  return parsed;
}

function parseJSONObject(value: string) {
  const parsed = value.trim() ? JSON.parse(value) : {};
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Metadata must be a JSON object.");
  return parsed as Record<string, unknown>;
}

function prettyJSON(value: unknown) {
  if (!value || typeof value !== "object") return "{\n  \"source\": \"engagements\"\n}";
  return JSON.stringify(value, null, 2);
}

function dateForInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function labelFor(options: string[][], value?: string | null) {
  if (!value) return "-";
  return options.find(([key]) => key === value)?.[1] || value.replaceAll("_", " ");
}

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function formFromEngagement(item: Engagement): EngagementForm {
  return {
    worker_profile_id: item.worker_profile_id || "",
    engagement_code: item.engagement_code || "",
    title: item.title || "",
    description: item.description || "",
    engagement_type: item.engagement_type || "employee_assignment",
    status: item.status || "draft",
    start_date: dateForInput(item.start_date),
    end_date: dateForInput(item.end_date),
    hours_budget: item.hours_budget == null ? "" : String(item.hours_budget),
    rate_amount: item.rate_amount == null ? "" : String(item.rate_amount),
    currency_code: item.currency_code || "INR",
    rate_unit: item.rate_unit || "none",
    branch_id: item.branch_id || "",
    department_id: item.department_id || "",
    reporting_manager_id: item.reporting_manager_id || "",
    project_label: item.project_label || "",
    project_code: item.project_code || "",
    cost_center: item.cost_center || "",
    renewal_due_date: dateForInput(item.renewal_due_date),
    renewal_status: item.renewal_status || "not_required",
    termination_reason: item.termination_reason || "",
    terminated_at: dateForInput(item.terminated_at),
    notes: item.notes || "",
    metadata: prettyJSON(item.metadata),
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatMoney(value?: number | null, currency = "INR") {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", { currency, maximumFractionDigits: 2, style: "currency" }).format(value);
}

export function EngagementsSection({
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
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Engagements</h1>
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
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <EngagementsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function EngagementsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [editing, setEditing] = useState<Engagement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EngagementForm>(emptyForm);
  const [statusTarget, setStatusTarget] = useState<{ item: Engagement; status: string } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [summaryNow, setSummaryNow] = useState(0);

  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("engagement_type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (departmentFilter) params.set("department_id", departmentFilter);
      if (search.trim()) params.set("search", search.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const [engagementData, workerData, branchData, departmentData] = await Promise.all([
        apiRequest<Engagement[]>(`${basePath}/engagements${suffix}`),
        apiRequest<WorkerProfile[]>(`${basePath}/worker-profiles`),
        apiRequest<Branch[]>(`${basePath}/branches`),
        apiRequest<Department[]>(`${basePath}/departments`),
      ]);
      setEngagements(engagementData);
      setSummaryNow(Date.now());
      setWorkers(workerData);
      setBranches(branchData);
      setDepartments(departmentData);
      setForm((current) => ({ ...current, worker_profile_id: current.worker_profile_id || workerData[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load engagements.");
    } finally {
      setLoading(false);
    }
  }, [basePath, departmentFilter, search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const summary = useMemo(() => {
    const active = engagements.filter((item) => item.status === "active").length;
    const renewalPending = engagements.filter((item) => item.renewal_status === "pending").length;
    const now = summaryNow;
    const soon = engagements.filter((item) => item.end_date && new Date(item.end_date).getTime() - now <= 1000 * 60 * 60 * 24 * 45 && new Date(item.end_date).getTime() >= now).length;
    const external = engagements.filter((item) => item.classification_group && item.classification_group !== "employee").length;
    return { total: engagements.length, active, renewalPending, soon, external };
  }, [engagements, summaryNow]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, worker_profile_id: workers[0]?.id || "" });
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(item: Engagement) {
    setEditing(item);
    setForm(formFromEngagement(item));
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function selectWorker(workerID: string) {
    const worker = workers.find((item) => item.id === workerID);
    setForm((current) => ({
      ...current,
      worker_profile_id: workerID,
      branch_id: worker?.branch_id || current.branch_id,
      department_id: worker?.department_id || current.department_id,
      reporting_manager_id: worker?.reporting_manager_id || current.reporting_manager_id,
      title: current.title || (worker ? `${worker.display_name} engagement` : current.title),
    }));
  }

  async function saveEngagement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!form.worker_profile_id) throw new Error("Worker profile is required.");
      if (!form.title.trim()) throw new Error("Title is required.");
      if (!form.start_date) throw new Error("Start date is required.");
      const payload = {
        worker_profile_id: form.worker_profile_id,
        engagement_code: optionalString(form.engagement_code),
        title: form.title.trim(),
        description: optionalString(form.description),
        engagement_type: form.engagement_type,
        status: form.status,
        start_date: form.start_date,
        end_date: optionalString(form.end_date),
        hours_budget: optionalNumber(form.hours_budget),
        rate_amount: optionalNumber(form.rate_amount),
        currency_code: form.currency_code.trim().toUpperCase() || "INR",
        rate_unit: form.rate_unit,
        branch_id: optionalString(form.branch_id),
        department_id: optionalString(form.department_id),
        reporting_manager_id: optionalString(form.reporting_manager_id),
        project_label: optionalString(form.project_label),
        project_code: optionalString(form.project_code),
        cost_center: optionalString(form.cost_center),
        renewal_due_date: optionalString(form.renewal_due_date),
        renewal_status: form.renewal_status,
        termination_reason: optionalString(form.termination_reason),
        terminated_at: optionalString(form.terminated_at),
        notes: optionalString(form.notes),
        metadata: parseJSONObject(form.metadata),
      };
      if (editing) {
        await apiRequest<Engagement>(`${basePath}/engagements/${editing.id}`, { method: "PUT", body: payload });
        setMessage("Engagement updated.");
      } else {
        await apiRequest<Engagement>(`${basePath}/engagements`, { method: "POST", body: payload });
        setMessage("Engagement created.");
      }
      setFormOpen(false);
      setEditing(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save engagement.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateEngagement(item: Engagement) {
    if (!window.confirm(`Deactivate ${item.title}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/engagements/${item.id}`, { method: "DELETE" });
      setMessage("Engagement deactivated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate engagement.");
    }
  }

  async function saveStatus() {
    if (!statusTarget) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<Engagement>(`${basePath}/engagements/${statusTarget.item.id}/status`, {
        method: "POST",
        body: {
          status: statusTarget.status,
          termination_reason: statusTarget.status === "terminated" ? optionalString(statusReason) : undefined,
          terminated_at: statusTarget.status === "terminated" ? new Date().toISOString() : undefined,
        },
      });
      setMessage("Engagement status updated.");
      setStatusTarget(null);
      setStatusReason("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update engagement status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Engagements` : "Engagements"}</h1>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreate} type="button">Add Engagement</button>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-5">
        <SummaryCard label="Engagements" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Ending Soon" value={summary.soon} tone="warning" />
        <SummaryCard label="Renewal Pending" value={summary.renewalPending} tone="warning" />
        <SummaryCard label="Non Employee" value={summary.external} />
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#111827]">Engagement Register</h2>
              <InfoButton text="Engagements track a worker's assignment, project, retainer, budget, rate, renewal, and lifecycle without changing the worker identity record." />
            </div>
            <p className="text-sm text-[#6b7280]">{engagements.length} records shown</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] xl:w-[260px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search engagements" value={search} />
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
              <option value="">All types</option>
              {engagementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All statuses</option>
              {engagementStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setDepartmentFilter(event.target.value)} value={departmentFilter}>
              <option value="">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
              <tr><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Engagement</th><th className="px-5 py-4">Lifecycle</th><th className="px-5 py-4">Dates</th><th className="px-5 py-4">Budget</th><th className="px-5 py-4">Organization</th><th className="px-5 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {loading ? (
                <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading engagements...</td></tr>
              ) : engagements.length === 0 ? (
                <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No engagements found.</td></tr>
              ) : engagements.map((item) => (
                <tr className="hover:bg-[#f8faf9]" key={item.id}>
                  <td className="px-5 py-5">
                    <strong className="block text-sm text-[#111827]">{item.worker_display_name || workers.find((worker) => worker.id === item.worker_profile_id)?.display_name || "Worker"}</strong>
                    <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.worker_code || item.worker_type_name || item.classification_group || "No code"}</span>
                  </td>
                  <td className="px-5 py-5">
                    <strong className="block text-sm text-[#111827]">{item.title}</strong>
                    <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{labelFor(engagementTypes, item.engagement_type)} / {item.engagement_code || item.project_code || "No code"}</span>
                    <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.project_label || item.cost_center || "No project"}</span>
                  </td>
                  <td className="px-5 py-5">
                    <StatusChip value={labelFor(engagementStatuses, item.status)} />
                    <span className="mt-2 block text-xs font-semibold text-[#6b7280]">Renewal: {labelFor(renewalStatuses, item.renewal_status)}</span>
                  </td>
                  <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.start_date)}<span className="block text-xs font-semibold text-[#6b7280]">to {formatDate(item.end_date)}</span></td>
                  <td className="px-5 py-5 text-sm text-[#4b5563]">{item.hours_budget == null ? "-" : `${item.hours_budget} hours`}<span className="block text-xs font-semibold text-[#6b7280]">{formatMoney(item.rate_amount, item.currency_code)} / {labelFor(rateUnits, item.rate_unit)}</span></td>
                  <td className="px-5 py-5 text-sm text-[#4b5563]">{item.branch_name || "No branch"}<span className="block text-xs font-semibold text-[#6b7280]">{item.department_name || "No department"}</span></td>
                  <td className="px-5 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] hover:border-[#588368]" onClick={() => openEdit(item)} type="button">Edit</button>
                      {item.status !== "active" ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => setStatusTarget({ item, status: "active" })} type="button">Activate</button> : null}
                      {item.status === "active" ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => setStatusTarget({ item, status: "paused" })} type="button">Pause</button> : null}
                      {item.status !== "completed" ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => setStatusTarget({ item, status: "completed" })} type="button">Complete</button> : null}
                      <button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50" onClick={() => setStatusTarget({ item, status: "terminated" })} type="button">Terminate</button>
                      <button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50" onClick={() => deactivateEngagement(item)} type="button">Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen ? (
        <Modal title={editing ? "Edit Engagement" : "Add Engagement"} onClose={() => setFormOpen(false)}>
          <form className="grid gap-5 p-6" onSubmit={saveEngagement}>
            <div className="grid gap-4 md:grid-cols-3">
              <FormSelect label="Worker profile" onChange={selectWorker} value={form.worker_profile_id}>
                <option value="">Select worker</option>
                {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.display_name} {worker.worker_code ? `(${worker.worker_code})` : ""}</option>)}
              </FormSelect>
              <FormInput label="Title" onChange={(value) => setForm((current) => ({ ...current, title: value }))} required value={form.title} />
              <FormInput label="Engagement code" onChange={(value) => setForm((current) => ({ ...current, engagement_code: value }))} value={form.engagement_code} />
              <FormSelect label="Type" onChange={(value) => setForm((current) => ({ ...current, engagement_type: value }))} value={form.engagement_type}>{engagementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
              <FormSelect label="Status" onChange={(value) => setForm((current) => ({ ...current, status: value }))} value={form.status}>{engagementStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
              <FormInput label="Start date" onChange={(value) => setForm((current) => ({ ...current, start_date: value }))} required type="date" value={form.start_date} />
              <FormInput label="End date" onChange={(value) => setForm((current) => ({ ...current, end_date: value }))} type="date" value={form.end_date} />
              <FormInput label="Hours budget" onChange={(value) => setForm((current) => ({ ...current, hours_budget: value }))} type="number" value={form.hours_budget} />
              <FormInput label="Rate amount" onChange={(value) => setForm((current) => ({ ...current, rate_amount: value }))} type="number" value={form.rate_amount} />
              <FormInput label="Currency" onChange={(value) => setForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} value={form.currency_code} />
              <FormSelect label="Rate unit" onChange={(value) => setForm((current) => ({ ...current, rate_unit: value }))} value={form.rate_unit}>{rateUnits.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
              <FormSelect label="Renewal" onChange={(value) => setForm((current) => ({ ...current, renewal_status: value }))} value={form.renewal_status}>{renewalStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
              <FormInput label="Renewal due" onChange={(value) => setForm((current) => ({ ...current, renewal_due_date: value }))} type="date" value={form.renewal_due_date} />
              <FormSelect label="Branch" onChange={(value) => setForm((current) => ({ ...current, branch_id: value }))} value={form.branch_id}>
                <option value="">Inherit or none</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || branch.branch_name || branch.id}</option>)}
              </FormSelect>
              <FormSelect label="Department" onChange={(value) => setForm((current) => ({ ...current, department_id: value }))} value={form.department_id}>
                <option value="">Inherit or none</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </FormSelect>
              <FormInput label="Project" onChange={(value) => setForm((current) => ({ ...current, project_label: value }))} value={form.project_label} />
              <FormInput label="Project code" onChange={(value) => setForm((current) => ({ ...current, project_code: value }))} value={form.project_code} />
              <FormInput label="Cost center" onChange={(value) => setForm((current) => ({ ...current, cost_center: value }))} value={form.cost_center} />
            </div>
            <label className="grid gap-2 text-sm font-bold text-[#374151]">
              <span className="flex items-center gap-2">Description <InfoButton text="Use description for assignment scope, not for contract files or policy documents." /></span>
              <textarea className="min-h-20 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#374151]">
              <span className="flex items-center gap-2">Notes <InfoButton text="Capture operational notes for HR follow-up, renewal context, or completion reason." /></span>
              <textarea className="min-h-20 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} value={form.notes} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#374151]">
              <span className="flex items-center gap-2">Metadata <InfoButton text="Use JSON only for extra machine-readable fields that do not yet deserve first-class columns." /></span>
              <textarea className="min-h-28 rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, metadata: event.target.value }))} value={form.metadata} />
            </label>
            <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
              <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setFormOpen(false)} type="button">Cancel</button>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Engagement"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {statusTarget ? (
        <Modal title={`${labelFor(engagementStatuses, statusTarget.status)} Engagement`} onClose={() => setStatusTarget(null)} size="sm">
          <div className="grid gap-5 p-6">
            <div>
              <p className="text-sm font-bold text-[#111827]">{statusTarget.item.title}</p>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">{statusTarget.item.worker_display_name || "Worker"} / {labelFor(engagementTypes, statusTarget.item.engagement_type)}</p>
            </div>
            {statusTarget.status === "terminated" ? (
              <label className="grid gap-2 text-sm font-bold text-[#374151]">
                Termination reason
                <textarea className="min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => setStatusReason(event.target.value)} value={statusReason} />
              </label>
            ) : null}
            <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
              <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setStatusTarget(null)} type="button">Cancel</button>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveStatus} type="button">{saving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </Modal>
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

function Modal({ title, onClose, children, size = "lg" }: { title: string; onClose: () => void; children: ReactNode; size?: "sm" | "lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 px-4 py-6">
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${size === "sm" ? "max-w-xl" : "max-w-5xl"}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf1ef] bg-white px-6 py-5">
          <h2 className="text-xl font-black text-[#111827]">{title}</h2>
          <button className="rounded-full border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={onClose} type="button">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#374151]">
      {label}
      <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-medium outline-none focus:border-[#588368]" min={type === "number" ? "0" : undefined} onChange={(event) => onChange(event.target.value)} required={required} step={type === "number" ? "0.01" : undefined} type={type} value={value} />
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
