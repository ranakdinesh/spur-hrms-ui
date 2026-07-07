"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name: string; worker_code?: string | null };
type Skill = { id: string; code: string; name: string };
type Course = { id: string; code: string; title: string; course_type: string; delivery_mode: string; provider?: string | null; duration_minutes: number; skill_id?: string | null; skill_name?: string | null; mandatory: boolean; ai_readiness: boolean; certificate_required: boolean; budget_amount?: number | null; currency_code: string; is_active: boolean };
type Path = { id: string; code: string; title: string; path_type: string; target_role?: string | null; skill_id?: string | null; skill_name?: string | null; ai_readiness: boolean; is_active: boolean; course_count?: number; total_minutes?: number };
type PathCourse = { id: string; path_id: string; course_id: string; sort_order: number; required: boolean; course_code?: string | null; course_title?: string | null; course_type?: string | null; duration_minutes?: number };
type Enrollment = { id: string; course_id: string; path_id?: string | null; worker_profile_id: string; assignment_source: string; status: string; due_date?: string | null; score?: number | null; certificate_url?: string | null; course_title?: string | null; course_code?: string | null; path_title?: string | null; worker_display_name?: string | null; worker_code?: string | null; mandatory: boolean; ai_readiness: boolean };
type Recommendation = { id: string; worker_profile_id?: string | null; skill_id?: string | null; course_id?: string | null; path_id?: string | null; source_type: string; reason: string; priority: string; confidence_score?: number | null; status: string; worker_display_name?: string | null; skill_name?: string | null; course_title?: string | null; path_title?: string | null };
type SummaryRow = { metric: string; metric_count: number };
type Tab = "catalog" | "paths" | "assignments" | "recommendations";
type Modal = "" | "course" | "path" | "pathCourse" | "enrollment" | "recommendation" | "status" | "certificate";

const inputClass = "w-full rounded-xl border border-[#dbe8e1] bg-white px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]";
const courseTypes = ["technical", "functional", "compliance", "leadership", "behavioral", "ai_readiness", "custom"];
const deliveryModes = ["self_paced", "classroom", "virtual", "blended", "external"];
const pathTypes = ["onboarding", "compliance", "upskilling", "leadership", "ai_readiness", "custom"];
const assignmentSources = ["self", "manager", "hr", "compliance", "skill_gap", "ai", "manual"];
const enrollmentStatuses = ["nominated", "assigned", "approved", "in_progress", "completed", "overdue", "waived", "cancelled"];
const recommendationSources = ["skill_gap", "compliance", "performance", "ai", "manager", "manual"];
const priorities = ["low", "medium", "high", "urgent"];
const recommendationStatuses = ["open", "accepted", "assigned", "dismissed", "completed"];

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function datePayload(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function workerName(worker: Worker) {
  return `${worker.display_name}${worker.worker_code ? ` · ${worker.worker_code}` : ""}`;
}

function defaultCourseForm() {
  return { code: "", title: "", description: "", course_type: "technical", delivery_mode: "self_paced", provider: "", duration_minutes: "60", skill_id: "", mandatory: false, ai_readiness: false, certificate_required: false, budget_amount: "", currency_code: "INR", is_active: true };
}

function defaultPathForm() {
  return { code: "", title: "", description: "", path_type: "upskilling", target_role: "", skill_id: "", ai_readiness: false, is_active: true };
}

function defaultPathCourseForm(pathID = "", courseID = "") {
  return { path_id: pathID, course_id: courseID, sort_order: "100", required: true };
}

function defaultEnrollmentForm(workerID = "", courseID = "") {
  return { worker_profile_id: workerID, course_id: courseID, path_id: "", assignment_source: "hr", status: "assigned", due_date: "", notes: "" };
}

function defaultRecommendationForm() {
  return { worker_profile_id: "", skill_id: "", course_id: "", path_id: "", source_type: "manual", reason: "", priority: "medium", confidence_score: "", status: "open" };
}

function defaultStatusForm(status = "in_progress") {
  return { status, score: "", notes: "" };
}

function defaultCertificateForm() {
  return { file_name: "", content_type: "", content_base64: "", score: "", notes: "" };
}

export function LearningSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Learning" subtitle="Open a tenant to manage learning catalog, assignments, and recommendations." />
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

  return <LearningWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function LearningWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("catalog");
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [pathCourses, setPathCourses] = useState<PathCourse[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [modal, setModal] = useState<Modal>("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [search, setSearch] = useState("");
  const [courseForm, setCourseForm] = useState(defaultCourseForm());
  const [pathForm, setPathForm] = useState(defaultPathForm());
  const [pathCourseForm, setPathCourseForm] = useState(defaultPathCourseForm());
  const [enrollmentForm, setEnrollmentForm] = useState(defaultEnrollmentForm());
  const [recommendationForm, setRecommendationForm] = useState(defaultRecommendationForm());
  const [statusForm, setStatusForm] = useState(defaultStatusForm());
  const [certificateForm, setCertificateForm] = useState(defaultCertificateForm());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
    const [courseRows, pathRows, enrollmentRows, recommendationRows, summaryRows, workerRows, skillRows] = await Promise.all([
      apiRequest<Course[]>(`${basePath}/learning-courses${suffix}`).catch(() => []),
      apiRequest<Path[]>(`${basePath}/learning-paths${suffix}`).catch(() => []),
      apiRequest<Enrollment[]>(`${basePath}/learning-enrollments${suffix}`).catch(() => []),
      apiRequest<Recommendation[]>(`${basePath}/learning-recommendations${suffix}`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/learning-summary`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<Skill[]>(`${basePath}/skills`).catch(() => []),
    ]);
    setCourses(courseRows);
    setPaths(pathRows);
    setEnrollments(enrollmentRows);
    setRecommendations(recommendationRows);
    setSummary(summaryRows);
    setWorkers(workerRows);
    setSkills(skillRows);
    setEnrollmentForm((current) => ({ ...current, worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "", course_id: current.course_id || courseRows[0]?.id || "" }));
  }, [basePath, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load learning."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const byMetric = new Map(summary.map((row) => [row.metric, row.metric_count]));
    return [
      ["Courses", byMetric.get("courses") || courses.length],
      ["Assigned", byMetric.get("assigned") || enrollments.filter((item) => ["assigned", "nominated", "approved", "in_progress"].includes(item.status)).length],
      ["Completed", byMetric.get("completed") || enrollments.filter((item) => item.status === "completed").length],
      ["Open Recs", byMetric.get("recommendations") || recommendations.filter((item) => item.status === "open").length],
    ];
  }, [courses.length, enrollments, recommendations, summary]);

  async function loadPathCourses(pathID: string) {
    const rows = await apiRequest<PathCourse[]>(`${basePath}/learning-paths/${pathID}/courses`).catch(() => []);
    setPathCourses(rows);
  }

  function openCourse(item?: Course) {
    setSelectedCourse(item || null);
    setCourseForm(item ? { code: item.code, title: item.title, description: "", course_type: item.course_type, delivery_mode: item.delivery_mode, provider: item.provider || "", duration_minutes: String(item.duration_minutes || 0), skill_id: item.skill_id || "", mandatory: item.mandatory, ai_readiness: item.ai_readiness, certificate_required: item.certificate_required, budget_amount: item.budget_amount == null ? "" : String(item.budget_amount), currency_code: item.currency_code || "INR", is_active: item.is_active } : defaultCourseForm());
    setModal("course");
  }

  function openPath(item?: Path) {
    setSelectedPath(item || null);
    setPathForm(item ? { code: item.code, title: item.title, description: "", path_type: item.path_type, target_role: item.target_role || "", skill_id: item.skill_id || "", ai_readiness: item.ai_readiness, is_active: item.is_active } : defaultPathForm());
    setModal("path");
  }

  async function openPathCourse(item?: Path) {
    const path = item || selectedPath || paths[0] || null;
    setSelectedPath(path);
    setPathCourseForm(defaultPathCourseForm(path?.id || "", courses[0]?.id || ""));
    if (path) await loadPathCourses(path.id);
    setModal("pathCourse");
  }

  function openEnrollment(item?: Enrollment) {
    setSelectedEnrollment(item || null);
    setEnrollmentForm(item ? { worker_profile_id: item.worker_profile_id, course_id: item.course_id, path_id: item.path_id || "", assignment_source: item.assignment_source, status: item.status, due_date: dateOnly(item.due_date), notes: "" } : defaultEnrollmentForm(workers[0]?.id || "", courses[0]?.id || ""));
    setModal("enrollment");
  }

  function openStatus(item: Enrollment, status = "in_progress") {
    setSelectedEnrollment(item);
    setStatusForm(defaultStatusForm(status));
    setModal("status");
  }

  function openCertificate(item: Enrollment) {
    setSelectedEnrollment(item);
    setCertificateForm(defaultCertificateForm());
    setModal("certificate");
  }

  function openRecommendation(item?: Recommendation) {
    setSelectedRecommendation(item || null);
    setRecommendationForm(item ? { worker_profile_id: item.worker_profile_id || "", skill_id: item.skill_id || "", course_id: item.course_id || "", path_id: item.path_id || "", source_type: item.source_type, reason: item.reason, priority: item.priority, confidence_score: item.confidence_score == null ? "" : String(item.confidence_score), status: item.status } : defaultRecommendationForm());
    setModal("recommendation");
  }

  function closeModal() {
    setModal("");
    setSelectedCourse(null);
    setSelectedPath(null);
    setSelectedEnrollment(null);
    setSelectedRecommendation(null);
  }

  async function saveCourse() {
    setError(""); setNotice("");
    const body = { ...courseForm, duration_minutes: Number(courseForm.duration_minutes || 0), skill_id: courseForm.skill_id || null, provider: courseForm.provider || null, description: courseForm.description || null, budget_amount: courseForm.budget_amount ? Number(courseForm.budget_amount) : null, metadata: {} };
    if (selectedCourse) await apiRequest(`${basePath}/learning-courses/${selectedCourse.id}`, { method: "PUT", body });
    else await apiRequest(`${basePath}/learning-courses`, { method: "POST", body });
    setNotice("Course saved.");
    closeModal();
    await load();
  }

  async function savePath() {
    setError(""); setNotice("");
    const body = { ...pathForm, skill_id: pathForm.skill_id || null, target_role: pathForm.target_role || null, description: pathForm.description || null, metadata: {} };
    if (selectedPath) await apiRequest(`${basePath}/learning-paths/${selectedPath.id}`, { method: "PUT", body });
    else await apiRequest(`${basePath}/learning-paths`, { method: "POST", body });
    setNotice("Path saved.");
    closeModal();
    await load();
  }

  async function savePathCourse() {
    setError(""); setNotice("");
    await apiRequest(`${basePath}/learning-paths/${pathCourseForm.path_id}/courses`, { method: "POST", body: { course_id: pathCourseForm.course_id, sort_order: Number(pathCourseForm.sort_order || 100), required: pathCourseForm.required } });
    setNotice("Path course saved.");
    await loadPathCourses(pathCourseForm.path_id);
  }

  async function saveEnrollment() {
    setError(""); setNotice("");
    const body = { ...enrollmentForm, path_id: enrollmentForm.path_id || null, due_date: datePayload(enrollmentForm.due_date), notes: enrollmentForm.notes || null, metadata: {} };
    await apiRequest(`${basePath}/learning-enrollments`, { method: "POST", body });
    setNotice("Assignment saved.");
    closeModal();
    await load();
  }

  async function saveRecommendation() {
    setError(""); setNotice("");
    const body = { ...recommendationForm, worker_profile_id: recommendationForm.worker_profile_id || null, skill_id: recommendationForm.skill_id || null, course_id: recommendationForm.course_id || null, path_id: recommendationForm.path_id || null, confidence_score: recommendationForm.confidence_score ? Number(recommendationForm.confidence_score) : null, metadata: {} };
    await apiRequest(`${basePath}/learning-recommendations`, { method: "POST", body });
    setNotice("Recommendation saved.");
    closeModal();
    await load();
  }

  async function saveStatus() {
    if (!selectedEnrollment) return;
    setError(""); setNotice("");
    await apiRequest(`${basePath}/learning-enrollments/${selectedEnrollment.id}/status`, { method: "POST", body: { status: statusForm.status, score: statusForm.score ? Number(statusForm.score) : null, notes: statusForm.notes || null } });
    setNotice("Status updated.");
    closeModal();
    await load();
  }

  async function uploadCertificate() {
    if (!selectedEnrollment) return;
    setError(""); setNotice("");
    await apiRequest(`${basePath}/learning-enrollments/${selectedEnrollment.id}/certificate`, { method: "POST", body: { ...certificateForm, score: certificateForm.score ? Number(certificateForm.score) : null, notes: certificateForm.notes || null } });
    setNotice("Certificate uploaded.");
    closeModal();
    await load();
  }

  async function updateRecommendationStatus(item: Recommendation, status: string) {
    setError(""); setNotice("");
    await apiRequest(`${basePath}/learning-recommendations/${item.id}/status`, { method: "POST", body: { status } });
    setNotice("Recommendation updated.");
    await load();
  }

  async function generateRecommendations() {
    setError(""); setNotice("");
    const rows = await apiRequest<Recommendation[]>(`${basePath}/learning-recommendations/generate`, { method: "POST", body: {} });
    setNotice(`${rows.length} recommendation${rows.length === 1 ? "" : "s"} generated.`);
    await load();
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title="Learning" subtitle={tenant ? tenant.name : "Training catalog, mandatory learning, skill-gap recommendations, and certificate completion."} action={onBack ? <button className="rounded-xl border border-[#dbe8e1] px-4 py-2 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null} />
      {notice ? <Alert tone="success" text={notice} /> : null}
      {error ? <Alert tone="danger" text={error} /> : null}
      <section className="grid gap-3 md:grid-cols-4">{metrics.map(([name, value]) => <Metric key={name} label={String(name)} value={String(value)} />)}</section>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">{(["catalog", "paths", "assignments", "recommendations"] as Tab[]).map((item) => <button className={`rounded-xl px-4 py-2 text-sm font-black ${tab === item ? "bg-[#588368] text-white" : "bg-[#eef4f1] text-[#374151]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</div>
        <div className="flex flex-wrap gap-2">
          <input className={`${inputClass} w-64`} onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} />
          <button className="rounded-xl border border-[#dbe8e1] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => void load()} type="button">Refresh</button>
          {tab === "catalog" ? <button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => openCourse()} type="button">New Course</button> : null}
          {tab === "paths" ? <button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => openPath()} type="button">New Path</button> : null}
          {tab === "assignments" ? <button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => openEnrollment()} type="button">Assign</button> : null}
          {tab === "recommendations" ? <button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={generateRecommendations} type="button">Generate</button> : null}
        </div>
      </section>
      {tab === "catalog" ? <CourseTable courses={courses} onEdit={openCourse} /> : null}
      {tab === "paths" ? <PathTable onCourses={(item) => void openPathCourse(item)} onEdit={openPath} paths={paths} /> : null}
      {tab === "assignments" ? <EnrollmentTable enrollments={enrollments} onCertificate={openCertificate} onStatus={openStatus} /> : null}
      {tab === "recommendations" ? <RecommendationTable onCreate={() => openRecommendation()} onStatus={updateRecommendationStatus} recommendations={recommendations} /> : null}

      <HrmsModal onClose={closeModal} open={modal === "course"} title={selectedCourse ? "Edit Course" : "New Course"}><CourseForm form={courseForm} onChange={setCourseForm} onSubmit={saveCourse} skills={skills} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "path"} title={selectedPath ? "Edit Path" : "New Path"}><PathForm form={pathForm} onChange={setPathForm} onSubmit={savePath} skills={skills} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "pathCourse"} title="Path Courses"><PathCourseForm courses={courses} form={pathCourseForm} onChange={setPathCourseForm} onSubmit={savePathCourse} pathCourses={pathCourses} paths={paths} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "enrollment"} title="Assign Learning"><EnrollmentForm courses={courses} form={enrollmentForm} onChange={setEnrollmentForm} onSubmit={saveEnrollment} paths={paths} workers={workers} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "recommendation"} title={selectedRecommendation ? "Edit Recommendation" : "New Recommendation"}><RecommendationForm courses={courses} form={recommendationForm} onChange={setRecommendationForm} onSubmit={saveRecommendation} paths={paths} skills={skills} workers={workers} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "status"} title="Update Learning Status"><StatusForm form={statusForm} onChange={setStatusForm} onSubmit={saveStatus} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "certificate"} title="Upload Certificate"><CertificateForm form={certificateForm} onChange={setCertificateForm} onSubmit={uploadCertificate} /></HrmsModal>
    </main>
  );
}

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black text-[#111827]">{title}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">{subtitle}</p></div>{action}</header>;
}

function Alert({ text, tone }: { text: string; tone: "success" | "danger" }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-[#cdebd8] bg-[#f0fbf4] text-[#237a45]" : "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"}`}>{text}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm"><span className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</span><strong className="mt-2 block text-2xl font-black text-[#111827]">{value}</strong></div>;
}

function InfoButton({ text }: { text: string }) {
  return <button className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#cbd5d1] text-xs font-black text-[#588368]" title={text} type="button">i</button>;
}

function Field({ children, info, label: fieldLabel }: { children: ReactNode; info?: string; label: string }) {
  return <label className="block text-sm font-black text-[#374151]">{fieldLabel}{info ? <InfoButton text={info} /> : null}<div className="mt-2">{children}</div></label>;
}

function Select({ onChange, value, values }: { onChange: (value: string) => void; value: string; values: string[] }) {
  return <select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>{values.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>;
}

function ModalActions({ onSubmit }: { onSubmit: () => void }) {
  return <div className="flex justify-end pt-2"><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={() => void onSubmit()} type="button">Save</button></div>;
}

function CourseTable({ courses, onEdit }: { courses: Course[]; onEdit: (item: Course) => void }) {
  return <Table headers={["Course", "Type", "Skill", "Flags", "Actions"]}>{courses.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-4"><strong>{item.title}</strong><span className="block text-xs text-[#6b7280]">{item.code}</span></td><td className="px-5 py-4 capitalize">{label(item.course_type)} · {label(item.delivery_mode)}</td><td className="px-5 py-4">{item.skill_name || "-"}</td><td className="px-5 py-4">{[item.mandatory ? "Mandatory" : "", item.ai_readiness ? "AI" : "", item.certificate_required ? "Certificate" : ""].filter(Boolean).join(", ") || "-"}</td><td className="px-5 py-4 text-right"><button className="rounded-xl border px-3 py-2 text-xs font-black" onClick={() => onEdit(item)} type="button">Edit</button></td></tr>)}</Table>;
}

function PathTable({ onCourses, onEdit, paths }: { onCourses: (item: Path) => void; onEdit: (item: Path) => void; paths: Path[] }) {
  return <Table headers={["Path", "Type", "Skill", "Courses", "Actions"]}>{paths.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-4"><strong>{item.title}</strong><span className="block text-xs text-[#6b7280]">{item.code}</span></td><td className="px-5 py-4">{label(item.path_type)}</td><td className="px-5 py-4">{item.skill_name || item.target_role || "-"}</td><td className="px-5 py-4">{item.course_count || 0} · {item.total_minutes || 0} min</td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-xl border px-3 py-2 text-xs font-black" onClick={() => onCourses(item)} type="button">Courses</button><button className="rounded-xl border px-3 py-2 text-xs font-black" onClick={() => onEdit(item)} type="button">Edit</button></td></tr>)}</Table>;
}

function EnrollmentTable({ enrollments, onCertificate, onStatus }: { enrollments: Enrollment[]; onCertificate: (item: Enrollment) => void; onStatus: (item: Enrollment, status?: string) => void }) {
  return <Table headers={["Employee", "Course", "Status", "Due", "Actions"]}>{enrollments.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-4"><strong>{item.worker_display_name || item.worker_profile_id}</strong><span className="block text-xs text-[#6b7280]">{item.worker_code || "-"}</span></td><td className="px-5 py-4">{item.course_title || item.course_id}<span className="block text-xs text-[#6b7280]">{item.path_title || item.assignment_source}</span></td><td className="px-5 py-4"><Badge value={item.status} /></td><td className="px-5 py-4">{dateOnly(item.due_date) || "-"}</td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-xl border px-3 py-2 text-xs font-black" onClick={() => onStatus(item)} type="button">Status</button><button className="rounded-xl border px-3 py-2 text-xs font-black" onClick={() => onCertificate(item)} type="button">Certificate</button></td></tr>)}</Table>;
}

function RecommendationTable({ onCreate, onStatus, recommendations }: { onCreate: () => void; onStatus: (item: Recommendation, status: string) => void; recommendations: Recommendation[] }) {
  return <section className="space-y-3"><div className="text-right"><button className="rounded-xl border border-[#dbe8e1] px-4 py-2 text-sm font-black" onClick={onCreate} type="button">Manual Recommendation</button></div><Table headers={["Recommendation", "Target", "Priority", "Status", "Actions"]}>{recommendations.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-4"><strong>{item.reason}</strong><span className="block text-xs text-[#6b7280]">{label(item.source_type)} · {item.course_title || item.path_title || "-"}</span></td><td className="px-5 py-4">{item.worker_display_name || item.skill_name || "Organisation"}</td><td className="px-5 py-4">{label(item.priority)}</td><td className="px-5 py-4"><Badge value={item.status} /></td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-xl border px-3 py-2 text-xs font-black" onClick={() => void onStatus(item, "assigned")} type="button">Assign</button><button className="rounded-xl border px-3 py-2 text-xs font-black" onClick={() => void onStatus(item, "dismissed")} type="button">Dismiss</button></td></tr>)}</Table></section>;
}

function Badge({ value }: { value: string }) {
  const danger = ["overdue", "cancelled", "dismissed"].includes(value);
  const done = ["completed", "accepted"].includes(value);
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${done ? "bg-[#e7f6ed] text-[#237a45]" : danger ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#eef4f1] text-[#588368]"}`}>{label(value)}</span>;
}

function Table({ children, headers }: { children: ReactNode; headers: string[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((item) => <th className="px-5 py-4" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{children}</tbody></table></section>;
}

function CourseForm({ form, onChange, onSubmit, skills }: { form: ReturnType<typeof defaultCourseForm>; onChange: (form: ReturnType<typeof defaultCourseForm>) => void; onSubmit: () => void; skills: Skill[] }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Code"><input className={inputClass} value={form.code} onChange={(event) => onChange({ ...form, code: event.target.value })} /></Field><Field label="Title"><input className={inputClass} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></Field><Field label="Type"><Select value={form.course_type} values={courseTypes} onChange={(course_type) => onChange({ ...form, course_type })} /></Field><Field label="Delivery"><Select value={form.delivery_mode} values={deliveryModes} onChange={(delivery_mode) => onChange({ ...form, delivery_mode })} /></Field><Field label="Skill" info="Links this course to skill gaps and AI upskilling recommendations."><select className={inputClass} value={form.skill_id} onChange={(event) => onChange({ ...form, skill_id: event.target.value })}><option value="">No skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></Field><Field label="Duration"><input className={inputClass} min="0" type="number" value={form.duration_minutes} onChange={(event) => onChange({ ...form, duration_minutes: event.target.value })} /></Field><Field label="Provider"><input className={inputClass} value={form.provider} onChange={(event) => onChange({ ...form, provider: event.target.value })} /></Field><Field label="Budget"><input className={inputClass} min="0" type="number" value={form.budget_amount} onChange={(event) => onChange({ ...form, budget_amount: event.target.value })} /></Field></div><div className="grid gap-3 md:grid-cols-3">{(["mandatory", "ai_readiness", "certificate_required", "is_active"] as const).map((key) => <label className="flex items-center gap-3 text-sm font-black text-[#374151]" key={key}><input checked={form[key]} onChange={(event) => onChange({ ...form, [key]: event.target.checked })} type="checkbox" />{label(key)}</label>)}</div><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></Field><ModalActions onSubmit={onSubmit} /></div>;
}

function PathForm({ form, onChange, onSubmit, skills }: { form: ReturnType<typeof defaultPathForm>; onChange: (form: ReturnType<typeof defaultPathForm>) => void; onSubmit: () => void; skills: Skill[] }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Code"><input className={inputClass} value={form.code} onChange={(event) => onChange({ ...form, code: event.target.value })} /></Field><Field label="Title"><input className={inputClass} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></Field><Field label="Type"><Select value={form.path_type} values={pathTypes} onChange={(path_type) => onChange({ ...form, path_type })} /></Field><Field label="Target Role"><input className={inputClass} value={form.target_role} onChange={(event) => onChange({ ...form, target_role: event.target.value })} /></Field><Field label="Skill"><select className={inputClass} value={form.skill_id} onChange={(event) => onChange({ ...form, skill_id: event.target.value })}><option value="">No skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></Field></div><div className="flex gap-6"><label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.ai_readiness} onChange={(event) => onChange({ ...form, ai_readiness: event.target.checked })} type="checkbox" />AI readiness</label><label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.is_active} onChange={(event) => onChange({ ...form, is_active: event.target.checked })} type="checkbox" />Active</label></div><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></Field><ModalActions onSubmit={onSubmit} /></div>;
}

function PathCourseForm({ courses, form, onChange, onSubmit, pathCourses, paths }: { courses: Course[]; form: ReturnType<typeof defaultPathCourseForm>; onChange: (form: ReturnType<typeof defaultPathCourseForm>) => void; onSubmit: () => void; pathCourses: PathCourse[]; paths: Path[] }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Path"><select className={inputClass} value={form.path_id} onChange={(event) => onChange({ ...form, path_id: event.target.value })}>{paths.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}</select></Field><Field label="Course"><select className={inputClass} value={form.course_id} onChange={(event) => onChange({ ...form, course_id: event.target.value })}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></Field><Field label="Sort Order"><input className={inputClass} type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: event.target.value })} /></Field><label className="mt-8 flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.required} onChange={(event) => onChange({ ...form, required: event.target.checked })} type="checkbox" />Required</label></div><ModalActions onSubmit={onSubmit} /><div className="rounded-2xl border border-[#edf1ef]"><table className="w-full text-left text-sm"><tbody className="divide-y divide-[#edf1ef]">{pathCourses.map((item) => <tr key={item.id}><td className="px-4 py-3 font-bold">{item.course_title}</td><td className="px-4 py-3">{label(item.course_type)}</td><td className="px-4 py-3">{item.duration_minutes || 0} min</td></tr>)}</tbody></table></div></div>;
}

function EnrollmentForm({ courses, form, onChange, onSubmit, paths, workers }: { courses: Course[]; form: ReturnType<typeof defaultEnrollmentForm>; onChange: (form: ReturnType<typeof defaultEnrollmentForm>) => void; onSubmit: () => void; paths: Path[]; workers: Worker[] }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Employee"><select className={inputClass} value={form.worker_profile_id} onChange={(event) => onChange({ ...form, worker_profile_id: event.target.value })}>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Course"><select className={inputClass} value={form.course_id} onChange={(event) => onChange({ ...form, course_id: event.target.value })}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></Field><Field label="Path"><select className={inputClass} value={form.path_id} onChange={(event) => onChange({ ...form, path_id: event.target.value })}><option value="">No path</option>{paths.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}</select></Field><Field label="Source"><Select value={form.assignment_source} values={assignmentSources} onChange={(assignment_source) => onChange({ ...form, assignment_source })} /></Field><Field label="Status"><Select value={form.status} values={enrollmentStatuses} onChange={(status) => onChange({ ...form, status })} /></Field><Field label="Due Date"><input className={inputClass} type="date" value={form.due_date} onChange={(event) => onChange({ ...form, due_date: event.target.value })} /></Field></div><Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} /></Field><ModalActions onSubmit={onSubmit} /></div>;
}

function RecommendationForm({ courses, form, onChange, onSubmit, paths, skills, workers }: { courses: Course[]; form: ReturnType<typeof defaultRecommendationForm>; onChange: (form: ReturnType<typeof defaultRecommendationForm>) => void; onSubmit: () => void; paths: Path[]; skills: Skill[]; workers: Worker[] }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Employee"><select className={inputClass} value={form.worker_profile_id} onChange={(event) => onChange({ ...form, worker_profile_id: event.target.value })}><option value="">Organisation</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Skill"><select className={inputClass} value={form.skill_id} onChange={(event) => onChange({ ...form, skill_id: event.target.value })}><option value="">No skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></Field><Field label="Course"><select className={inputClass} value={form.course_id} onChange={(event) => onChange({ ...form, course_id: event.target.value })}><option value="">No course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></Field><Field label="Path"><select className={inputClass} value={form.path_id} onChange={(event) => onChange({ ...form, path_id: event.target.value })}><option value="">No path</option>{paths.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}</select></Field><Field label="Source"><Select value={form.source_type} values={recommendationSources} onChange={(source_type) => onChange({ ...form, source_type })} /></Field><Field label="Priority"><Select value={form.priority} values={priorities} onChange={(priority) => onChange({ ...form, priority })} /></Field><Field label="Status"><Select value={form.status} values={recommendationStatuses} onChange={(status) => onChange({ ...form, status })} /></Field><Field label="Confidence"><input className={inputClass} max="100" min="0" type="number" value={form.confidence_score} onChange={(event) => onChange({ ...form, confidence_score: event.target.value })} /></Field></div><Field label="Reason"><textarea className={`${inputClass} min-h-24`} value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} /></Field><ModalActions onSubmit={onSubmit} /></div>;
}

function StatusForm({ form, onChange, onSubmit }: { form: ReturnType<typeof defaultStatusForm>; onChange: (form: ReturnType<typeof defaultStatusForm>) => void; onSubmit: () => void }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Status"><Select value={form.status} values={enrollmentStatuses} onChange={(status) => onChange({ ...form, status })} /></Field><Field label="Score"><input className={inputClass} max="100" min="0" type="number" value={form.score} onChange={(event) => onChange({ ...form, score: event.target.value })} /></Field></div><Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} /></Field><ModalActions onSubmit={onSubmit} /></div>;
}

function CertificateForm({ form, onChange, onSubmit }: { form: ReturnType<typeof defaultCertificateForm>; onChange: (form: ReturnType<typeof defaultCertificateForm>) => void; onSubmit: () => void }) {
  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      onChange({ ...form, file_name: file.name, content_type: file.type || "application/octet-stream", content_base64: result.includes(",") ? result.split(",")[1] : result });
    };
    reader.readAsDataURL(file);
  }
  return <div className="space-y-5"><Field label="Certificate File" info="Stored in the tenant configured MinIO or S3 provider."><input className={inputClass} type="file" onChange={(event) => onFile(event.target.files?.[0])} /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="File Name"><input className={inputClass} value={form.file_name} onChange={(event) => onChange({ ...form, file_name: event.target.value })} /></Field><Field label="Score"><input className={inputClass} max="100" min="0" type="number" value={form.score} onChange={(event) => onChange({ ...form, score: event.target.value })} /></Field></div><Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} /></Field><ModalActions onSubmit={onSubmit} /></div>;
}
