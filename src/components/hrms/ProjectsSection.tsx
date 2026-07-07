"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Project = {
  id: string;
  project_code?: string | null;
  name: string;
  description?: string | null;
  status: string;
  department_id?: string | null;
  department_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  project_manager_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  budget_amount?: number | null;
  currency_code: string;
  billing_type: string;
  client_label?: string | null;
  priority: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  milestone_count?: number;
  submitted_milestone_count?: number;
  accepted_milestone_count?: number;
  rejected_milestone_count?: number;
  milestone_amount?: number;
  accepted_amount?: number;
  remaining_budget_amount?: number | null;
};

type Milestone = {
  id: string;
  project_id: string;
  project_name?: string;
  project_code?: string | null;
  engagement_id?: string | null;
  engagement_title?: string | null;
  worker_display_name?: string | null;
  milestone_code?: string | null;
  title: string;
  description?: string | null;
  acceptance_criteria?: string | null;
  due_date?: string | null;
  status: string;
  amount?: number | null;
  currency_code: string;
  payment_trigger?: Record<string, unknown> | null;
  review_comment?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

type Engagement = {
  id: string;
  title: string;
  worker_display_name?: string;
  engagement_code?: string | null;
};

type Department = { id: string; name: string };
type Branch = { id: string; branch_name?: string; name?: string };
type TenantSortKey = "name" | "status" | "plan" | "joined";
type ProjectTab = "projects" | "milestones" | "board";

type ProjectForm = {
  project_code: string;
  name: string;
  description: string;
  status: string;
  department_id: string;
  branch_id: string;
  project_manager_id: string;
  start_date: string;
  due_date: string;
  budget_amount: string;
  currency_code: string;
  billing_type: string;
  client_label: string;
  priority: string;
  notes: string;
  metadata: string;
};

type MilestoneForm = {
  project_id: string;
  engagement_id: string;
  milestone_code: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  due_date: string;
  status: string;
  amount: string;
  currency_code: string;
  payment_trigger: string;
  notes: string;
  metadata: string;
};

const emptyProjectForm: ProjectForm = {
  project_code: "",
  name: "",
  description: "",
  status: "draft",
  department_id: "",
  branch_id: "",
  project_manager_id: "",
  start_date: "",
  due_date: "",
  budget_amount: "",
  currency_code: "INR",
  billing_type: "milestone",
  client_label: "",
  priority: "normal",
  notes: "",
  metadata: "{\n  \"source\": \"projects\"\n}",
};

const emptyMilestoneForm: MilestoneForm = {
  project_id: "",
  engagement_id: "",
  milestone_code: "",
  title: "",
  description: "",
  acceptance_criteria: "",
  due_date: "",
  status: "draft",
  amount: "",
  currency_code: "INR",
  payment_trigger: "{\n  \"trigger\": \"accepted_milestone\"\n}",
  notes: "",
  metadata: "{\n  \"source\": \"milestones\"\n}",
};

const projectStatusOptions = [["draft", "Draft"], ["active", "Active"], ["on_hold", "On Hold"], ["completed", "Completed"], ["cancelled", "Cancelled"]];
const milestoneStatusOptions = [["draft", "Draft"], ["open", "Open"], ["submitted", "Submitted"], ["accepted", "Accepted"], ["rejected", "Rejected"], ["cancelled", "Cancelled"]];

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function optionalNumber(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Amount must be a non-negative number.");
  return parsed;
}

function parseJSONObject(value: string) {
  const parsed = value.trim() ? JSON.parse(value) : {};
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("JSON fields must contain an object.");
  return parsed as Record<string, unknown>;
}

function prettyJSON(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  return JSON.stringify(value, null, 2);
}

function dateForInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatMoney(amount?: number | null, currency = "INR") {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-IN", { currency, maximumFractionDigits: 0, style: "currency" }).format(amount);
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

function projectFormFrom(item: Project): ProjectForm {
  return {
    project_code: item.project_code || "",
    name: item.name || "",
    description: item.description || "",
    status: item.status || "draft",
    department_id: item.department_id || "",
    branch_id: item.branch_id || "",
    project_manager_id: item.project_manager_id || "",
    start_date: dateForInput(item.start_date),
    due_date: dateForInput(item.due_date),
    budget_amount: item.budget_amount == null ? "" : String(item.budget_amount),
    currency_code: item.currency_code || "INR",
    billing_type: item.billing_type || "milestone",
    client_label: item.client_label || "",
    priority: item.priority || "normal",
    notes: item.notes || "",
    metadata: prettyJSON(item.metadata, emptyProjectForm.metadata),
  };
}

function milestoneFormFrom(item: Milestone): MilestoneForm {
  return {
    project_id: item.project_id || "",
    engagement_id: item.engagement_id || "",
    milestone_code: item.milestone_code || "",
    title: item.title || "",
    description: item.description || "",
    acceptance_criteria: item.acceptance_criteria || "",
    due_date: dateForInput(item.due_date),
    status: item.status || "draft",
    amount: item.amount == null ? "" : String(item.amount),
    currency_code: item.currency_code || "INR",
    payment_trigger: prettyJSON(item.payment_trigger, emptyMilestoneForm.payment_trigger),
    notes: item.notes || "",
    metadata: prettyJSON(item.metadata, emptyMilestoneForm.metadata),
  };
}

export function ProjectsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
        <div className="mb-8"><h1 className="text-4xl font-bold tracking-tight text-[#111827]">Projects</h1></div>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
              <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}>
                <option value="name">Sort by name</option><option value="status">Sort by status</option><option value="plan">Sort by plan</option><option value="joined">Sort by joined</option>
              </select>
            </div>
          </div>
          {tenantsError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr> : filteredTenants.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No tenants match your search.</td></tr> : filteredTenants.map((tenant) => (
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

  return <ProjectsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function ProjectsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ProjectTab>("projects");
  const [search, setSearch] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projectModal, setProjectModal] = useState<{ open: boolean; editing: Project | null }>({ open: false, editing: null });
  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; editing: Milestone | null }>({ open: false, editing: null });
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>(emptyMilestoneForm);
  const [reviewTarget, setReviewTarget] = useState<{ item: Milestone; status: "accepted" | "rejected" } | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const projectParams = new URLSearchParams();
      if (projectStatus) projectParams.set("status", projectStatus);
      if (search.trim()) projectParams.set("search", search.trim());
      const milestoneParams = new URLSearchParams();
      if (projectFilter) milestoneParams.set("project_id", projectFilter);
      if (milestoneStatus) milestoneParams.set("status", milestoneStatus);
      if (search.trim()) milestoneParams.set("search", search.trim());
      const projectSuffix = projectParams.toString() ? `?${projectParams.toString()}` : "";
      const milestoneSuffix = milestoneParams.toString() ? `?${milestoneParams.toString()}` : "";
      const [projectData, milestoneData, engagementData, departmentData, branchData] = await Promise.all([
        apiRequest<Project[]>(`${basePath}/projects${projectSuffix}`),
        apiRequest<Milestone[]>(`${basePath}/project-milestones${milestoneSuffix}`),
        apiRequest<Engagement[]>(`${basePath}/engagements`),
        apiRequest<Department[]>(`${basePath}/departments`),
        apiRequest<Branch[]>(`${basePath}/branches`),
      ]);
      setProjects(projectData);
      setMilestones(milestoneData);
      setEngagements(engagementData);
      setDepartments(departmentData);
      setBranches(branchData);
      setMilestoneForm((current) => ({ ...current, project_id: current.project_id || projectData[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }, [basePath, milestoneStatus, projectFilter, projectStatus, search]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const summary = useMemo(() => {
    const active = projects.filter((item) => item.status === "active").length;
    const submitted = milestones.filter((item) => item.status === "submitted").length;
    const accepted = milestones.filter((item) => item.status === "accepted").length;
    const acceptedAmount = milestones.filter((item) => item.status === "accepted").reduce((sum, item) => sum + (item.amount || 0), 0);
    return { total: projects.length, active, submitted, accepted, acceptedAmount };
  }, [milestones, projects]);

  function openProjectCreate() {
    setProjectForm(emptyProjectForm);
    setProjectModal({ open: true, editing: null });
    setError("");
    setMessage("");
  }

  function openProjectEdit(item: Project) {
    setProjectForm(projectFormFrom(item));
    setProjectModal({ open: true, editing: item });
    setError("");
    setMessage("");
  }

  function openMilestoneCreate(projectID?: string) {
    setMilestoneForm({ ...emptyMilestoneForm, project_id: projectID || projectFilter || projects[0]?.id || "" });
    setMilestoneModal({ open: true, editing: null });
    setError("");
    setMessage("");
  }

  function openMilestoneEdit(item: Milestone) {
    setMilestoneForm(milestoneFormFrom(item));
    setMilestoneModal({ open: true, editing: item });
    setError("");
    setMessage("");
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!projectForm.name.trim()) throw new Error("Project name is required.");
      const payload = {
        project_code: optionalString(projectForm.project_code),
        name: projectForm.name.trim(),
        description: optionalString(projectForm.description),
        status: projectForm.status,
        department_id: optionalString(projectForm.department_id),
        branch_id: optionalString(projectForm.branch_id),
        project_manager_id: optionalString(projectForm.project_manager_id),
        start_date: optionalString(projectForm.start_date),
        due_date: optionalString(projectForm.due_date),
        budget_amount: optionalNumber(projectForm.budget_amount),
        currency_code: projectForm.currency_code || "INR",
        billing_type: projectForm.billing_type,
        client_label: optionalString(projectForm.client_label),
        priority: projectForm.priority,
        notes: optionalString(projectForm.notes),
        metadata: parseJSONObject(projectForm.metadata),
      };
      if (projectModal.editing) {
        await apiRequest<Project>(`${basePath}/projects/${projectModal.editing.id}`, { method: "PUT", body: payload });
        setMessage("Project updated.");
      } else {
        await apiRequest<Project>(`${basePath}/projects`, { method: "POST", body: payload });
        setMessage("Project created.");
      }
      setProjectModal({ open: false, editing: null });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!milestoneForm.project_id) throw new Error("Project is required.");
      if (!milestoneForm.title.trim()) throw new Error("Milestone title is required.");
      const payload = {
        project_id: milestoneForm.project_id,
        engagement_id: optionalString(milestoneForm.engagement_id),
        milestone_code: optionalString(milestoneForm.milestone_code),
        title: milestoneForm.title.trim(),
        description: optionalString(milestoneForm.description),
        acceptance_criteria: optionalString(milestoneForm.acceptance_criteria),
        due_date: optionalString(milestoneForm.due_date),
        status: milestoneForm.status,
        amount: optionalNumber(milestoneForm.amount),
        currency_code: milestoneForm.currency_code || "INR",
        payment_trigger: parseJSONObject(milestoneForm.payment_trigger),
        notes: optionalString(milestoneForm.notes),
        metadata: parseJSONObject(milestoneForm.metadata),
      };
      if (milestoneModal.editing) {
        await apiRequest<Milestone>(`${basePath}/project-milestones/${milestoneModal.editing.id}`, { method: "PUT", body: payload });
        setMessage("Milestone updated.");
      } else {
        await apiRequest<Milestone>(`${basePath}/project-milestones`, { method: "POST", body: payload });
        setMessage("Milestone created.");
      }
      setMilestoneModal({ open: false, editing: null });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save milestone.");
    } finally {
      setSaving(false);
    }
  }

  async function submitMilestone(item: Milestone) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<Milestone>(`${basePath}/project-milestones/${item.id}/submit`, { method: "POST" });
      setMessage("Milestone submitted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit milestone.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReview() {
    if (!reviewTarget) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<Milestone>(`${basePath}/project-milestones/${reviewTarget.item.id}/review`, { method: "POST", body: { status: reviewTarget.status, review_comment: optionalString(reviewComment) } });
      setMessage(reviewTarget.status === "accepted" ? "Milestone accepted." : "Milestone rejected.");
      setReviewTarget(null);
      setReviewComment("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review milestone.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Projects` : "Projects"}</h1>
        </div>
        <div className="flex gap-3">
          <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151] hover:border-[#588368]" onClick={() => openMilestoneCreate()} type="button">Add Milestone</button>
          <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openProjectCreate} type="button">Add Project</button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-5">
        <SummaryCard label="Projects" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Pending Acceptance" value={summary.submitted} tone="warning" />
        <SummaryCard label="Accepted" value={summary.accepted} />
        <SummaryCard label="Accepted Value" value={formatMoney(summary.acceptedAmount)} />
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="border-b border-[#edf1ef] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2"><h2 className="text-lg font-black text-[#111827]">Project Delivery</h2><InfoButton text="Projects carry budget and ownership. Milestones carry acceptance criteria and payment trigger metadata without mutating payroll directly." /></div>
            <div className="flex flex-wrap gap-2">
              {(["projects", "milestones", "board"] as ProjectTab[]).map((tab) => (
                <button className={`rounded-xl px-4 py-2 text-sm font-black ${activeTab === tab ? "bg-[#588368] text-white" : "border border-[#dbe0e5] text-[#374151]"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
                  {tab === "projects" ? "Projects" : tab === "milestones" ? "Milestones" : "Board"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or milestones" value={search} />
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setProjectStatus(event.target.value)} value={projectStatus}>
              <option value="">All project statuses</option>{projectStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setMilestoneStatus(event.target.value)} value={milestoneStatus}>
              <option value="">All milestone statuses</option>{milestoneStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
              <option value="">All projects</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>

        {activeTab === "projects" ? (
          <ProjectsTable loading={loading} onAddMilestone={(projectID) => openMilestoneCreate(projectID)} onEdit={openProjectEdit} projects={projects} />
        ) : activeTab === "board" ? (
          <MilestoneBoard milestones={milestones} onAccept={(item) => setReviewTarget({ item, status: "accepted" })} onEdit={openMilestoneEdit} onReject={(item) => setReviewTarget({ item, status: "rejected" })} onSubmit={submitMilestone} />
        ) : (
          <MilestonesTable loading={loading} milestones={milestones} onAccept={(item) => setReviewTarget({ item, status: "accepted" })} onEdit={openMilestoneEdit} onReject={(item) => setReviewTarget({ item, status: "rejected" })} onSubmit={submitMilestone} />
        )}
      </section>

      {projectModal.open ? (
        <Modal title={projectModal.editing ? "Edit Project" : "Add Project"} onClose={() => setProjectModal({ open: false, editing: null })}>
          <form className="grid gap-5 p-6" onSubmit={saveProject}>
            <div className="grid gap-4 md:grid-cols-3">
              <FormInput label="Project name" onChange={(value) => setProjectForm((current) => ({ ...current, name: value }))} required value={projectForm.name} />
              <FormInput label="Project code" onChange={(value) => setProjectForm((current) => ({ ...current, project_code: value }))} value={projectForm.project_code} />
              <FormInput label="Client label" onChange={(value) => setProjectForm((current) => ({ ...current, client_label: value }))} value={projectForm.client_label} />
              <FormSelect label="Status" onChange={(value) => setProjectForm((current) => ({ ...current, status: value }))} value={projectForm.status}>{projectStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FormSelect>
              <FormSelect label="Department" onChange={(value) => setProjectForm((current) => ({ ...current, department_id: value }))} value={projectForm.department_id}><option value="">No department</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</FormSelect>
              <FormSelect label="Branch" onChange={(value) => setProjectForm((current) => ({ ...current, branch_id: value }))} value={projectForm.branch_id}><option value="">No branch</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.branch_name || item.name || item.id}</option>)}</FormSelect>
              <FormInput label="Start date" onChange={(value) => setProjectForm((current) => ({ ...current, start_date: value }))} type="date" value={projectForm.start_date} />
              <FormInput label="Due date" onChange={(value) => setProjectForm((current) => ({ ...current, due_date: value }))} type="date" value={projectForm.due_date} />
              <FormInput label="Budget amount" onChange={(value) => setProjectForm((current) => ({ ...current, budget_amount: value }))} type="number" value={projectForm.budget_amount} />
              <FormInput label="Currency" onChange={(value) => setProjectForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} value={projectForm.currency_code} />
              <FormSelect label="Billing type" onChange={(value) => setProjectForm((current) => ({ ...current, billing_type: value }))} value={projectForm.billing_type}><option value="none">None</option><option value="fixed">Fixed</option><option value="hourly">Hourly</option><option value="milestone">Milestone</option><option value="retainer">Retainer</option></FormSelect>
              <FormSelect label="Priority" onChange={(value) => setProjectForm((current) => ({ ...current, priority: value }))} value={projectForm.priority}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></FormSelect>
            </div>
            <FormInput label="Project manager user ID" onChange={(value) => setProjectForm((current) => ({ ...current, project_manager_id: value }))} value={projectForm.project_manager_id} />
            <Textarea label="Description" onChange={(value) => setProjectForm((current) => ({ ...current, description: value }))} value={projectForm.description} />
            <Textarea label="Notes" onChange={(value) => setProjectForm((current) => ({ ...current, notes: value }))} value={projectForm.notes} />
            <Textarea help="Use JSON only for machine-readable fields that do not yet deserve columns." label="Metadata" mono onChange={(value) => setProjectForm((current) => ({ ...current, metadata: value }))} value={projectForm.metadata} />
            <ModalActions saving={saving} onCancel={() => setProjectModal({ open: false, editing: null })} submitLabel="Save Project" />
          </form>
        </Modal>
      ) : null}

      {milestoneModal.open ? (
        <Modal title={milestoneModal.editing ? "Edit Milestone" : "Add Milestone"} onClose={() => setMilestoneModal({ open: false, editing: null })}>
          <form className="grid gap-5 p-6" onSubmit={saveMilestone}>
            <div className="grid gap-4 md:grid-cols-3">
              <FormSelect label="Project" onChange={(value) => setMilestoneForm((current) => ({ ...current, project_id: value }))} value={milestoneForm.project_id}><option value="">Select project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</FormSelect>
              <FormSelect label="Engagement" onChange={(value) => setMilestoneForm((current) => ({ ...current, engagement_id: value }))} value={milestoneForm.engagement_id}><option value="">No engagement</option>{engagements.map((item) => <option key={item.id} value={item.id}>{item.title}{item.worker_display_name ? ` - ${item.worker_display_name}` : ""}</option>)}</FormSelect>
              <FormInput label="Milestone title" onChange={(value) => setMilestoneForm((current) => ({ ...current, title: value }))} required value={milestoneForm.title} />
              <FormInput label="Milestone code" onChange={(value) => setMilestoneForm((current) => ({ ...current, milestone_code: value }))} value={milestoneForm.milestone_code} />
              <FormInput label="Due date" onChange={(value) => setMilestoneForm((current) => ({ ...current, due_date: value }))} type="date" value={milestoneForm.due_date} />
              <FormSelect label="Status" onChange={(value) => setMilestoneForm((current) => ({ ...current, status: value }))} value={milestoneForm.status}><option value="draft">Draft</option><option value="open">Open</option><option value="submitted">Submitted</option></FormSelect>
              <FormInput label="Amount" onChange={(value) => setMilestoneForm((current) => ({ ...current, amount: value }))} type="number" value={milestoneForm.amount} />
              <FormInput label="Currency" onChange={(value) => setMilestoneForm((current) => ({ ...current, currency_code: value.toUpperCase().slice(0, 3) }))} value={milestoneForm.currency_code} />
            </div>
            <Textarea label="Description" onChange={(value) => setMilestoneForm((current) => ({ ...current, description: value }))} value={milestoneForm.description} />
            <Textarea help="Acceptance criteria should state what HR, manager, or client must confirm before payment readiness." label="Acceptance criteria" onChange={(value) => setMilestoneForm((current) => ({ ...current, acceptance_criteria: value }))} value={milestoneForm.acceptance_criteria} />
            <Textarea help="Payment trigger metadata records downstream payroll/invoice intent without automatically paying the worker." label="Payment trigger" mono onChange={(value) => setMilestoneForm((current) => ({ ...current, payment_trigger: value }))} value={milestoneForm.payment_trigger} />
            <Textarea label="Notes" onChange={(value) => setMilestoneForm((current) => ({ ...current, notes: value }))} value={milestoneForm.notes} />
            <Textarea help="Use JSON only for extra machine-readable fields such as source system or import batch." label="Metadata" mono onChange={(value) => setMilestoneForm((current) => ({ ...current, metadata: value }))} value={milestoneForm.metadata} />
            <ModalActions saving={saving} onCancel={() => setMilestoneModal({ open: false, editing: null })} submitLabel="Save Milestone" />
          </form>
        </Modal>
      ) : null}

      {reviewTarget ? (
        <Modal title={reviewTarget.status === "accepted" ? "Accept Milestone" : "Reject Milestone"} onClose={() => setReviewTarget(null)} size="sm">
          <div className="grid gap-5 p-6">
            <div><p className="text-sm font-bold text-[#111827]">{reviewTarget.item.title}</p><p className="mt-1 text-sm font-semibold text-[#6b7280]">{reviewTarget.item.project_name || "Project"} / {formatMoney(reviewTarget.item.amount, reviewTarget.item.currency_code)}</p></div>
            <Textarea label="Review comment" onChange={setReviewComment} value={reviewComment} />
            <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
              <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setReviewTarget(null)} type="button">Cancel</button>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveReview} type="button">{saving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function ProjectsTable({ projects, loading, onEdit, onAddMilestone }: { projects: Project[]; loading: boolean; onEdit: (item: Project) => void; onAddMilestone: (projectID: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left">
        <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Project</th><th className="px-5 py-4">Owner</th><th className="px-5 py-4">Dates</th><th className="px-5 py-4">Budget</th><th className="px-5 py-4">Milestones</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-[#edf1ef]">
          {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading projects...</td></tr> : projects.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No projects found.</td></tr> : projects.map((item) => (
            <tr className="hover:bg-[#f8faf9]" key={item.id}>
              <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.project_code || item.client_label || "No code"}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{item.department_name || item.branch_name || "-"}<span className="block text-xs font-semibold text-[#6b7280]">{item.project_manager_id || ""}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.start_date)}<span className="block text-xs font-semibold text-[#6b7280]">Due {formatDate(item.due_date)}</span></td>
              <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{formatMoney(item.budget_amount, item.currency_code)}<span className="block text-xs font-semibold text-[#6b7280]">Accepted {formatMoney(item.accepted_amount, item.currency_code)}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{item.milestone_count || 0} total<span className="block text-xs font-semibold text-[#6b7280]">{item.submitted_milestone_count || 0} pending / {item.accepted_milestone_count || 0} accepted</span></td>
              <td className="px-5 py-5"><StatusChip value={labelFor(projectStatusOptions, item.status)} /></td>
              <td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => onEdit(item)} type="button">Edit</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => onAddMilestone(item.id)} type="button">Milestone</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MilestonesTable({ milestones, loading, onEdit, onSubmit, onAccept, onReject }: { milestones: Milestone[]; loading: boolean; onEdit: (item: Milestone) => void; onSubmit: (item: Milestone) => void; onAccept: (item: Milestone) => void; onReject: (item: Milestone) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left">
        <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Milestone</th><th className="px-5 py-4">Project</th><th className="px-5 py-4">Engagement</th><th className="px-5 py-4">Due</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-[#edf1ef]">
          {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading milestones...</td></tr> : milestones.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No milestones found.</td></tr> : milestones.map((item) => (
            <tr className="hover:bg-[#f8faf9]" key={item.id}>
              <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.title}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.milestone_code || item.acceptance_criteria || "No criteria"}</span></td>
              <td className="px-5 py-5 text-sm font-bold text-[#111827]">{item.project_name || item.project_id}<span className="block text-xs font-semibold text-[#6b7280]">{item.project_code || ""}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{item.engagement_title || "-"}<span className="block text-xs font-semibold text-[#6b7280]">{item.worker_display_name || ""}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.due_date)}</td>
              <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{formatMoney(item.amount, item.currency_code)}</td>
              <td className="px-5 py-5"><StatusChip value={labelFor(milestoneStatusOptions, item.status)} /></td>
              <td className="px-5 py-5 text-right"><MilestoneActions item={item} onAccept={onAccept} onEdit={onEdit} onReject={onReject} onSubmit={onSubmit} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MilestoneBoard({ milestones, onEdit, onSubmit, onAccept, onReject }: { milestones: Milestone[]; onEdit: (item: Milestone) => void; onSubmit: (item: Milestone) => void; onAccept: (item: Milestone) => void; onReject: (item: Milestone) => void }) {
  const columns = ["draft", "open", "submitted", "accepted", "rejected"];
  return (
    <div className="grid gap-4 p-5 xl:grid-cols-5">
      {columns.map((status) => (
        <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9]" key={status}>
          <div className="border-b border-[#edf1ef] px-4 py-3 text-sm font-black text-[#111827]">{labelFor(milestoneStatusOptions, status)}</div>
          <div className="grid gap-3 p-3">
            {milestones.filter((item) => item.status === status).map((item) => (
              <div className="rounded-xl border border-[#edf1ef] bg-white p-4 shadow-sm" key={item.id}>
                <strong className="block text-sm text-[#111827]">{item.title}</strong>
                <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.project_name || "Project"} / {formatMoney(item.amount, item.currency_code)}</span>
                <div className="mt-3"><MilestoneActions item={item} onAccept={onAccept} onEdit={onEdit} onReject={onReject} onSubmit={onSubmit} /></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MilestoneActions({ item, onEdit, onSubmit, onAccept, onReject }: { item: Milestone; onEdit: (item: Milestone) => void; onSubmit: (item: Milestone) => void; onAccept: (item: Milestone) => void; onReject: (item: Milestone) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {item.status !== "accepted" ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => onEdit(item)} type="button">Edit</button> : null}
      {["draft", "open", "rejected"].includes(item.status) ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => onSubmit(item)} type="button">Submit</button> : null}
      {item.status === "submitted" ? <button className="rounded-lg border border-emerald-100 px-3 py-2 text-xs font-black text-emerald-700" onClick={() => onAccept(item)} type="button">Accept</button> : null}
      {item.status === "submitted" ? <button className="rounded-lg border border-amber-100 px-3 py-2 text-xs font-black text-amber-700" onClick={() => onReject(item)} type="button">Reject</button> : null}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number | string; tone?: "warning" }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${tone === "warning" ? "border-amber-100 bg-amber-50" : "border-[#edf1ef] bg-white"}`}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-3 block text-2xl font-black text-[#111827]">{value}</strong></div>;
}

function StatusChip({ value }: { value: string }) {
  return <span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-black text-[#588368]">{value}</span>;
}

function InfoButton({ text }: { text: string }) {
  return <span className="group relative inline-flex"><button aria-label={text} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" type="button">i</button><span className="pointer-events-none absolute left-0 top-7 z-20 hidden w-64 rounded-xl border border-[#edf1ef] bg-white p-3 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span></span>;
}

function Modal({ title, onClose, children, size = "lg" }: { title: string; onClose: () => void; children: ReactNode; size?: "sm" | "lg" }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 px-4 py-6"><div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${size === "sm" ? "max-w-xl" : "max-w-5xl"}`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf1ef] bg-white px-6 py-5"><h2 className="text-xl font-black text-[#111827]">{title}</h2><button className="rounded-full border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={onClose} type="button">Close</button></div>{children}</div></div>;
}

function FormInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{label}<input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-medium outline-none focus:border-[#588368]" min={type === "number" ? "0" : undefined} onChange={(event) => onChange(event.target.value)} required={required} step={type === "number" ? "0.01" : undefined} type={type} value={value} /></label>;
}

function FormSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{label}<select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function Textarea({ label, value, onChange, help, mono = false }: { label: string; value: string; onChange: (value: string) => void; help?: string; mono?: boolean }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]"><span className="flex items-center gap-2">{label}{help ? <InfoButton text={help} /> : null}</span><textarea className={`min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368] ${mono ? "font-mono text-xs" : "font-medium"}`} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function ModalActions({ saving, onCancel, submitLabel }: { saving: boolean; onCancel: () => void; submitLabel: string }) {
  return <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5"><button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : submitLabel}</button></div>;
}
