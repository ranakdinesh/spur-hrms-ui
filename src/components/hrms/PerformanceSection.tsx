"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name?: string | null; worker_code?: string | null };
type Cycle = { id: string; name: string; status: string };
type Objective = { id: string; title: string; owner_worker_profile_id?: string | null };
type CheckIn = { id: string; worker_profile_id: string; worker_display_name?: string | null; worker_code?: string | null; reviewer_worker_profile_id?: string | null; reviewer_display_name?: string | null; cycle_id?: string | null; cycle_name?: string | null; checkin_date: string; period_start: string; period_end: string; mood: string; status: string; visibility: string; highlights?: string | null; blockers?: string | null; next_plan?: string | null; manager_comment?: string | null; score?: number | null; calibration_bucket?: string | null; feedback_count: number; average_feedback_rating: number };
type FeedbackRequest = { id: string; subject_worker_profile_id: string; subject_display_name?: string | null; requester_worker_profile_id?: string | null; requester_display_name?: string | null; objective_id?: string | null; objective_title?: string | null; relationship: string; feedback_type: string; status: string; is_anonymous: boolean; visibility: string; due_date?: string | null; prompt?: string | null; response_count: number };
type FeedbackResponse = { id: string; request_id: string; subject_display_name?: string | null; respondent_display_name?: string | null; is_anonymous: boolean; rating?: number | null; strengths?: string | null; improvements?: string | null; comments?: string | null; submitted_at: string; feedback_type?: string | null; relationship?: string | null };
type TimelineEvent = { id: string; worker_display_name?: string | null; actor_display_name?: string | null; objective_title?: string | null; event_type: string; title: string; notes?: string | null; created_at: string };
type CalibrationRow = { worker_profile_id: string; worker_display_name: string; worker_code?: string | null; cycle_name?: string | null; checkin_count: number; submitted_checkin_count: number; average_score: number; calibration_bucket?: string | null; average_okr_progress: number; feedback_count: number; average_feedback_rating: number };
type SummaryRow = { status: string; mood: string; checkin_count: number; average_score: number };
type Tab = "checkins" | "feedback" | "timeline" | "calibration";

const inputClass = "w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]";
const moods = ["great", "good", "neutral", "low", "stressed"];
const checkInStatuses = ["draft", "submitted", "reviewed", "closed"];
const visibilities = ["worker_manager_hr", "manager_hr", "hr_only"];
const feedbackVisibilities = ["subject_manager_hr", "manager_hr", "hr_only", "subject_only"];
const relationships = ["manager", "peer", "direct_report", "self", "hr", "client"];
const feedbackTypes = ["360", "project", "general", "okr", "manager_review"];
const feedbackStatuses = ["requested", "submitted", "declined", "expired", "cancelled"];
const buckets = ["high", "solid", "watch", "improve"];

function defaultCheckInForm() {
  const today = dateOnly(new Date().toISOString());
  return { worker_profile_id: "", reviewer_worker_profile_id: "", cycle_id: "", checkin_date: today, period_start: today, period_end: today, mood: "neutral", status: "draft", visibility: "worker_manager_hr", highlights: "", blockers: "", next_plan: "", employee_comment: "" };
}

function defaultReviewForm() {
  return { status: "reviewed", manager_comment: "", score: "", calibration_bucket: "" };
}

function defaultFeedbackRequestForm() {
  return { subject_worker_profile_id: "", requester_worker_profile_id: "", objective_id: "", relationship: "peer", feedback_type: "360", status: "requested", is_anonymous: true, visibility: "subject_manager_hr", due_date: "", prompt: "" };
}

function defaultFeedbackResponseForm() {
  return { request_id: "", respondent_worker_profile_id: "", rating: "", strengths: "", improvements: "", comments: "" };
}

export function PerformanceSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Performance" subtitle="Open a tenant to manage check-ins, 360 feedback, timelines, and calibration." />
        {tenantsError ? <Alert tone="danger" text={tenantsError} /> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setTenant(row)} type="button">Open</button></td></tr>)}</tbody>
          </table>
        </section>
      </main>
    );
  }

  return <PerformanceWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function PerformanceWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("checkins");
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [feedbackResponses, setFeedbackResponses] = useState<FeedbackResponse[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [calibration, setCalibration] = useState<CalibrationRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [cycleFilter, setCycleFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [checkInModal, setCheckInModal] = useState(false);
  const [reviewModal, setReviewModal] = useState<CheckIn | null>(null);
  const [feedbackRequestModal, setFeedbackRequestModal] = useState(false);
  const [feedbackResponseModal, setFeedbackResponseModal] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | null>(null);
  const [editingFeedbackRequest, setEditingFeedbackRequest] = useState<FeedbackRequest | null>(null);
  const [checkInForm, setCheckInForm] = useState(defaultCheckInForm());
  const [reviewForm, setReviewForm] = useState(defaultReviewForm());
  const [feedbackRequestForm, setFeedbackRequestForm] = useState(defaultFeedbackRequestForm());
  const [feedbackResponseForm, setFeedbackResponseForm] = useState(defaultFeedbackResponseForm());

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (cycleFilter) params.set("cycle_id", cycleFilter);
    if (workerFilter) params.set("worker_profile_id", workerFilter);
    if (statusFilter) params.set("status", statusFilter);
    const suffix = params.toString() ? `?${params}` : "";
    const workerSuffix = workerFilter ? `?worker_profile_id=${encodeURIComponent(workerFilter)}` : "";
    const cycleSuffix = cycleFilter ? `?cycle_id=${encodeURIComponent(cycleFilter)}` : "";
    const [checkInRows, requestRows, responseRows, timelineRows, calibrationRows, summaryRows, workerRows, cycleRows, objectiveRows] = await Promise.all([
      apiRequest<CheckIn[]>(`${basePath}/performance-checkins${suffix}`).catch(() => []),
      apiRequest<FeedbackRequest[]>(`${basePath}/feedback-requests`).catch(() => []),
      apiRequest<FeedbackResponse[]>(`${basePath}/feedback-responses${workerSuffix ? `?subject_worker_profile_id=${encodeURIComponent(workerFilter)}` : ""}`).catch(() => []),
      apiRequest<TimelineEvent[]>(`${basePath}/performance-timeline${workerSuffix}`).catch(() => []),
      apiRequest<CalibrationRow[]>(`${basePath}/performance-calibration${cycleFilter || workerFilter ? `?${new URLSearchParams({ ...(cycleFilter ? { cycle_id: cycleFilter } : {}), ...(workerFilter ? { worker_profile_id: workerFilter } : {}) })}` : ""}`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/performance-checkin-summary${cycleSuffix}`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<Cycle[]>(`${basePath}/okr-cycles`).catch(() => []),
      apiRequest<Objective[]>(`${basePath}/objectives`).catch(() => []),
    ]);
    setCheckIns(checkInRows);
    setFeedbackRequests(requestRows);
    setFeedbackResponses(responseRows);
    setTimeline(timelineRows);
    setCalibration(calibrationRows);
    setSummary(summaryRows);
    setWorkers(workerRows);
    setCycles(cycleRows);
    setObjectives(objectiveRows);
    setCycleFilter((current) => current || cycleRows.find((row) => row.status === "active")?.id || "");
  }, [basePath, cycleFilter, statusFilter, workerFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load performance data."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const submitted = checkIns.filter((row) => row.status !== "draft").length;
    const reviewed = checkIns.filter((row) => row.status === "reviewed" || row.status === "closed").length;
    const scoreRows = checkIns.filter((row) => typeof row.score === "number");
    const avgScore = scoreRows.length ? (scoreRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoreRows.length).toFixed(1) : "0.0";
    const stressed = summary.filter((row) => row.mood === "stressed" || row.mood === "low").reduce((sum, row) => sum + row.checkin_count, 0);
    return { checkins: checkIns.length, submitted, reviewed, avgScore, feedback: feedbackRequests.length, stressed };
  }, [checkIns, feedbackRequests.length, summary]);

  function openCheckIn(item?: CheckIn) {
    setEditingCheckIn(item || null);
    setCheckInForm(item ? { worker_profile_id: item.worker_profile_id, reviewer_worker_profile_id: item.reviewer_worker_profile_id || "", cycle_id: item.cycle_id || "", checkin_date: dateOnly(item.checkin_date), period_start: dateOnly(item.period_start), period_end: dateOnly(item.period_end), mood: item.mood, status: item.status, visibility: item.visibility, highlights: item.highlights || "", blockers: item.blockers || "", next_plan: item.next_plan || "", employee_comment: "" } : { ...defaultCheckInForm(), worker_profile_id: workerFilter || workers[0]?.id || "", cycle_id: cycleFilter || cycles[0]?.id || "" });
    setCheckInModal(true);
  }

  function openReview(item: CheckIn) {
    setReviewModal(item);
    setReviewForm({ status: item.status === "closed" ? "closed" : "reviewed", manager_comment: item.manager_comment || "", score: item.score == null ? "" : String(item.score), calibration_bucket: item.calibration_bucket || "" });
  }

  function openFeedbackRequest(item?: FeedbackRequest) {
    setEditingFeedbackRequest(item || null);
    setFeedbackRequestForm(item ? { subject_worker_profile_id: item.subject_worker_profile_id, requester_worker_profile_id: item.requester_worker_profile_id || "", objective_id: item.objective_id || "", relationship: item.relationship, feedback_type: item.feedback_type, status: item.status, is_anonymous: item.is_anonymous, visibility: item.visibility, due_date: dateOnly(item.due_date), prompt: item.prompt || "" } : { ...defaultFeedbackRequestForm(), subject_worker_profile_id: workerFilter || workers[0]?.id || "" });
    setFeedbackRequestModal(true);
  }

  async function saveCheckIn() {
    const payload = { ...checkInForm, reviewer_worker_profile_id: checkInForm.reviewer_worker_profile_id || null, cycle_id: checkInForm.cycle_id || null, highlights: checkInForm.highlights || null, blockers: checkInForm.blockers || null, next_plan: checkInForm.next_plan || null, employee_comment: checkInForm.employee_comment || null, metadata: {} };
    const path = editingCheckIn ? `${basePath}/performance-checkins/${editingCheckIn.id}` : `${basePath}/performance-checkins`;
    await apiRequest(path, { method: editingCheckIn ? "PUT" : "POST", body: JSON.stringify(payload) });
    setNotice(editingCheckIn ? "Check-in updated." : "Check-in created.");
    setCheckInModal(false);
    await load();
  }

  async function submitCheckIn(item: CheckIn) {
    await apiRequest(`${basePath}/performance-checkins/${item.id}/submit`, { method: "POST", body: JSON.stringify({ status: "submitted" }) });
    setNotice("Check-in submitted.");
    await load();
  }

  async function saveReview() {
    if (!reviewModal) return;
    await apiRequest(`${basePath}/performance-checkins/${reviewModal.id}/review`, { method: "POST", body: JSON.stringify({ status: reviewForm.status, manager_comment: reviewForm.manager_comment || null, score: reviewForm.score === "" ? null : Number(reviewForm.score), calibration_bucket: reviewForm.calibration_bucket || null }) });
    setNotice("Review saved.");
    setReviewModal(null);
    await load();
  }

  async function saveFeedbackRequest() {
    const payload = { ...feedbackRequestForm, requester_worker_profile_id: feedbackRequestForm.requester_worker_profile_id || null, objective_id: feedbackRequestForm.objective_id || null, prompt: feedbackRequestForm.prompt || null, metadata: {} };
    const path = editingFeedbackRequest ? `${basePath}/feedback-requests/${editingFeedbackRequest.id}` : `${basePath}/feedback-requests`;
    await apiRequest(path, { method: editingFeedbackRequest ? "PUT" : "POST", body: JSON.stringify(payload) });
    setNotice(editingFeedbackRequest ? "Feedback request updated." : "Feedback request created.");
    setFeedbackRequestModal(false);
    await load();
  }

  async function saveFeedbackResponse() {
    const payload = { ...feedbackResponseForm, respondent_worker_profile_id: feedbackResponseForm.respondent_worker_profile_id || null, rating: feedbackResponseForm.rating === "" ? null : Number(feedbackResponseForm.rating), strengths: feedbackResponseForm.strengths || null, improvements: feedbackResponseForm.improvements || null, comments: feedbackResponseForm.comments || null, metadata: {} };
    await apiRequest(`${basePath}/feedback-responses`, { method: "POST", body: JSON.stringify(payload) });
    setNotice("Feedback response submitted.");
    setFeedbackResponseModal(false);
    await load();
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title="Performance" subtitle={tenant ? tenant.name : "Weekly check-ins, 360 feedback, visibility controls, and calibration extraction."} action={<div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}<Info text="Continuous performance tools commonly pair frequent check-ins with 360 feedback, anonymity policies, manager review, and calibration extracts instead of relying only on annual appraisal forms." /><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openCheckIn()} type="button">New Check-In</button></div>} />
      {notice ? <Alert tone="success" text={notice} /> : null}
      {error ? <Alert tone="danger" text={error} /> : null}
      <section className="grid gap-4 md:grid-cols-6"><Metric label="Check-Ins" value={String(metrics.checkins)} /><Metric label="Submitted" value={String(metrics.submitted)} /><Metric label="Reviewed" value={String(metrics.reviewed)} /><Metric label="Avg Score" value={metrics.avgScore} /><Metric label="Feedback" value={String(metrics.feedback)} /><Metric label="Low Mood" value={String(metrics.stressed)} /></section>
      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]"><select className={inputClass} value={cycleFilter} onChange={(event) => setCycleFilter(event.target.value)}><option value="">All cycles</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select><select className={inputClass} value={workerFilter} onChange={(event) => setWorkerFilter(event.target.value)}><option value="">All workers</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select><select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{checkInStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={() => openFeedbackRequest()} type="button">Request Feedback</button><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={() => { setFeedbackResponseForm({ ...defaultFeedbackResponseForm(), request_id: feedbackRequests[0]?.id || "" }); setFeedbackResponseModal(true); }} type="button">Submit Feedback</button></div></section>
      <section className="flex flex-wrap gap-2">{(["checkins", "feedback", "timeline", "calibration"] as Tab[]).map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</section>
      {tab === "checkins" ? <CheckInsTable onEdit={openCheckIn} onReview={openReview} onSubmit={(row) => void submitCheckIn(row).catch((err) => setError(err instanceof Error ? err.message : "Unable to submit check-in."))} rows={checkIns} /> : null}
      {tab === "feedback" ? <FeedbackTable onEditRequest={openFeedbackRequest} requests={feedbackRequests} responses={feedbackResponses} /> : null}
      {tab === "timeline" ? <TimelineTable rows={timeline} /> : null}
      {tab === "calibration" ? <CalibrationTable rows={calibration} /> : null}
      <CheckInModal cycles={cycles} editing={editingCheckIn} form={checkInForm} onChange={setCheckInForm} onClose={() => setCheckInModal(false)} onSubmit={() => void saveCheckIn().catch((err) => setError(err instanceof Error ? err.message : "Unable to save check-in."))} open={checkInModal} workers={workers} />
      <ReviewModal form={reviewForm} onChange={setReviewForm} onClose={() => setReviewModal(null)} onSubmit={() => void saveReview().catch((err) => setError(err instanceof Error ? err.message : "Unable to save review."))} open={Boolean(reviewModal)} />
      <FeedbackRequestModal editing={editingFeedbackRequest} form={feedbackRequestForm} objectives={objectives} onChange={setFeedbackRequestForm} onClose={() => setFeedbackRequestModal(false)} onSubmit={() => void saveFeedbackRequest().catch((err) => setError(err instanceof Error ? err.message : "Unable to save feedback request."))} open={feedbackRequestModal} workers={workers} />
      <FeedbackResponseModal form={feedbackResponseForm} onChange={setFeedbackResponseForm} onClose={() => setFeedbackResponseModal(false)} onSubmit={() => void saveFeedbackResponse().catch((err) => setError(err instanceof Error ? err.message : "Unable to submit feedback."))} open={feedbackResponseModal} requests={feedbackRequests} workers={workers} />
    </main>
  );
}

function CheckInsTable({ onEdit, onReview, onSubmit, rows }: { onEdit: (row: CheckIn) => void; onReview: (row: CheckIn) => void; onSubmit: (row: CheckIn) => void; rows: CheckIn[] }) {
  return <DataTable headers={["Worker", "Period", "Mood", "Status", "Score", "Feedback", "Actions"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.worker_display_name || "Worker"}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.worker_code || row.cycle_name || ""}</span></td><td className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{dateOnly(row.period_start)} to {dateOnly(row.period_end)}</td><td className="px-5 py-4"><Badge text={label(row.mood)} /></td><td className="px-5 py-4"><Badge text={label(row.status)} /></td><td className="px-5 py-4 text-sm font-black text-[#111827]">{row.score ?? "-"}</td><td className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{row.feedback_count} / {Number(row.average_feedback_rating || 0).toFixed(1)}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button>{row.status === "draft" ? <button className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white" onClick={() => onSubmit(row)} type="button">Submit</button> : null}<button className="rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white" onClick={() => onReview(row)} type="button">Review</button></div></td></tr>)}</DataTable>;
}

function FeedbackTable({ onEditRequest, requests, responses }: { onEditRequest: (row: FeedbackRequest) => void; requests: FeedbackRequest[]; responses: FeedbackResponse[] }) {
  return <div className="grid gap-5 xl:grid-cols-2"><DataTable headers={["Request", "Type", "Status", "Policy", "Actions"]}>{requests.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.subject_display_name || "Subject"}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.objective_title || row.prompt || "General feedback"}</span></td><td className="px-5 py-4 text-sm font-semibold">{label(row.feedback_type)} / {label(row.relationship)}</td><td className="px-5 py-4"><Badge text={label(row.status)} /></td><td className="px-5 py-4 text-sm font-semibold">{row.is_anonymous ? "Anonymous" : "Named"} · {label(row.visibility)}</td><td className="px-5 py-4"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEditRequest(row)} type="button">Edit</button></td></tr>)}</DataTable><DataTable headers={["Response", "Rating", "Submitted"]}>{responses.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.subject_display_name || "Subject"}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.is_anonymous ? "Anonymous respondent" : row.respondent_display_name || "Respondent"} · {row.comments || row.strengths || ""}</span></td><td className="px-5 py-4 text-sm font-black">{row.rating ?? "-"}</td><td className="px-5 py-4 text-sm font-semibold">{dateOnly(row.submitted_at)}</td></tr>)}</DataTable></div>;
}

function TimelineTable({ rows }: { rows: TimelineEvent[] }) {
  return <DataTable headers={["Event", "Worker", "Actor", "Created"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.title}</strong><span className="block text-xs font-semibold text-[#6b7280]">{label(row.event_type)} · {row.notes || row.objective_title || ""}</span></td><td className="px-5 py-4 text-sm font-semibold">{row.worker_display_name || "-"}</td><td className="px-5 py-4 text-sm font-semibold">{row.actor_display_name || "-"}</td><td className="px-5 py-4 text-sm font-semibold">{dateOnly(row.created_at)}</td></tr>)}</DataTable>;
}

function CalibrationTable({ rows }: { rows: CalibrationRow[] }) {
  return <DataTable headers={["Worker", "Check-Ins", "Score", "OKR", "Feedback", "Bucket"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={`${row.worker_profile_id}-${row.cycle_name || "all"}`}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.worker_display_name}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.worker_code || row.cycle_name || ""}</span></td><td className="px-5 py-4 text-sm font-semibold">{row.submitted_checkin_count}/{row.checkin_count}</td><td className="px-5 py-4 text-sm font-black">{Number(row.average_score || 0).toFixed(1)}</td><td className="px-5 py-4 text-sm font-semibold">{Number(row.average_okr_progress || 0).toFixed(0)}%</td><td className="px-5 py-4 text-sm font-semibold">{row.feedback_count} / {Number(row.average_feedback_rating || 0).toFixed(1)}</td><td className="px-5 py-4"><Badge text={label(row.calibration_bucket || "unbucketed")} /></td></tr>)}</DataTable>;
}

function CheckInModal({ cycles, editing, form, onChange, onClose, onSubmit, open, workers }: { cycles: Cycle[]; editing: CheckIn | null; form: ReturnType<typeof defaultCheckInForm>; onChange: (form: ReturnType<typeof defaultCheckInForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; workers: Worker[] }) {
  return <HrmsModal open={open} onClose={onClose} title={editing ? "Edit Check-In" : "New Check-In"}><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Worker"><select className={inputClass} value={form.worker_profile_id} onChange={(event) => onChange({ ...form, worker_profile_id: event.target.value })}><option value="">Select worker</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Reviewer"><select className={inputClass} value={form.reviewer_worker_profile_id} onChange={(event) => onChange({ ...form, reviewer_worker_profile_id: event.target.value })}><option value="">No reviewer</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Cycle"><select className={inputClass} value={form.cycle_id} onChange={(event) => onChange({ ...form, cycle_id: event.target.value })}><option value="">No cycle</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></Field><Field label="Check-In Date"><input className={inputClass} type="date" value={form.checkin_date} onChange={(event) => onChange({ ...form, checkin_date: event.target.value })} /></Field><Field label="Period Start"><input className={inputClass} type="date" value={form.period_start} onChange={(event) => onChange({ ...form, period_start: event.target.value })} /></Field><Field label="Period End"><input className={inputClass} type="date" value={form.period_end} onChange={(event) => onChange({ ...form, period_end: event.target.value })} /></Field><Field label="Mood"><Select value={form.mood} values={moods} onChange={(value) => onChange({ ...form, mood: value })} /></Field><Field label="Visibility"><Select value={form.visibility} values={visibilities} onChange={(value) => onChange({ ...form, visibility: value })} /></Field></div><Field label="Highlights"><textarea className={`${inputClass} min-h-20`} value={form.highlights} onChange={(event) => onChange({ ...form, highlights: event.target.value })} /></Field><Field label="Blockers"><textarea className={`${inputClass} min-h-20`} value={form.blockers} onChange={(event) => onChange({ ...form, blockers: event.target.value })} /></Field><Field label="Next Plan"><textarea className={`${inputClass} min-h-20`} value={form.next_plan} onChange={(event) => onChange({ ...form, next_plan: event.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function ReviewModal({ form, onChange, onClose, onSubmit, open }: { form: ReturnType<typeof defaultReviewForm>; onChange: (form: ReturnType<typeof defaultReviewForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Review Check-In"><div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Field label="Status"><Select value={form.status} values={["reviewed", "closed"]} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Score"><input className={inputClass} max="5" min="0" step="0.1" type="number" value={form.score} onChange={(event) => onChange({ ...form, score: event.target.value })} /></Field><Field label="Bucket"><Select allowEmpty value={form.calibration_bucket} values={buckets} onChange={(value) => onChange({ ...form, calibration_bucket: value })} /></Field></div><Field label="Manager Comment"><textarea className={`${inputClass} min-h-24`} value={form.manager_comment} onChange={(event) => onChange({ ...form, manager_comment: event.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function FeedbackRequestModal({ editing, form, objectives, onChange, onClose, onSubmit, open, workers }: { editing: FeedbackRequest | null; form: ReturnType<typeof defaultFeedbackRequestForm>; objectives: Objective[]; onChange: (form: ReturnType<typeof defaultFeedbackRequestForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; workers: Worker[] }) {
  return <HrmsModal open={open} onClose={onClose} title={editing ? "Edit Feedback Request" : "Request Feedback"}><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Subject"><select className={inputClass} value={form.subject_worker_profile_id} onChange={(event) => onChange({ ...form, subject_worker_profile_id: event.target.value })}><option value="">Select worker</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Requester"><select className={inputClass} value={form.requester_worker_profile_id} onChange={(event) => onChange({ ...form, requester_worker_profile_id: event.target.value })}><option value="">No requester</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Objective"><select className={inputClass} value={form.objective_id} onChange={(event) => onChange({ ...form, objective_id: event.target.value })}><option value="">No objective</option>{objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}</select></Field><Field label="Due Date"><input className={inputClass} type="date" value={form.due_date} onChange={(event) => onChange({ ...form, due_date: event.target.value })} /></Field><Field label="Relationship"><Select value={form.relationship} values={relationships} onChange={(value) => onChange({ ...form, relationship: value })} /></Field><Field label="Type"><Select value={form.feedback_type} values={feedbackTypes} onChange={(value) => onChange({ ...form, feedback_type: value })} /></Field><Field label="Status"><Select value={form.status} values={feedbackStatuses} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Visibility"><Select value={form.visibility} values={feedbackVisibilities} onChange={(value) => onChange({ ...form, visibility: value })} /></Field></div><label className="flex items-center gap-3 text-sm font-black text-[#374151]"><input checked={form.is_anonymous} onChange={(event) => onChange({ ...form, is_anonymous: event.target.checked })} type="checkbox" /> Anonymous response</label><Field label="Prompt"><textarea className={`${inputClass} min-h-24`} value={form.prompt} onChange={(event) => onChange({ ...form, prompt: event.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function FeedbackResponseModal({ form, onChange, onClose, onSubmit, open, requests, workers }: { form: ReturnType<typeof defaultFeedbackResponseForm>; onChange: (form: ReturnType<typeof defaultFeedbackResponseForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; requests: FeedbackRequest[]; workers: Worker[] }) {
  return <HrmsModal open={open} onClose={onClose} title="Submit Feedback"><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Request"><select className={inputClass} value={form.request_id} onChange={(event) => onChange({ ...form, request_id: event.target.value })}><option value="">Select request</option>{requests.map((request) => <option key={request.id} value={request.id}>{request.subject_display_name || "Subject"} · {label(request.feedback_type)}</option>)}</select></Field><Field label="Respondent"><select className={inputClass} value={form.respondent_worker_profile_id} onChange={(event) => onChange({ ...form, respondent_worker_profile_id: event.target.value })}><option value="">No respondent</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Rating"><input className={inputClass} max="5" min="0" step="0.1" type="number" value={form.rating} onChange={(event) => onChange({ ...form, rating: event.target.value })} /></Field></div><Field label="Strengths"><textarea className={`${inputClass} min-h-20`} value={form.strengths} onChange={(event) => onChange({ ...form, strengths: event.target.value })} /></Field><Field label="Improvements"><textarea className={`${inputClass} min-h-20`} value={form.improvements} onChange={(event) => onChange({ ...form, improvements: event.target.value })} /></Field><Field label="Comments"><textarea className={`${inputClass} min-h-20`} value={form.comments} onChange={(event) => onChange({ ...form, comments: event.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-3xl font-black text-[#111827]">{title}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">{subtitle}</p></div>{action}</header>;
}

function DataTable({ children, headers }: { children: ReactNode; headers: string[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((header) => <th className="px-5 py-4" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{children}</tbody></table></div></section>;
}

function Metric({ label: labelText, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><span className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{labelText}</span><strong className="mt-2 block text-2xl font-black text-[#111827]">{value}</strong></div>;
}

function Field({ children, label: labelText }: { children: ReactNode; label: string }) {
  return <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{labelText}</span>{children}</label>;
}

function Select({ allowEmpty, onChange, value, values }: { allowEmpty?: boolean; onChange: (value: string) => void; value: string; values: string[] }) {
  return <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{allowEmpty ? <option value="">None</option> : null}{values.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>;
}

function ModalActions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{text}</span>;
}

function Alert({ text, tone }: { text: string; tone: "success" | "danger" }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-[#cfe7d8] bg-[#f0faf3] text-[#2f6b43]" : "border-[#f4c7c7] bg-[#fff5f5] text-[#b42318]"}`}>{text}</div>;
}

function Info({ text }: { text: string }) {
  return <span className="group relative inline-flex"><button aria-label="Performance workflow info" className="h-11 w-11 rounded-xl border border-[#dbe0e5] text-sm font-black text-[#588368]" type="button">i</button><span className="pointer-events-none absolute right-0 top-12 z-20 hidden w-80 rounded-2xl border border-[#dbe0e5] bg-white p-4 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span></span>;
}

function workerName(worker: Worker) {
  return `${worker.display_name || "Worker"}${worker.worker_code ? ` (${worker.worker_code})` : ""}`;
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
