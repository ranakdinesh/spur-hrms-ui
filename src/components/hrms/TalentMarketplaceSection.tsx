"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Project = { id: string; name: string; project_code?: string | null };
type Engagement = { id: string; title: string; engagement_code?: string | null; worker_display_name?: string | null };
type Requirement = { id: string; skill_name?: string | null; project_name?: string | null; engagement_title?: string | null };
type Worker = { id: string; display_name?: string | null; worker_code?: string | null };
type JobPosting = { id: string; title: string; posting_code?: string | null };
type JobPostingPage = { items: JobPosting[] };
type Opportunity = {
  id: string;
  project_id?: string | null;
  engagement_id?: string | null;
  source_requirement_id?: string | null;
  job_posting_id?: string | null;
  title: string;
  description?: string | null;
  opportunity_type: string;
  status: string;
  visibility: string;
  priority: string;
  seats: number;
  location_mode: string;
  min_allocation_percent?: number | null;
  duration_label?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  candidate_fallback_enabled: boolean;
  candidate_fallback_status: string;
  project_name?: string | null;
  project_code?: string | null;
  engagement_title?: string | null;
  engagement_code?: string | null;
  job_posting_title?: string | null;
  job_posting_code?: string | null;
  application_count: number;
  recommended_count: number;
  selected_count: number;
};
type Application = {
  id: string;
  opportunity_id: string;
  worker_profile_id: string;
  status: string;
  match_score?: number | null;
  worker_note?: string | null;
  manager_note?: string | null;
  opportunity_title?: string | null;
  worker_display_name?: string | null;
  worker_code?: string | null;
  project_name?: string | null;
  engagement_title?: string | null;
};
type Recommendation = {
  worker_profile_id: string;
  worker_display_name: string;
  worker_code?: string | null;
  required_skill_count: number;
  matched_skill_count: number;
  missing_skill_count: number;
  match_score: number;
  match_reasons?: { matched_skills?: string[]; missing_skills?: string[] };
  application_id?: string | null;
  application_status?: string | null;
};
type EventRow = {
  id: string;
  opportunity_id?: string | null;
  application_id?: string | null;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  notes?: string | null;
  created_at: string;
  opportunity_title?: string | null;
  worker_display_name?: string | null;
};
type Tab = "opportunities" | "recommendations" | "applications" | "events";

const opportunityTypes = ["project_assignment", "gig", "role", "mentorship", "stretch", "backfill"];
const statuses = ["draft", "open", "paused", "filled", "closed", "cancelled"];
const visibilities = ["all_workers", "invited", "manager_nomination"];
const priorities = ["low", "normal", "high", "critical"];
const locationModes = ["onsite", "remote", "hybrid", "flexible"];
const fallbackStatuses = ["not_needed", "monitoring", "recommended", "opened"];
const applicationStatuses = ["recommended", "invited", "interested", "applied", "accepted", "declined", "withdrawn", "rejected", "assigned"];

const inputClass = "w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]";

function defaultOpportunityForm() {
  return {
    project_id: "",
    engagement_id: "",
    source_requirement_id: "",
    job_posting_id: "",
    title: "",
    description: "",
    opportunity_type: "project_assignment",
    status: "open",
    visibility: "all_workers",
    priority: "normal",
    seats: "1",
    location_mode: "hybrid",
    min_allocation_percent: "",
    duration_label: "",
    start_date: "",
    due_date: "",
    candidate_fallback_enabled: false,
    candidate_fallback_status: "not_needed",
  };
}

export function TalentMarketplaceSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Talent Marketplace" subtitle="Open a tenant to manage internal opportunities, worker matches, and staffing decisions." />
        {tenantsError ? <Alert tone="danger" text={tenantsError} /> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => (
                <tr className="hover:bg-[#f8faf9]" key={row.id}>
                  <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code}</span></td>
                  <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td>
                  <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td>
                  <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setTenant(row)} type="button">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  }

  return <TalentMarketplaceWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function TalentMarketplaceWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("opportunities");
  const [projects, setProjects] = useState<Project[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedOpportunityID, setSelectedOpportunityID] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [opportunityModal, setOpportunityModal] = useState(false);
  const [applicationModal, setApplicationModal] = useState(false);
  const [fallbackModal, setFallbackModal] = useState(false);
  const [statusModal, setStatusModal] = useState<Application | null>(null);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [opportunityForm, setOpportunityForm] = useState(defaultOpportunityForm());
  const [applicationForm, setApplicationForm] = useState({ opportunity_id: "", worker_profile_id: "", status: "applied", match_score: "", worker_note: "", manager_note: "" });
  const [fallbackForm, setFallbackForm] = useState({ status: "monitoring", notes: "" });
  const [applicationStatusForm, setApplicationStatusForm] = useState({ status: "accepted", worker_note: "", manager_note: "" });

  const selectedOpportunity = opportunities.find((item) => item.id === selectedOpportunityID) || opportunities[0];

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const suffix = params.toString() ? `?${params}` : "";
    const [projectRows, engagementRows, requirementRows, workerRows, postingRows, opportunityRows, applicationRows, eventRows] = await Promise.all([
      apiRequest<Project[]>(`${basePath}/projects`).catch(() => []),
      apiRequest<Engagement[]>(`${basePath}/engagements`).catch(() => []),
      apiRequest<Requirement[]>(`${basePath}/project-skill-requirements`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<JobPostingPage>(`${basePath}/job-postings?limit=200`).catch(() => ({ items: [] })),
      apiRequest<Opportunity[]>(`${basePath}/talent-marketplace-opportunities${suffix}`).catch(() => []),
      apiRequest<Application[]>(`${basePath}/talent-marketplace-applications`).catch(() => []),
      apiRequest<EventRow[]>(`${basePath}/talent-marketplace-events`).catch(() => []),
    ]);
    setProjects(projectRows);
    setEngagements(engagementRows);
    setRequirements(requirementRows);
    setWorkers(workerRows);
    setJobPostings(postingRows.items || []);
    setOpportunities(opportunityRows);
    setApplications(applicationRows);
    setEvents(eventRows);
    setSelectedOpportunityID((current) => current || opportunityRows[0]?.id || "");
    setApplicationForm((current) => ({ ...current, opportunity_id: current.opportunity_id || opportunityRows[0]?.id || "", worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "" }));
  }, [basePath, search, statusFilter]);

  const loadRecommendations = useCallback(async (opportunityID: string) => {
    if (!opportunityID) {
      setRecommendations([]);
      return;
    }
    const rows = await apiRequest<Recommendation[]>(`${basePath}/talent-marketplace-opportunities/${opportunityID}/recommendations`).catch(() => []);
    setRecommendations(rows);
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load talent marketplace."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecommendations(selectedOpportunityID).catch((err) => setError(err instanceof Error ? err.message : "Unable to load recommendations."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecommendations, selectedOpportunityID]);

  const metrics = useMemo(() => {
    const open = opportunities.filter((item) => item.status === "open").length;
    const selected = opportunities.reduce((sum, item) => sum + (item.selected_count || 0), 0);
    const fallback = opportunities.filter((item) => item.candidate_fallback_status !== "not_needed").length;
    return { opportunities: opportunities.length, open, applications: applications.length, selected, fallback };
  }, [applications.length, opportunities]);

  function openOpportunity(item?: Opportunity) {
    setEditing(item || null);
    setOpportunityForm(item ? {
      project_id: item.project_id || "",
      engagement_id: item.engagement_id || "",
      source_requirement_id: item.source_requirement_id || "",
      job_posting_id: item.job_posting_id || "",
      title: item.title,
      description: item.description || "",
      opportunity_type: item.opportunity_type,
      status: item.status,
      visibility: item.visibility,
      priority: item.priority,
      seats: String(item.seats || 1),
      location_mode: item.location_mode,
      min_allocation_percent: item.min_allocation_percent == null ? "" : String(item.min_allocation_percent),
      duration_label: item.duration_label || "",
      start_date: dateInput(item.start_date),
      due_date: dateInput(item.due_date),
      candidate_fallback_enabled: item.candidate_fallback_enabled,
      candidate_fallback_status: item.candidate_fallback_status,
    } : { ...defaultOpportunityForm(), project_id: projects[0]?.id || "", engagement_id: engagements[0]?.id || "" });
    setOpportunityModal(true);
  }

  async function submitOpportunity() {
    setError(""); setNotice("");
    const payload = {
      project_id: opportunityForm.project_id || null,
      engagement_id: opportunityForm.engagement_id || null,
      source_requirement_id: opportunityForm.source_requirement_id || null,
      job_posting_id: opportunityForm.job_posting_id || null,
      title: opportunityForm.title,
      description: opportunityForm.description || null,
      opportunity_type: opportunityForm.opportunity_type,
      status: opportunityForm.status,
      visibility: opportunityForm.visibility,
      priority: opportunityForm.priority,
      seats: Number(opportunityForm.seats || 1),
      location_mode: opportunityForm.location_mode,
      min_allocation_percent: opportunityForm.min_allocation_percent ? Number(opportunityForm.min_allocation_percent) : null,
      duration_label: opportunityForm.duration_label || null,
      start_date: opportunityForm.start_date,
      due_date: opportunityForm.due_date,
      candidate_fallback_enabled: opportunityForm.candidate_fallback_enabled,
      candidate_fallback_status: opportunityForm.candidate_fallback_status,
      metadata: {},
    };
    const path = editing ? `${basePath}/talent-marketplace-opportunities/${editing.id}` : `${basePath}/talent-marketplace-opportunities`;
    const saved = await apiRequest<Opportunity>(path, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
    setSelectedOpportunityID(saved.id);
    setNotice(editing ? "Opportunity updated." : "Opportunity created.");
    setOpportunityModal(false);
    setEditing(null);
    await load();
  }

  async function deleteOpportunity(item: Opportunity) {
    if (!window.confirm(`Deactivate ${item.title}?`)) return;
    setError(""); setNotice("");
    await apiRequest(`${basePath}/talent-marketplace-opportunities/${item.id}`, { method: "DELETE" });
    setNotice("Opportunity deactivated.");
    setSelectedOpportunityID("");
    await load();
  }

  async function submitApplication() {
    setError(""); setNotice("");
    const payload = {
      opportunity_id: applicationForm.opportunity_id,
      worker_profile_id: applicationForm.worker_profile_id,
      status: applicationForm.status,
      match_score: applicationForm.match_score ? Number(applicationForm.match_score) : null,
      match_reasons: {},
      worker_note: applicationForm.worker_note || null,
      manager_note: applicationForm.manager_note || null,
    };
    await apiRequest(`${basePath}/talent-marketplace-applications`, { method: "POST", body: JSON.stringify(payload) });
    setNotice("Application recorded.");
    setApplicationModal(false);
    await load();
    await loadRecommendations(applicationForm.opportunity_id);
  }

  async function inviteRecommendation(row: Recommendation) {
    const payload = {
      opportunity_id: selectedOpportunityID,
      worker_profile_id: row.worker_profile_id,
      status: "invited",
      match_score: row.match_score,
      match_reasons: row.match_reasons || {},
      manager_note: "Invited from talent marketplace recommendation",
    };
    await apiRequest(`${basePath}/talent-marketplace-applications`, { method: "POST", body: JSON.stringify(payload) });
    setNotice("Worker invited.");
    await load();
    await loadRecommendations(selectedOpportunityID);
  }

  function openFallback(item: Opportunity) {
    setSelectedOpportunityID(item.id);
    setFallbackForm({ status: item.candidate_fallback_status === "not_needed" ? "monitoring" : item.candidate_fallback_status, notes: "" });
    setFallbackModal(true);
  }

  async function submitFallback() {
    if (!selectedOpportunityID) return;
    setError(""); setNotice("");
    await apiRequest(`${basePath}/talent-marketplace-opportunities/${selectedOpportunityID}/candidate-fallback`, { method: "POST", body: JSON.stringify(fallbackForm) });
    setNotice("Candidate fallback updated.");
    setFallbackModal(false);
    await load();
  }

  function openApplicationStatus(item: Application, status = item.status) {
    setStatusModal(item);
    setApplicationStatusForm({ status, worker_note: item.worker_note || "", manager_note: item.manager_note || "" });
  }

  async function submitApplicationStatus() {
    if (!statusModal) return;
    setError(""); setNotice("");
    await apiRequest(`${basePath}/talent-marketplace-applications/${statusModal.id}/status`, { method: "POST", body: JSON.stringify(applicationStatusForm) });
    setNotice("Application status updated.");
    setStatusModal(null);
    await load();
    await loadRecommendations(selectedOpportunityID);
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title="Talent Marketplace" subtitle={tenant ? tenant.name : "Internal opportunities, skills-based matches, applications, and staffing history."} action={<div className="flex gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}<button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openOpportunity()} type="button">New Opportunity</button></div>} />
      {notice ? <Alert tone="success" text={notice} /> : null}
      {error ? <Alert tone="danger" text={error} /> : null}

      <section className="grid gap-4 md:grid-cols-5">
        <Metric label="Opportunities" value={String(metrics.opportunities)} />
        <Metric label="Open" value={String(metrics.open)} />
        <Metric label="Applications" value={String(metrics.applications)} />
        <Metric label="Selected" value={String(metrics.selected)} />
        <Metric label="Fallbacks" value={String(metrics.fallback)} />
      </section>

      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <input className={inputClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search opportunity, project, engagement" value={search} />
          <select className={inputClass} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setApplicationModal(true)} type="button">Record Application</button>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {(["opportunities", "recommendations", "applications", "events"] as Tab[]).map((item) => (
          <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>
        ))}
      </section>

      {tab === "opportunities" ? <OpportunityCards onDelete={deleteOpportunity} onEdit={openOpportunity} onFallback={openFallback} onSelect={(item) => { setSelectedOpportunityID(item.id); setTab("recommendations"); }} rows={opportunities} selectedID={selectedOpportunityID} /> : null}
      {tab === "recommendations" ? <RecommendationsPanel onInvite={inviteRecommendation} onSelectOpportunity={setSelectedOpportunityID} opportunities={opportunities} rows={recommendations} selectedOpportunity={selectedOpportunity} selectedOpportunityID={selectedOpportunityID} /> : null}
      {tab === "applications" ? <ApplicationsTable onStatus={openApplicationStatus} rows={applications} /> : null}
      {tab === "events" ? <EventsTable rows={events} /> : null}

      <OpportunityModal editing={editing} engagements={engagements} form={opportunityForm} jobPostings={jobPostings} onClose={() => setOpportunityModal(false)} onChange={setOpportunityForm} onSubmit={() => void submitOpportunity().catch((err) => setError(err instanceof Error ? err.message : "Unable to save opportunity."))} open={opportunityModal} projects={projects} requirements={requirements} />

      <HrmsModal onClose={() => setApplicationModal(false)} open={applicationModal} title="Record Application">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Opportunity"><select className={inputClass} value={applicationForm.opportunity_id} onChange={(event) => setApplicationForm({ ...applicationForm, opportunity_id: event.target.value })}>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
            <Field label="Worker"><select className={inputClass} value={applicationForm.worker_profile_id} onChange={(event) => setApplicationForm({ ...applicationForm, worker_profile_id: event.target.value })}>{workers.map((item) => <option key={item.id} value={item.id}>{item.display_name || item.worker_code || item.id}</option>)}</select></Field>
            <Field label="Status"><select className={inputClass} value={applicationForm.status} onChange={(event) => setApplicationForm({ ...applicationForm, status: event.target.value })}>{applicationStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
            <Field label="Match Score"><input className={inputClass} max="100" min="0" type="number" value={applicationForm.match_score} onChange={(event) => setApplicationForm({ ...applicationForm, match_score: event.target.value })} /></Field>
          </div>
          <Field label="Worker Note"><textarea className={`${inputClass} min-h-20`} value={applicationForm.worker_note} onChange={(event) => setApplicationForm({ ...applicationForm, worker_note: event.target.value })} /></Field>
          <Field label="Manager Note"><textarea className={`${inputClass} min-h-20`} value={applicationForm.manager_note} onChange={(event) => setApplicationForm({ ...applicationForm, manager_note: event.target.value })} /></Field>
          <ModalActions onCancel={() => setApplicationModal(false)} onSubmit={() => void submitApplication().catch((err) => setError(err instanceof Error ? err.message : "Unable to record application."))} />
        </div>
      </HrmsModal>

      <HrmsModal onClose={() => setFallbackModal(false)} open={fallbackModal} title="Candidate Fallback">
        <div className="space-y-5">
          <Field label="Fallback Status"><select className={inputClass} value={fallbackForm.status} onChange={(event) => setFallbackForm({ ...fallbackForm, status: event.target.value })}>{fallbackStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={fallbackForm.notes} onChange={(event) => setFallbackForm({ ...fallbackForm, notes: event.target.value })} /></Field>
          <ModalActions onCancel={() => setFallbackModal(false)} onSubmit={() => void submitFallback().catch((err) => setError(err instanceof Error ? err.message : "Unable to update fallback."))} />
        </div>
      </HrmsModal>

      <HrmsModal onClose={() => setStatusModal(null)} open={Boolean(statusModal)} title="Update Application">
        <div className="space-y-5">
          <Field label="Status"><select className={inputClass} value={applicationStatusForm.status} onChange={(event) => setApplicationStatusForm({ ...applicationStatusForm, status: event.target.value })}>{applicationStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Worker Note"><textarea className={`${inputClass} min-h-20`} value={applicationStatusForm.worker_note} onChange={(event) => setApplicationStatusForm({ ...applicationStatusForm, worker_note: event.target.value })} /></Field>
          <Field label="Manager Note"><textarea className={`${inputClass} min-h-20`} value={applicationStatusForm.manager_note} onChange={(event) => setApplicationStatusForm({ ...applicationStatusForm, manager_note: event.target.value })} /></Field>
          <ModalActions onCancel={() => setStatusModal(null)} onSubmit={() => void submitApplicationStatus().catch((err) => setError(err instanceof Error ? err.message : "Unable to update application."))} />
        </div>
      </HrmsModal>
    </main>
  );
}

function OpportunityModal({ editing, engagements, form, jobPostings, onChange, onClose, onSubmit, open, projects, requirements }: { editing: Opportunity | null; engagements: Engagement[]; form: ReturnType<typeof defaultOpportunityForm>; jobPostings: JobPosting[]; onChange: (form: ReturnType<typeof defaultOpportunityForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; projects: Project[]; requirements: Requirement[] }) {
  return (
    <HrmsModal onClose={onClose} open={open} title={editing ? "Edit Opportunity" : "New Opportunity"}>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title"><input className={inputClass} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></Field>
          <Field label="Type"><select className={inputClass} value={form.opportunity_type} onChange={(event) => onChange({ ...form, opportunity_type: event.target.value })}>{opportunityTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Project"><select className={inputClass} value={form.project_id} onChange={(event) => onChange({ ...form, project_id: event.target.value })}><option value="">No project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Engagement"><select className={inputClass} value={form.engagement_id} onChange={(event) => onChange({ ...form, engagement_id: event.target.value })}><option value="">No engagement</option>{engagements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
          <Field label="Skill Requirement"><select className={inputClass} value={form.source_requirement_id} onChange={(event) => onChange({ ...form, source_requirement_id: event.target.value })}><option value="">No requirement</option>{requirements.map((item) => <option key={item.id} value={item.id}>{item.skill_name || item.project_name || item.engagement_title || item.id}</option>)}</select></Field>
          <Field label="Fallback Job Posting"><select className={inputClass} value={form.job_posting_id} onChange={(event) => onChange({ ...form, job_posting_id: event.target.value })}><option value="">No posting</option>{jobPostings.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
          <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value })}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Visibility"><select className={inputClass} value={form.visibility} onChange={(event) => onChange({ ...form, visibility: event.target.value })}>{visibilities.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(event) => onChange({ ...form, priority: event.target.value })}>{priorities.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Location Mode"><select className={inputClass} value={form.location_mode} onChange={(event) => onChange({ ...form, location_mode: event.target.value })}>{locationModes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          <Field label="Seats"><input className={inputClass} min="1" type="number" value={form.seats} onChange={(event) => onChange({ ...form, seats: event.target.value })} /></Field>
          <Field label="Allocation %"><input className={inputClass} max="100" min="1" type="number" value={form.min_allocation_percent} onChange={(event) => onChange({ ...form, min_allocation_percent: event.target.value })} /></Field>
          <Field label="Duration"><input className={inputClass} value={form.duration_label} onChange={(event) => onChange({ ...form, duration_label: event.target.value })} /></Field>
          <Field label="Start Date"><input className={inputClass} type="date" value={form.start_date} onChange={(event) => onChange({ ...form, start_date: event.target.value })} /></Field>
          <Field label="Due Date"><input className={inputClass} type="date" value={form.due_date} onChange={(event) => onChange({ ...form, due_date: event.target.value })} /></Field>
          <Field label="Fallback Status"><select className={inputClass} value={form.candidate_fallback_status} onChange={(event) => onChange({ ...form, candidate_fallback_status: event.target.value })}>{fallbackStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.candidate_fallback_enabled} onChange={(event) => onChange({ ...form, candidate_fallback_enabled: event.target.checked })} type="checkbox" /> Enable candidate fallback</label>
        <Field label="Description"><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></Field>
        <ModalActions onCancel={onClose} onSubmit={onSubmit} />
      </div>
    </HrmsModal>
  );
}

function OpportunityCards({ onDelete, onEdit, onFallback, onSelect, rows, selectedID }: { onDelete: (row: Opportunity) => void; onEdit: (row: Opportunity) => void; onFallback: (row: Opportunity) => void; onSelect: (row: Opportunity) => void; rows: Opportunity[]; selectedID: string }) {
  if (!rows.length) return <Empty text="No talent opportunities yet." />;
  return <section className="grid gap-4 xl:grid-cols-2">{rows.map((row) => <article className={`rounded-2xl border bg-white p-5 shadow-sm ${row.id === selectedID ? "border-[#588368]" : "border-[#edf1ef]"}`} key={row.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-[#111827]">{row.title}</h2><p className="mt-1 text-sm font-bold text-[#6b7280]">{row.project_name || row.engagement_title || "Open workforce opportunity"}</p></div><Pill value={row.status} /></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><Mini label="Seats" value={String(row.seats)} /><Mini label="Selected" value={String(row.selected_count || 0)} /><Mini label="Apps" value={String(row.application_count || 0)} /><Mini label="Fallback" value={label(row.candidate_fallback_status)} /></div><p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-[#4b5563]">{row.description || `${label(row.opportunity_type)} · ${label(row.location_mode)} · ${label(row.priority)}`}</p><div className="mt-5 flex flex-wrap gap-2"><button className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white" onClick={() => onSelect(row)} type="button">Matches</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onFallback(row)} type="button">Fallback</button><button className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => onDelete(row)} type="button">Delete</button></div></article>)}</section>;
}

function RecommendationsPanel({ onInvite, onSelectOpportunity, opportunities, rows, selectedOpportunity, selectedOpportunityID }: { onInvite: (row: Recommendation) => void; onSelectOpportunity: (id: string) => void; opportunities: Opportunity[]; rows: Recommendation[]; selectedOpportunity?: Opportunity; selectedOpportunityID: string }) {
  return <section className="space-y-4"><div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 md:grid-cols-[1fr_auto]"><select className={inputClass} value={selectedOpportunityID} onChange={(event) => onSelectOpportunity(event.target.value)}>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><Pill value={selectedOpportunity?.candidate_fallback_status || "not_needed"} /></div></div>{rows.length ? <Table headers={["Worker", "Score", "Coverage", "Matched", "Missing", "Status", "Actions"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.worker_profile_id}><Cell title={row.worker_display_name} sub={row.worker_code || ""} /><td className="px-5 py-4 font-black">{Math.round(row.match_score)}%</td><td className="px-5 py-4 text-sm font-bold">{row.matched_skill_count}/{row.required_skill_count}</td><td className="px-5 py-4 text-xs font-bold text-[#237a45]">{(row.match_reasons?.matched_skills || []).slice(0, 3).join(", ") || "-"}</td><td className="px-5 py-4 text-xs font-bold text-[#b91c1c]">{(row.match_reasons?.missing_skills || []).slice(0, 3).join(", ") || "-"}</td><td className="px-5 py-4">{row.application_status ? <Pill value={row.application_status} /> : <span className="text-sm font-bold text-[#6b7280]">No application</span>}</td><td className="px-5 py-4 text-right">{row.application_id ? null : <button className="rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white" onClick={() => onInvite(row)} type="button">Invite</button>}</td></tr>)}</Table> : <Empty text="No recommendations for the selected opportunity." />}</section>;
}

function ApplicationsTable({ onStatus, rows }: { onStatus: (row: Application, status?: string) => void; rows: Application[] }) {
  return <Table empty="No marketplace applications yet." headers={["Opportunity", "Worker", "Score", "Status", "Notes", "Actions"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><Cell title={row.opportunity_title || row.opportunity_id} sub={row.project_name || row.engagement_title || ""} /><Cell title={row.worker_display_name || row.worker_profile_id} sub={row.worker_code || ""} /><td className="px-5 py-4 font-bold">{row.match_score == null ? "-" : `${Math.round(row.match_score)}%`}</td><td className="px-5 py-4"><Pill value={row.status} /></td><td className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{row.manager_note || row.worker_note || "-"}</td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onStatus(row, "accepted")} type="button">Accept</button><button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onStatus(row, "assigned")} type="button">Assign</button><button className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => onStatus(row, "declined")} type="button">Decline</button></td></tr>)}</Table>;
}

function EventsTable({ rows }: { rows: EventRow[] }) {
  return <Table empty="No marketplace event history yet." headers={["Time", "Opportunity", "Worker", "Action", "Status", "Notes"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4 text-sm font-bold">{formatDateTime(row.created_at)}</td><Cell title={row.opportunity_title || row.opportunity_id || "-"} /><td className="px-5 py-4 text-sm font-bold">{row.worker_display_name || "-"}</td><td className="px-5 py-4"><Pill value={row.action} /></td><td className="px-5 py-4 text-sm font-bold">{row.from_status ? `${label(row.from_status)} -> ${label(row.to_status || "")}` : label(row.to_status || "")}</td><td className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{row.notes || "-"}</td></tr>)}</Table>;
}

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black text-[#111827]">{title}</h1><p className="mt-2 text-sm font-semibold text-[#6b7280]">{subtitle}</p></div>{action}</div>;
}

function Alert({ text, tone }: { text: string; tone: "success" | "danger" }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-[#b7e2c5] bg-[#f0fbf4] text-[#237a45]" : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"}`}>{text}</div>;
}

function Metric({ label: metricLabel, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{metricLabel}</p><p className="mt-2 text-3xl font-black text-[#111827]">{value}</p></div>;
}

function Mini({ label: miniLabel, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f8faf9] p-3"><p className="text-[11px] font-black uppercase tracking-wide text-[#6b7280]">{miniLabel}</p><p className="mt-1 text-sm font-black text-[#111827]">{value}</p></div>;
}

function Field({ children, label: fieldLabel }: { children: ReactNode; label: string }) {
  return <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}<button className="grid size-5 place-items-center rounded-full border border-[#dbe0e5] text-[11px]" title={`Configure ${fieldLabel.toLowerCase()}`} type="button">i</button></span>{children}</label>;
}

function ModalActions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function Table({ children, empty, headers }: { children: ReactNode; empty?: string; headers: string[] }) {
  const rows = Array.isArray(children) ? children : [children];
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><table className="w-full min-w-[920px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((item) => <th className="px-5 py-4" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.length && rows.some(Boolean) ? children : <tr><td className="px-5 py-10 text-center text-sm font-bold text-[#6b7280]" colSpan={headers.length}>{empty || "No rows."}</td></tr>}</tbody></table></section>;
}

function Empty({ text }: { text: string }) {
  return <section className="rounded-2xl border border-[#edf1ef] bg-white p-10 text-center text-sm font-bold text-[#6b7280] shadow-sm">{text}</section>;
}

function Cell({ sub, title }: { sub?: string; title: string }) {
  return <td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{title}</strong>{sub ? <span className="mt-1 block text-xs font-bold text-[#6b7280]">{sub}</span> : null}</td>;
}

function Pill({ value }: { value: string }) {
  const tone = value === "critical" || value === "declined" || value === "rejected" ? "bg-[#fee2e2] text-[#b91c1c]" : value === "open" || value === "accepted" || value === "assigned" ? "bg-[#e7f6ed] text-[#237a45]" : value === "recommended" || value === "invited" || value === "monitoring" || value === "opened" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone}`}>{label(value)}</span>;
}

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString() : "-";
}
