"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name: string; worker_code?: string | null };
type SkillCategory = { id: string; code: string; name: string; description?: string | null; source_scope: string; parent_id?: string | null; parent_name?: string | null; sort_order: number };
type Skill = { id: string; category_id?: string | null; code: string; name: string; description?: string | null; skill_type: string; source_scope: string; certificate_required: boolean; assessment_required: boolean; is_active: boolean; category_name?: string | null };
type WorkerSkill = {
  id: string;
  worker_profile_id: string;
  skill_id: string;
  skill_name_snapshot: string;
  proficiency: string;
  years_experience?: number | null;
  last_used_on?: string | null;
  verification_status: string;
  certificate_url?: string | null;
  certificate_expires_on?: string | null;
  assessment_score?: number | null;
  assessed_on?: string | null;
  notes?: string | null;
  worker_display_name?: string | null;
  worker_code?: string | null;
  skill_code?: string | null;
  skill_name?: string | null;
  skill_type?: string | null;
  skill_source_scope?: string | null;
  certificate_required: boolean;
  assessment_required: boolean;
  category_name?: string | null;
};
type SkillAssessment = { id: string; worker_skill_id: string; assessment_type: string; result_status: string; score?: number | null; max_score?: number | null; assessed_on: string; evidence_url?: string | null; notes?: string | null };
type SummaryRow = { status: string; worker_skill_count: number; worker_count: number; skill_count: number; expiring_certificate_count: number };
type Tab = "worker-skills" | "catalog" | "assessments";
type ModalState = "" | "category" | "skill" | "worker-skill" | "verify" | "assessment";

const skillTypes = ["technical", "functional", "behavioral", "compliance", "tool", "language", "domain", "custom"];
const proficiencies = ["beginner", "intermediate", "advanced", "expert"];
const verificationStatuses = ["self_declared", "manager_endorsed", "hr_verified", "expired", "rejected"];
const assessmentTypes = ["self", "manager", "hr", "external"];
const resultStatuses = ["submitted", "observed", "passed", "failed"];

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function dateText(value?: string | null) {
  return dateOnly(value) || "-";
}

function datePayload(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function statusClass(value: string) {
  if (value === "hr_verified") return "bg-[#e7f6ed] text-[#237a45]";
  if (value === "manager_endorsed") return "bg-[#e0f2fe] text-[#0369a1]";
  if (value === "rejected" || value === "expired") return "bg-[#fee2e2] text-[#b91c1c]";
  return "bg-[#eef4f1] text-[#588368]";
}

function defaultCategoryForm() {
  return { parent_id: "", code: "", name: "", description: "", sort_order: "100" };
}

function defaultSkillForm() {
  return { category_id: "", code: "", name: "", description: "", skill_type: "technical", certificate_required: false, assessment_required: false, is_active: true };
}

function defaultWorkerSkillForm() {
  return { worker_profile_id: "", skill_id: "", proficiency: "beginner", years_experience: "", last_used_on: "", verification_status: "self_declared", certificate_url: "", certificate_expires_on: "", assessment_score: "", assessed_on: "", notes: "" };
}

function defaultVerificationForm() {
  return { status: "manager_endorsed", notes: "" };
}

function defaultAssessmentForm() {
  return { worker_skill_id: "", assessment_type: "manager", result_status: "observed", score: "", max_score: "100", assessed_on: new Date().toISOString().slice(0, 10), evidence_url: "", notes: "" };
}

export function SkillsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Skills" subtitle="Open a tenant to manage catalog and worker skills." />
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

  return <SkillsWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function SkillsWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("worker-skills");
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [workerSkills, setWorkerSkills] = useState<WorkerSkill[]>([]);
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [modal, setModal] = useState<ModalState>("");
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingWorkerSkill, setEditingWorkerSkill] = useState<WorkerSkill | null>(null);
  const [selectedWorkerSkill, setSelectedWorkerSkill] = useState<WorkerSkill | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm());
  const [skillForm, setSkillForm] = useState(defaultSkillForm());
  const [workerSkillForm, setWorkerSkillForm] = useState(defaultWorkerSkillForm());
  const [verificationForm, setVerificationForm] = useState(defaultVerificationForm());
  const [assessmentForm, setAssessmentForm] = useState(defaultAssessmentForm());

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category_id", categoryFilter);
    if (statusFilter) params.set("verification_status", statusFilter);
    const suffix = params.toString() ? `?${params}` : "";
    const [categoryRows, skillRows, workerSkillRows, assessmentRows, summaryRows, workerRows] = await Promise.all([
      apiRequest<SkillCategory[]>(`${basePath}/skill-categories`).catch(() => []),
      apiRequest<Skill[]>(`${basePath}/skills`).catch(() => []),
      apiRequest<WorkerSkill[]>(`${basePath}/worker-skills${suffix}`).catch(() => []),
      apiRequest<SkillAssessment[]>(`${basePath}/worker-skill-assessments`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/skills-summary`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
    ]);
    setCategories(categoryRows);
    setSkills(skillRows);
    setWorkerSkills(workerSkillRows);
    setAssessments(assessmentRows);
    setSummary(summaryRows);
    setWorkers(workerRows);
    setWorkerSkillForm((current) => ({ ...current, worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "", skill_id: current.skill_id || skillRows[0]?.id || "" }));
    setAssessmentForm((current) => ({ ...current, worker_skill_id: current.worker_skill_id || workerSkillRows[0]?.id || "" }));
  }, [basePath, categoryFilter, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load skills."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const verified = workerSkills.filter((item) => item.verification_status === "hr_verified").length;
    const endorsed = workerSkills.filter((item) => item.verification_status === "manager_endorsed").length;
    const expiring = summary.reduce((sum, row) => Math.max(sum, row.expiring_certificate_count || 0), 0);
    return { catalog: skills.length, workerSkills: workerSkills.length, verified, endorsed, expiring };
  }, [skills.length, summary, workerSkills]);

  function openCategory(item?: SkillCategory) {
    setEditingCategory(item || null);
    setCategoryForm(item ? { parent_id: item.parent_id || "", code: item.code, name: item.name, description: item.description || "", sort_order: String(item.sort_order || 100) } : defaultCategoryForm());
    setModal("category");
  }

  function openSkill(item?: Skill) {
    setEditingSkill(item || null);
    setSkillForm(item ? { category_id: item.category_id || "", code: item.code, name: item.name, description: item.description || "", skill_type: item.skill_type, certificate_required: item.certificate_required, assessment_required: item.assessment_required, is_active: item.is_active } : defaultSkillForm());
    setModal("skill");
  }

  function openWorkerSkill(item?: WorkerSkill) {
    setEditingWorkerSkill(item || null);
    setWorkerSkillForm(item ? { worker_profile_id: item.worker_profile_id, skill_id: item.skill_id, proficiency: item.proficiency, years_experience: item.years_experience == null ? "" : String(item.years_experience), last_used_on: dateOnly(item.last_used_on), verification_status: item.verification_status, certificate_url: item.certificate_url || "", certificate_expires_on: dateOnly(item.certificate_expires_on), assessment_score: item.assessment_score == null ? "" : String(item.assessment_score), assessed_on: dateOnly(item.assessed_on), notes: item.notes || "" } : { ...defaultWorkerSkillForm(), worker_profile_id: workers[0]?.id || "", skill_id: skills[0]?.id || "" });
    setModal("worker-skill");
  }

  function openVerify(item: WorkerSkill, status = "manager_endorsed") {
    setSelectedWorkerSkill(item);
    setVerificationForm({ status, notes: "" });
    setModal("verify");
  }

  function openAssessment(item?: WorkerSkill) {
    setSelectedWorkerSkill(item || null);
    setAssessmentForm({ ...defaultAssessmentForm(), worker_skill_id: item?.id || workerSkills[0]?.id || "" });
    setModal("assessment");
  }

  function closeModal() {
    setModal("");
    setEditingCategory(null);
    setEditingSkill(null);
    setEditingWorkerSkill(null);
    setSelectedWorkerSkill(null);
  }

  async function submitCategory() {
    setError(""); setNotice("");
    const body = { code: categoryForm.code, name: categoryForm.name, parent_id: categoryForm.parent_id || null, description: categoryForm.description || null, sort_order: Number(categoryForm.sort_order || 100), metadata: {} };
    if (editingCategory) await apiRequest(`${basePath}/skill-categories/${editingCategory.id}`, { method: "PUT", body });
    else await apiRequest(`${basePath}/skill-categories`, { method: "POST", body });
    setNotice("Skill category saved.");
    closeModal();
    await load();
  }

  async function submitSkill() {
    setError(""); setNotice("");
    const body = { ...skillForm, category_id: skillForm.category_id || null, description: skillForm.description || null, metadata: {} };
    if (editingSkill) await apiRequest(`${basePath}/skills/${editingSkill.id}`, { method: "PUT", body });
    else await apiRequest(`${basePath}/skills`, { method: "POST", body });
    setNotice("Skill saved.");
    closeModal();
    await load();
  }

  async function submitWorkerSkill() {
    setError(""); setNotice("");
    const body = {
      worker_profile_id: workerSkillForm.worker_profile_id,
      skill_id: workerSkillForm.skill_id,
      proficiency: workerSkillForm.proficiency,
      years_experience: workerSkillForm.years_experience ? Number(workerSkillForm.years_experience) : null,
      last_used_on: datePayload(workerSkillForm.last_used_on),
      verification_status: workerSkillForm.verification_status,
      certificate_url: workerSkillForm.certificate_url || null,
      certificate_expires_on: datePayload(workerSkillForm.certificate_expires_on),
      assessment_score: workerSkillForm.assessment_score ? Number(workerSkillForm.assessment_score) : null,
      assessed_on: datePayload(workerSkillForm.assessed_on),
      notes: workerSkillForm.notes || null,
      metadata: {},
    };
    if (editingWorkerSkill) await apiRequest(`${basePath}/worker-skills/${editingWorkerSkill.id}`, { method: "PUT", body });
    else await apiRequest(`${basePath}/worker-skills`, { method: "POST", body });
    setNotice("Worker skill saved.");
    closeModal();
    await load();
  }

  async function submitVerification() {
    if (!selectedWorkerSkill) return;
    setError(""); setNotice("");
    await apiRequest(`${basePath}/worker-skills/${selectedWorkerSkill.id}/verify`, { method: "POST", body: { status: verificationForm.status, notes: verificationForm.notes || null } });
    setNotice("Worker skill verification updated.");
    closeModal();
    await load();
  }

  async function submitAssessment() {
    setError(""); setNotice("");
    await apiRequest(`${basePath}/worker-skill-assessments`, { method: "POST", body: { worker_skill_id: assessmentForm.worker_skill_id, assessment_type: assessmentForm.assessment_type, result_status: assessmentForm.result_status, score: assessmentForm.score ? Number(assessmentForm.score) : null, max_score: assessmentForm.max_score ? Number(assessmentForm.max_score) : null, assessed_on: datePayload(assessmentForm.assessed_on), evidence_url: assessmentForm.evidence_url || null, notes: assessmentForm.notes || null, metadata: {} } });
    setNotice("Assessment recorded.");
    closeModal();
    await load();
  }

  async function deactivate(path: string, message: string) {
    setError(""); setNotice("");
    await apiRequest(path, { method: "DELETE" });
    setNotice(message);
    await load();
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title={tenant ? `${tenant.name} Skills` : "Skills"} subtitle="Catalog, profiles, endorsements, certificates, and assessments." onBack={onBack} />
      {notice ? <Alert text={notice} tone="success" /> : null}
      {error ? <Alert text={error} tone="danger" /> : null}

      <section className="grid gap-4 md:grid-cols-5">
        <Metric label="Catalog" value={metrics.catalog} />
        <Metric label="Worker Skills" value={metrics.workerSkills} />
        <Metric label="HR Verified" value={metrics.verified} />
        <Metric label="Endorsed" value={metrics.endorsed} />
        <Metric label="Expiring Certs" value={metrics.expiring} />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["worker-skills", "catalog", "assessments"] as Tab[]).map((item) => <button className={`rounded-xl px-4 py-3 text-sm font-black ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "catalog" ? <><button className="rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-black text-[#111827]" onClick={() => openCategory()} type="button">New Category</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openSkill()} type="button">New Skill</button></> : null}
          {tab === "worker-skills" ? <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openWorkerSkill()} type="button">Add Worker Skill</button> : null}
          {tab === "assessments" ? <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openAssessment()} type="button">Record Assessment</button> : null}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm md:grid-cols-3">
        <Field label="Search" onChange={setSearch} value={search} />
        <Select label="Category" onChange={setCategoryFilter} value={categoryFilter} options={["", ...categories.map((item) => item.id)]} labels={{ "": "All categories", ...Object.fromEntries(categories.map((item) => [item.id, item.name])) }} />
        <Select label="Verification" onChange={setStatusFilter} value={statusFilter} options={["", ...verificationStatuses]} labels={{ "": "All statuses" }} />
      </section>

      {tab === "worker-skills" ? (
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Skill</th><th className="px-5 py-4">Proficiency</th><th className="px-5 py-4">Verification</th><th className="px-5 py-4">Certificate</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {workerSkills.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No worker skills found.</td></tr> : workerSkills.map((item) => (
                <tr className="hover:bg-[#f8faf9]" key={item.id}>
                  <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.worker_display_name || "Worker"}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.worker_code || item.worker_profile_id.slice(0, 8)}</span></td>
                  <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.skill_name || item.skill_name_snapshot}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.category_name || item.skill_type || "Uncategorized"}</span></td>
                  <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{label(item.proficiency)}{item.years_experience != null ? ` / ${item.years_experience} yrs` : ""}</td>
                  <td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusClass(item.verification_status)}`}>{label(item.verification_status)}</span></td>
                  <td className="px-5 py-5 text-sm font-semibold text-[#6b7280]">{item.certificate_url ? <a className="font-black text-[#588368]" href={item.certificate_url} rel="noreferrer" target="_blank">Open</a> : "None"}<span className="ml-2">{dateText(item.certificate_expires_on)}</span></td>
                  <td className="px-5 py-5 text-right"><RowActions actions={[["Edit", () => openWorkerSkill(item)], ["Endorse", () => openVerify(item, "manager_endorsed")], ["Verify", () => openVerify(item, "hr_verified")], ["Assess", () => openAssessment(item)], ["Delete", () => void deactivate(`${basePath}/worker-skills/${item.id}`, "Worker skill deactivated.")]]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "catalog" ? (
        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <TableTitle title="Categories" />
            <table className="w-full text-left">
              <tbody className="divide-y divide-[#edf1ef]">{categories.map((item) => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="text-xs font-bold text-[#6b7280]">{item.source_scope} / {item.parent_name || "Top level"}</span></td><td className="px-5 py-4 text-right"><RowActions actions={item.source_scope === "tenant" ? [["Edit", () => openCategory(item)], ["Delete", () => void deactivate(`${basePath}/skill-categories/${item.id}`, "Category deactivated.")]] : []} /></td></tr>)}</tbody>
            </table>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <TableTitle title="Skills" />
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Skill</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Requirements</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">{skills.map((item) => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="text-xs font-bold text-[#6b7280]">{item.code} / {item.category_name || "No category"} / {item.source_scope}</span></td><td className="px-5 py-4 text-sm font-bold capitalize text-[#4b5563]">{label(item.skill_type)}</td><td className="px-5 py-4 text-xs font-black text-[#6b7280]">{item.certificate_required ? "Certificate " : ""}{item.assessment_required ? "Assessment" : ""}{!item.certificate_required && !item.assessment_required ? "None" : ""}</td><td className="px-5 py-4 text-right"><RowActions actions={item.source_scope === "tenant" ? [["Edit", () => openSkill(item)], ["Delete", () => void deactivate(`${basePath}/skills/${item.id}`, "Skill deactivated.")]] : []} /></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "assessments" ? (
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Assessment</th><th className="px-5 py-4">Score</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Evidence</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">{assessments.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>No assessments recorded.</td></tr> : assessments.map((item) => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{label(item.assessment_type)}</strong><span className="text-xs font-bold text-[#6b7280]">{label(item.result_status)}</span></td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{item.score ?? "-"}{item.max_score ? ` / ${item.max_score}` : ""}</td><td className="px-5 py-4 text-sm font-semibold text-[#6b7280]">{dateText(item.assessed_on)}</td><td className="px-5 py-4 text-sm font-black">{item.evidence_url ? <a className="text-[#588368]" href={item.evidence_url} rel="noreferrer" target="_blank">Open</a> : "-"}</td></tr>)}</tbody>
          </table>
        </section>
      ) : null}

      <HrmsModal description="Details" onClose={closeModal} open={modal === "category"} title={editingCategory ? "Edit Category" : "New Category"}>
        <ModalHelp text="Use categories to keep skill search useful. Create tenant categories only when global categories are not specific enough." />
        <div className="grid gap-3 md:grid-cols-2"><Field label="Code" onChange={(value) => setCategoryForm({ ...categoryForm, code: value })} value={categoryForm.code} /><Field label="Name" onChange={(value) => setCategoryForm({ ...categoryForm, name: value })} value={categoryForm.name} /></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><Select label="Parent" onChange={(value) => setCategoryForm({ ...categoryForm, parent_id: value })} value={categoryForm.parent_id} options={["", ...categories.filter((item) => item.id !== editingCategory?.id).map((item) => item.id)]} labels={{ "": "Top level", ...Object.fromEntries(categories.map((item) => [item.id, item.name])) }} /><Field label="Sort Order" onChange={(value) => setCategoryForm({ ...categoryForm, sort_order: value })} type="number" value={categoryForm.sort_order} /></div>
        <Field className="mt-3" label="Description" onChange={(value) => setCategoryForm({ ...categoryForm, description: value })} value={categoryForm.description} />
        <ModalActions onCancel={closeModal} onSubmit={() => void submitCategory()} />
      </HrmsModal>

      <HrmsModal description="Details" onClose={closeModal} open={modal === "skill"} title={editingSkill ? "Edit Skill" : "New Skill"}>
        <ModalHelp text="Use tenant skills for company-specific capabilities. Global skills are available to every tenant and cannot be edited here." />
        <div className="grid gap-3 md:grid-cols-2"><Field label="Code" onChange={(value) => setSkillForm({ ...skillForm, code: value })} value={skillForm.code} /><Field label="Name" onChange={(value) => setSkillForm({ ...skillForm, name: value })} value={skillForm.name} /></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><Select label="Category" onChange={(value) => setSkillForm({ ...skillForm, category_id: value })} value={skillForm.category_id} options={["", ...categories.map((item) => item.id)]} labels={{ "": "No category", ...Object.fromEntries(categories.map((item) => [item.id, item.name])) }} /><Select label="Type" onChange={(value) => setSkillForm({ ...skillForm, skill_type: value })} value={skillForm.skill_type} options={skillTypes} /></div>
        <Field className="mt-3" label="Description" onChange={(value) => setSkillForm({ ...skillForm, description: value })} value={skillForm.description} />
        <div className="mt-4 grid gap-3 md:grid-cols-3"><Checkbox label="Certificate" checked={skillForm.certificate_required} onChange={(value) => setSkillForm({ ...skillForm, certificate_required: value })} /><Checkbox label="Assessment" checked={skillForm.assessment_required} onChange={(value) => setSkillForm({ ...skillForm, assessment_required: value })} /><Checkbox label="Active" checked={skillForm.is_active} onChange={(value) => setSkillForm({ ...skillForm, is_active: value })} /></div>
        <ModalActions onCancel={closeModal} onSubmit={() => void submitSkill()} />
      </HrmsModal>

      <HrmsModal description="Details" onClose={closeModal} open={modal === "worker-skill"} title={editingWorkerSkill ? "Edit Worker Skill" : "Add Worker Skill"}>
        <ModalHelp text="Worker skills should capture actual capability evidence, not just interests. Verification can be added by managers or HR after review." />
        <div className="grid gap-3 md:grid-cols-2"><Select label="Worker" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, worker_profile_id: value })} value={workerSkillForm.worker_profile_id} options={workers.map((item) => item.id)} labels={Object.fromEntries(workers.map((item) => [item.id, `${item.display_name}${item.worker_code ? ` (${item.worker_code})` : ""}`]))} /><Select label="Skill" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, skill_id: value })} value={workerSkillForm.skill_id} options={skills.filter((item) => item.is_active).map((item) => item.id)} labels={Object.fromEntries(skills.map((item) => [item.id, item.name]))} /></div>
        <div className="mt-3 grid gap-3 md:grid-cols-3"><Select label="Proficiency" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, proficiency: value })} value={workerSkillForm.proficiency} options={proficiencies} /><Field label="Years" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, years_experience: value })} type="number" value={workerSkillForm.years_experience} /><Field label="Last Used" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, last_used_on: value })} type="date" value={workerSkillForm.last_used_on} /></div>
        <div className="mt-3 grid gap-3 md:grid-cols-3"><Field label="Certificate URL" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, certificate_url: value })} value={workerSkillForm.certificate_url} /><Field label="Cert Expiry" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, certificate_expires_on: value })} type="date" value={workerSkillForm.certificate_expires_on} /><Field label="Score" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, assessment_score: value })} type="number" value={workerSkillForm.assessment_score} /></div>
        <Field className="mt-3" label="Notes" onChange={(value) => setWorkerSkillForm({ ...workerSkillForm, notes: value })} value={workerSkillForm.notes} />
        <ModalActions onCancel={closeModal} onSubmit={() => void submitWorkerSkill()} />
      </HrmsModal>

      <HrmsModal description="Details" onClose={closeModal} open={modal === "verify"} title="Update Verification">
        <ModalHelp text="Use manager endorsement when capability is observed by the manager. Use HR verified when evidence, certificate, or formal assessment has been checked." />
        <Select label="Status" onChange={(value) => setVerificationForm({ ...verificationForm, status: value })} value={verificationForm.status} options={verificationStatuses} />
        <Field className="mt-3" label="Notes" onChange={(value) => setVerificationForm({ ...verificationForm, notes: value })} value={verificationForm.notes} />
        <ModalActions onCancel={closeModal} onSubmit={() => void submitVerification()} />
      </HrmsModal>

      <HrmsModal description="Details" onClose={closeModal} open={modal === "assessment"} title="Record Assessment">
        <ModalHelp text="Assessments are evidence records for a worker skill. They can come from self, manager, HR, or external providers." />
        <div className="grid gap-3 md:grid-cols-2"><Select label="Worker Skill" onChange={(value) => setAssessmentForm({ ...assessmentForm, worker_skill_id: value })} value={assessmentForm.worker_skill_id} options={workerSkills.map((item) => item.id)} labels={Object.fromEntries(workerSkills.map((item) => [item.id, `${item.worker_display_name || "Worker"} / ${item.skill_name || item.skill_name_snapshot}`]))} /><Select label="Type" onChange={(value) => setAssessmentForm({ ...assessmentForm, assessment_type: value })} value={assessmentForm.assessment_type} options={assessmentTypes} /></div>
        <div className="mt-3 grid gap-3 md:grid-cols-4"><Select label="Result" onChange={(value) => setAssessmentForm({ ...assessmentForm, result_status: value })} value={assessmentForm.result_status} options={resultStatuses} /><Field label="Score" onChange={(value) => setAssessmentForm({ ...assessmentForm, score: value })} type="number" value={assessmentForm.score} /><Field label="Max" onChange={(value) => setAssessmentForm({ ...assessmentForm, max_score: value })} type="number" value={assessmentForm.max_score} /><Field label="Date" onChange={(value) => setAssessmentForm({ ...assessmentForm, assessed_on: value })} type="date" value={assessmentForm.assessed_on} /></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="Evidence URL" onChange={(value) => setAssessmentForm({ ...assessmentForm, evidence_url: value })} value={assessmentForm.evidence_url} /><Field label="Notes" onChange={(value) => setAssessmentForm({ ...assessmentForm, notes: value })} value={assessmentForm.notes} /></div>
        <ModalActions onCancel={closeModal} onSubmit={() => void submitAssessment()} />
      </HrmsModal>
    </main>
  );
}

function Header({ onBack, subtitle, title }: { onBack?: () => void; subtitle: string; title: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">People Intelligence</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">{subtitle}</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-black text-[#111827]" onClick={onBack} type="button">Back</button> : null}</div>;
}

function Metric({ label: metricLabel, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{metricLabel}</p><p className="mt-3 text-3xl font-black text-[#111827]">{value}</p></div>;
}

function Alert({ text, tone }: { text: string; tone: "danger" | "success" }) {
  return <div className={`rounded-2xl border px-5 py-4 text-sm font-bold ${tone === "danger" ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"}`}>{text}</div>;
}

function Field({ className = "", label: fieldLabel, onChange, type = "text", value }: { className?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}</span><input className="h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function Select({ labels = {}, label: fieldLabel, onChange, options, value }: { labels?: Record<string, string>; label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}</span><select className="h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((item) => <option key={item} value={item}>{labels[item] || label(item)}</option>)}</select></label>;
}

function Checkbox({ checked, label: fieldLabel, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex h-11 items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#111827]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{fieldLabel}</label>;
}

function ModalActions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="mt-6 flex justify-end gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#4b5563]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function ModalHelp({ text }: { text: string }) {
  return <div className="mb-4 flex items-center justify-between rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3"><span className="text-sm font-black text-[#111827]">Details</span><button aria-label={text} className="h-8 w-8 rounded-full border border-[#dbe0e5] bg-white text-sm font-black text-[#588368]" title={text} type="button">i</button></div>;
}

function TableTitle({ title }: { title: string }) {
  return <div className="border-b border-[#edf1ef] px-5 py-4"><h2 className="text-lg font-black text-[#111827]">{title}</h2></div>;
}

function RowActions({ actions }: { actions: Array<[string, () => void]> }) {
  if (!actions.length) return <span className="text-xs font-bold text-[#9ca3af]">Global</span>;
  return <div className="flex flex-wrap justify-end gap-2">{actions.map(([actionLabel, action]) => <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#4b5563]" key={actionLabel} onClick={action} type="button">{actionLabel}</button>)}</div>;
}
