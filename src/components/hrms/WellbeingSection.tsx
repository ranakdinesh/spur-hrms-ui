"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name?: string | null; worker_code?: string | null };
type Department = { id: string; name: string };
type Survey = { id: string; title: string; description?: string | null; survey_type: string; status: string; audience_scope: string; department_id?: string | null; department_name?: string | null; start_date: string; end_date?: string | null; frequency: string; anonymity_threshold: number; consent_required: boolean; manager_aggregate_only: boolean; critical_alerts_enabled: boolean; question_count: number; respondent_count: number; response_count: number };
type Question = { id: string; survey_id: string; question_text: string; question_type: string; category: string; is_required: boolean; sort_order: number; options?: string[] | null };
type PulseResponse = { id: string; survey_id: string; question_id: string; worker_profile_id?: string | null; survey_title?: string | null; question_text?: string | null; category?: string | null; worker_display_name?: string | null; worker_code?: string | null; response_date: string; score?: number | null; text_response?: string | null; boolean_response?: boolean | null; option_value?: string | null; consent_given: boolean; is_anonymous: boolean; risk_level: string; critical_alert: boolean };
type Score = { id: string; worker_profile_id: string; worker_display_name?: string | null; worker_code?: string | null; score_date: string; wellbeing_score: number; mood_score?: number | null; stress_score?: number | null; workload_score?: number | null; risk_level: string; consent_scope: string; survey_title?: string | null; notes?: string | null };
type AlertRow = { id: string; worker_display_name?: string | null; worker_code?: string | null; survey_title?: string | null; alert_type: string; severity: string; status: string; message: string; resolution_note?: string | null; created_at: string };
type Aggregate = { survey_id: string; survey_title: string; department_id?: string | null; department_name?: string | null; category: string; response_count: number; respondent_count: number; suppressed: boolean; average_score?: number | null; risk_count: number; anonymity_threshold: number };
type Tab = "surveys" | "questions" | "respond" | "scores" | "alerts" | "aggregates";

const inputClass = "w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]";
const surveyTypes = ["pulse", "wellbeing", "engagement"];
const surveyStatuses = ["draft", "active", "closed", "archived"];
const audienceScopes = ["all", "department", "custom"];
const frequencies = ["one_time", "weekly", "biweekly", "monthly"];
const questionTypes = ["scale", "text", "boolean", "option"];
const categories = ["mood", "stress", "workload", "engagement", "manager", "culture", "other"];
const riskLevels = ["none", "low", "medium", "high", "critical"];
const alertStatuses = ["open", "acknowledged", "resolved", "dismissed"];

function defaultSurveyForm() {
  const today = dateOnly(new Date().toISOString());
  return { title: "", description: "", survey_type: "pulse", status: "draft", audience_scope: "all", department_id: "", start_date: today, end_date: "", frequency: "one_time", anonymity_threshold: "5", consent_required: true, manager_aggregate_only: true, critical_alerts_enabled: true };
}

function defaultQuestionForm() {
  return { survey_id: "", question_text: "", question_type: "scale", category: "mood", is_required: true, sort_order: "1", options: "" };
}

function defaultResponseForm() {
  return { survey_id: "", question_id: "", worker_profile_id: "", response_date: dateOnly(new Date().toISOString()), score: "", text_response: "", boolean_response: "", option_value: "", consent_given: true, is_anonymous: true, risk_level: "none", critical_alert: false };
}

function defaultScoreForm() {
  return { worker_profile_id: "", score_date: dateOnly(new Date().toISOString()), source_survey_id: "", wellbeing_score: "", mood_score: "", stress_score: "", workload_score: "", risk_level: "none", consent_scope: "employee", notes: "" };
}

function defaultAlertForm() {
  return { status: "acknowledged", resolution_note: "" };
}

export function WellbeingSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Wellbeing" subtitle="Open a tenant to manage pulse surveys, consent, anonymous responses, HR alerts, and aggregate trends." />
        {tenantsError ? <Alert tone="danger" text={tenantsError} /> : null}
        <DataTable headers={["Tenant", "Plan", "Status", "Actions"]}>
          {tenantsLoading ? <EmptyRow colSpan={4} text="Loading tenants..." /> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code}</span></td><td className="px-5 py-5"><Badge text={row.plan} /></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setTenant(row)} type="button">Open</button></td></tr>)}
        </DataTable>
      </main>
    );
  }

  return <WellbeingWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function WellbeingWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("surveys");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<PulseResponse[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [aggregates, setAggregates] = useState<Aggregate[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [surveyFilter, setSurveyFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [surveyModal, setSurveyModal] = useState(false);
  const [questionModal, setQuestionModal] = useState(false);
  const [responseModal, setResponseModal] = useState(false);
  const [scoreModal, setScoreModal] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertRow | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [surveyForm, setSurveyForm] = useState(defaultSurveyForm());
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm());
  const [responseForm, setResponseForm] = useState(defaultResponseForm());
  const [scoreForm, setScoreForm] = useState(defaultScoreForm());
  const [alertForm, setAlertForm] = useState(defaultAlertForm());

  const load = useCallback(async () => {
    const surveyParams = new URLSearchParams();
    if (statusFilter) surveyParams.set("status", statusFilter);
    const surveySuffix = surveyParams.toString() ? `?${surveyParams}` : "";
    const scopedSurvey = surveyFilter ? `?survey_id=${encodeURIComponent(surveyFilter)}` : "";
    const responseParams = new URLSearchParams();
    if (surveyFilter) responseParams.set("survey_id", surveyFilter);
    if (riskFilter) responseParams.set("risk_level", riskFilter);
    const responseSuffix = responseParams.toString() ? `?${responseParams}` : "";
    const riskSuffix = riskFilter ? `?risk_level=${encodeURIComponent(riskFilter)}` : "";
    const [surveyRows, questionRows, responseRows, scoreRows, alertRows, aggregateRows, workerRows, departmentRows] = await Promise.all([
      apiRequest<Survey[]>(`${basePath}/pulse-surveys${surveySuffix}`).catch(() => []),
      apiRequest<Question[]>(`${basePath}/pulse-questions${scopedSurvey}`).catch(() => []),
      apiRequest<PulseResponse[]>(`${basePath}/pulse-responses${responseSuffix}`).catch(() => []),
      apiRequest<Score[]>(`${basePath}/wellbeing-scores${riskSuffix}`).catch(() => []),
      apiRequest<AlertRow[]>(`${basePath}/wellbeing-alerts`).catch(() => []),
      apiRequest<Aggregate[]>(`${basePath}/wellbeing-aggregates${scopedSurvey}`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<Department[]>(`${basePath}/departments`).catch(() => []),
    ]);
    setSurveys(surveyRows);
    setQuestions(questionRows);
    setResponses(responseRows);
    setScores(scoreRows);
    setAlerts(alertRows);
    setAggregates(aggregateRows);
    setWorkers(workerRows);
    setDepartments(departmentRows);
  }, [basePath, riskFilter, statusFilter, surveyFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load wellbeing data."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeSurveys = useMemo(() => surveys.filter((row) => row.status === "active"), [surveys]);
  const selectedSurveyQuestions = useMemo(() => questions.filter((row) => !responseForm.survey_id || row.survey_id === responseForm.survey_id), [questions, responseForm.survey_id]);
  const selectedQuestion = useMemo(() => questions.find((row) => row.id === responseForm.question_id) || null, [questions, responseForm.question_id]);
  const metrics = useMemo(() => {
    const critical = alerts.filter((row) => row.severity === "critical" || row.status === "open").length;
    const suppressed = aggregates.filter((row) => row.suppressed).length;
    const averageRows = aggregates.filter((row) => typeof row.average_score === "number");
    const avgScore = averageRows.length ? (averageRows.reduce((sum, row) => sum + Number(row.average_score || 0), 0) / averageRows.length).toFixed(1) : "0.0";
    return { surveys: surveys.length, active: activeSurveys.length, responses: responses.length, scores: scores.length, alerts: alerts.length, critical, avgScore, suppressed };
  }, [activeSurveys.length, aggregates, alerts, responses.length, scores.length, surveys.length]);

  function openSurvey(item?: Survey) {
    setEditingSurvey(item || null);
    setSurveyForm(item ? { title: item.title, description: item.description || "", survey_type: item.survey_type, status: item.status, audience_scope: item.audience_scope, department_id: item.department_id || "", start_date: dateOnly(item.start_date), end_date: dateOnly(item.end_date), frequency: item.frequency, anonymity_threshold: String(item.anonymity_threshold || 5), consent_required: item.consent_required, manager_aggregate_only: item.manager_aggregate_only, critical_alerts_enabled: item.critical_alerts_enabled } : defaultSurveyForm());
    setSurveyModal(true);
  }

  function openQuestion(item?: Question) {
    setEditingQuestion(item || null);
    setQuestionForm(item ? { survey_id: item.survey_id, question_text: item.question_text, question_type: item.question_type, category: item.category, is_required: item.is_required, sort_order: String(item.sort_order || 1), options: Array.isArray(item.options) ? item.options.join(", ") : "" } : { ...defaultQuestionForm(), survey_id: surveyFilter || surveys[0]?.id || "" });
    setQuestionModal(true);
  }

  function openResponse() {
    const surveyID = surveyFilter || activeSurveys[0]?.id || surveys[0]?.id || "";
    const questionID = questions.find((row) => row.survey_id === surveyID)?.id || questions[0]?.id || "";
    setResponseForm({ ...defaultResponseForm(), survey_id: surveyID, question_id: questionID, worker_profile_id: workers[0]?.id || "" });
    setResponseModal(true);
  }

  function openScore() {
    setScoreForm({ ...defaultScoreForm(), worker_profile_id: workers[0]?.id || "", source_survey_id: surveyFilter });
    setScoreModal(true);
  }

  async function saveSurvey() {
    const payload = { ...surveyForm, description: surveyForm.description || null, department_id: surveyForm.audience_scope === "department" ? surveyForm.department_id || null : null, end_date: surveyForm.end_date || "", anonymity_threshold: Number(surveyForm.anonymity_threshold || 5), metadata: {} };
    const path = editingSurvey ? `${basePath}/pulse-surveys/${editingSurvey.id}` : `${basePath}/pulse-surveys`;
    await apiRequest(path, { method: editingSurvey ? "PUT" : "POST", body: payload });
    setNotice(editingSurvey ? "Survey updated." : "Survey created.");
    setSurveyModal(false);
    await load();
  }

  async function updateSurveyStatus(item: Survey, status: string) {
    await apiRequest(`${basePath}/pulse-surveys/${item.id}/status`, { method: "POST", body: { status } });
    setNotice(`Survey marked ${label(status)}.`);
    await load();
  }

  async function deleteSurvey(item: Survey) {
    await apiRequest(`${basePath}/pulse-surveys/${item.id}`, { method: "DELETE" });
    setNotice("Survey deactivated.");
    await load();
  }

  async function saveQuestion() {
    const options = questionForm.options.split(",").map((value) => value.trim()).filter(Boolean);
    const payload = { ...questionForm, sort_order: Number(questionForm.sort_order || 1), options, metadata: {} };
    const path = editingQuestion ? `${basePath}/pulse-questions/${editingQuestion.id}` : `${basePath}/pulse-questions`;
    await apiRequest(path, { method: editingQuestion ? "PUT" : "POST", body: payload });
    setNotice(editingQuestion ? "Question updated." : "Question added.");
    setQuestionModal(false);
    await load();
  }

  async function deleteQuestion(item: Question) {
    await apiRequest(`${basePath}/pulse-questions/${item.id}`, { method: "DELETE" });
    setNotice("Question deactivated.");
    await load();
  }

  async function saveResponse() {
    const boolValue = responseForm.boolean_response === "" ? null : responseForm.boolean_response === "true";
    const payload = { ...responseForm, worker_profile_id: responseForm.worker_profile_id || null, score: responseForm.score === "" ? null : Number(responseForm.score), text_response: responseForm.text_response || null, boolean_response: boolValue, option_value: responseForm.option_value || null, metadata: {} };
    await apiRequest(`${basePath}/pulse-responses`, { method: "POST", body: payload });
    setNotice("Response submitted.");
    setResponseModal(false);
    await load();
  }

  async function saveScore() {
    const payload = { ...scoreForm, source_survey_id: scoreForm.source_survey_id || null, wellbeing_score: Number(scoreForm.wellbeing_score || 0), mood_score: scoreForm.mood_score === "" ? null : Number(scoreForm.mood_score), stress_score: scoreForm.stress_score === "" ? null : Number(scoreForm.stress_score), workload_score: scoreForm.workload_score === "" ? null : Number(scoreForm.workload_score), notes: scoreForm.notes || null, metadata: {} };
    await apiRequest(`${basePath}/wellbeing-scores`, { method: "POST", body: payload });
    setNotice("Wellbeing score saved.");
    setScoreModal(false);
    await load();
  }

  async function saveAlert() {
    if (!alertModal) return;
    await apiRequest(`${basePath}/wellbeing-alerts/${alertModal.id}/status`, { method: "POST", body: { status: alertForm.status, resolution_note: alertForm.resolution_note || null } });
    setNotice("Alert updated.");
    setAlertModal(null);
    await load();
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title="Wellbeing" subtitle={tenant ? tenant.name : "Pulse surveys, anonymous responses, HR-only risk alerts, and aggregate wellbeing trends."} action={<div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}<Info text="Good pulse tools keep surveys short, request consent for sensitive signals, suppress small-group aggregates, and route critical risk to HR instead of exposing individual wellbeing details to managers." /><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={openResponse} type="button">Submit Response</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openSurvey()} type="button">New Survey</button></div>} />
      {notice ? <Alert tone="success" text={notice} /> : null}
      {error ? <Alert tone="danger" text={error} /> : null}
      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-8"><Metric label="Surveys" value={String(metrics.surveys)} /><Metric label="Active" value={String(metrics.active)} /><Metric label="Responses" value={String(metrics.responses)} /><Metric label="Scores" value={String(metrics.scores)} /><Metric label="Alerts" value={String(metrics.alerts)} /><Metric label="Open Risk" value={String(metrics.critical)} /><Metric label="Avg Score" value={metrics.avgScore} /><Metric label="Suppressed" value={String(metrics.suppressed)} /></section>
      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto]"><select className={inputClass} value={surveyFilter} onChange={(event) => setSurveyFilter(event.target.value)}><option value="">All surveys</option>{surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}</select><Select allowEmpty value={statusFilter} values={surveyStatuses} onChange={setStatusFilter} emptyLabel="All statuses" /><Select allowEmpty value={riskFilter} values={riskLevels} onChange={setRiskFilter} emptyLabel="All risks" /><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={() => openQuestion()} type="button">Add Question</button><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={openScore} type="button">Add Score</button></div></section>
      <section className="flex flex-wrap gap-2">{(["surveys", "questions", "respond", "scores", "alerts", "aggregates"] as Tab[]).map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</section>
      {tab === "surveys" ? <SurveysTable onDelete={(row) => void deleteSurvey(row).catch(report(setError, "Unable to delete survey."))} onEdit={openSurvey} onStatus={(row, status) => void updateSurveyStatus(row, status).catch(report(setError, "Unable to update survey status."))} rows={surveys} /> : null}
      {tab === "questions" ? <QuestionsTable onDelete={(row) => void deleteQuestion(row).catch(report(setError, "Unable to delete question."))} onEdit={openQuestion} rows={questions} surveys={surveys} /> : null}
      {tab === "respond" ? <ResponsesTable rows={responses} /> : null}
      {tab === "scores" ? <ScoresTable rows={scores} /> : null}
      {tab === "alerts" ? <AlertsTable onReview={(row) => { setAlertModal(row); setAlertForm({ status: row.status === "resolved" ? "resolved" : "acknowledged", resolution_note: row.resolution_note || "" }); }} rows={alerts} /> : null}
      {tab === "aggregates" ? <AggregatesTable rows={aggregates} /> : null}
      <SurveyModal departments={departments} editing={editingSurvey} form={surveyForm} onChange={setSurveyForm} onClose={() => setSurveyModal(false)} onSubmit={() => void saveSurvey().catch(report(setError, "Unable to save survey."))} open={surveyModal} />
      <QuestionModal editing={editingQuestion} form={questionForm} onChange={setQuestionForm} onClose={() => setQuestionModal(false)} onSubmit={() => void saveQuestion().catch(report(setError, "Unable to save question."))} open={questionModal} surveys={surveys} />
      <ResponseModal form={responseForm} onChange={(form) => { const nextQuestion = form.survey_id !== responseForm.survey_id ? questions.find((row) => row.survey_id === form.survey_id)?.id || "" : form.question_id; setResponseForm({ ...form, question_id: nextQuestion }); }} onClose={() => setResponseModal(false)} onSubmit={() => void saveResponse().catch(report(setError, "Unable to submit response."))} open={responseModal} question={selectedQuestion} questions={selectedSurveyQuestions} surveys={activeSurveys.length ? activeSurveys : surveys} workers={workers} />
      <ScoreModal form={scoreForm} onChange={setScoreForm} onClose={() => setScoreModal(false)} onSubmit={() => void saveScore().catch(report(setError, "Unable to save score."))} open={scoreModal} surveys={surveys} workers={workers} />
      <AlertModal form={alertForm} onChange={setAlertForm} onClose={() => setAlertModal(null)} onSubmit={() => void saveAlert().catch(report(setError, "Unable to update alert."))} open={Boolean(alertModal)} />
    </main>
  );
}

function SurveysTable({ onDelete, onEdit, onStatus, rows }: { onDelete: (row: Survey) => void; onEdit: (row: Survey) => void; onStatus: (row: Survey, status: string) => void; rows: Survey[] }) {
  return <DataTable headers={["Survey", "Audience", "Schedule", "Privacy", "Responses", "Actions"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.title}</strong><span className="block text-xs font-semibold text-[#6b7280]">{label(row.survey_type)} · <Badge text={label(row.status)} /></span></td><td className="px-5 py-4 text-sm font-semibold">{label(row.audience_scope)}{row.department_name ? ` · ${row.department_name}` : ""}</td><td className="px-5 py-4 text-sm font-semibold">{dateOnly(row.start_date)}{row.end_date ? ` to ${dateOnly(row.end_date)}` : ""}<span className="block text-xs text-[#6b7280]">{label(row.frequency)}</span></td><td className="px-5 py-4 text-sm font-semibold">Threshold {row.anonymity_threshold}<span className="block text-xs text-[#6b7280]">{row.consent_required ? "Consent required" : "Consent optional"} · {row.manager_aggregate_only ? "Aggregate manager view" : "Detailed manager view"}</span></td><td className="px-5 py-4 text-sm font-black">{row.response_count}<span className="block text-xs font-semibold text-[#6b7280]">{row.respondent_count} people · {row.question_count} questions</span></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button>{row.status === "draft" ? <button className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white" onClick={() => onStatus(row, "active")} type="button">Activate</button> : null}{row.status === "active" ? <button className="rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white" onClick={() => onStatus(row, "closed")} type="button">Close</button> : null}<button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700" onClick={() => onDelete(row)} type="button">Delete</button></div></td></tr>) : <EmptyRow colSpan={6} text="No surveys found." />}</DataTable>;
}

function QuestionsTable({ onDelete, onEdit, rows, surveys }: { onDelete: (row: Question) => void; onEdit: (row: Question) => void; rows: Question[]; surveys: Survey[] }) {
  return <DataTable headers={["Question", "Survey", "Type", "Category", "Required", "Actions"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.question_text}</strong><span className="block text-xs font-semibold text-[#6b7280]">Sort {row.sort_order}</span></td><td className="px-5 py-4 text-sm font-semibold">{surveys.find((survey) => survey.id === row.survey_id)?.title || "-"}</td><td className="px-5 py-4"><Badge text={label(row.question_type)} /></td><td className="px-5 py-4 text-sm font-semibold">{label(row.category)}</td><td className="px-5 py-4 text-sm font-black">{row.is_required ? "Yes" : "No"}</td><td className="px-5 py-4"><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700" onClick={() => onDelete(row)} type="button">Delete</button></div></td></tr>) : <EmptyRow colSpan={6} text="No questions found." />}</DataTable>;
}

function ResponsesTable({ rows }: { rows: PulseResponse[] }) {
  return <DataTable headers={["Survey", "Question", "Respondent", "Response", "Risk", "Date"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4 text-sm font-semibold">{row.survey_title || "-"}</td><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.question_text || "-"}</strong><span className="block text-xs font-semibold text-[#6b7280]">{label(row.category || "other")}</span></td><td className="px-5 py-4 text-sm font-semibold">{row.is_anonymous && !row.critical_alert ? "Anonymous" : row.worker_display_name || "Worker"}<span className="block text-xs text-[#6b7280]">{row.worker_code || ""}</span></td><td className="px-5 py-4 text-sm font-black">{responseValue(row)}</td><td className="px-5 py-4"><Badge text={row.critical_alert ? "Critical" : label(row.risk_level)} /></td><td className="px-5 py-4 text-sm font-semibold">{dateOnly(row.response_date)}</td></tr>) : <EmptyRow colSpan={6} text="No responses found." />}</DataTable>;
}

function ScoresTable({ rows }: { rows: Score[] }) {
  return <DataTable headers={["Worker", "Date", "Score", "Signals", "Risk", "Source"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.worker_display_name || "Worker"}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.worker_code || ""}</span></td><td className="px-5 py-4 text-sm font-semibold">{dateOnly(row.score_date)}</td><td className="px-5 py-4 text-sm font-black">{Number(row.wellbeing_score || 0).toFixed(1)}</td><td className="px-5 py-4 text-sm font-semibold">Mood {valueOrDash(row.mood_score)} · Stress {valueOrDash(row.stress_score)} · Workload {valueOrDash(row.workload_score)}</td><td className="px-5 py-4"><Badge text={label(row.risk_level)} /></td><td className="px-5 py-4 text-sm font-semibold">{row.survey_title || label(row.consent_scope || "employee")}</td></tr>) : <EmptyRow colSpan={6} text="No wellbeing scores found." />}</DataTable>;
}

function AlertsTable({ onReview, rows }: { onReview: (row: AlertRow) => void; rows: AlertRow[] }) {
  return <DataTable headers={["Worker", "Alert", "Severity", "Status", "Created", "Actions"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.worker_display_name || "Worker"}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.worker_code || row.survey_title || ""}</span></td><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{label(row.alert_type)}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.message}</span></td><td className="px-5 py-4"><Badge text={label(row.severity)} /></td><td className="px-5 py-4 text-sm font-semibold">{label(row.status)}</td><td className="px-5 py-4 text-sm font-semibold">{dateOnly(row.created_at)}</td><td className="px-5 py-4"><button className="rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white" onClick={() => onReview(row)} type="button">Review</button></td></tr>) : <EmptyRow colSpan={6} text="No HR alerts found." />}</DataTable>;
}

function AggregatesTable({ rows }: { rows: Aggregate[] }) {
  return <DataTable headers={["Survey", "Group", "Category", "Responses", "Average", "Risk"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={`${row.survey_id}-${row.department_id || "all"}-${row.category}`}><td className="px-5 py-4 text-sm font-semibold">{row.survey_title}</td><td className="px-5 py-4 text-sm font-semibold">{row.department_name || "All"}</td><td className="px-5 py-4"><Badge text={label(row.category)} /></td><td className="px-5 py-4 text-sm font-black">{row.response_count}<span className="block text-xs font-semibold text-[#6b7280]">{row.respondent_count}/{row.anonymity_threshold} respondents</span></td><td className="px-5 py-4 text-sm font-black">{row.suppressed ? "Suppressed" : Number(row.average_score || 0).toFixed(1)}</td><td className="px-5 py-4 text-sm font-semibold">{row.suppressed ? "Suppressed" : row.risk_count}</td></tr>) : <EmptyRow colSpan={6} text="No aggregate trends found." />}</DataTable>;
}

function SurveyModal({ departments, editing, form, onChange, onClose, onSubmit, open }: { departments: Department[]; editing: Survey | null; form: ReturnType<typeof defaultSurveyForm>; onChange: (form: ReturnType<typeof defaultSurveyForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title={editing ? "Edit Survey" : "New Survey"}><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Title"><input className={inputClass} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></Field><Field label="Type"><Select value={form.survey_type} values={surveyTypes} onChange={(value) => onChange({ ...form, survey_type: value })} /></Field><Field label="Status"><Select value={form.status} values={surveyStatuses} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Audience"><Select value={form.audience_scope} values={audienceScopes} onChange={(value) => onChange({ ...form, audience_scope: value })} /></Field>{form.audience_scope === "department" ? <Field label="Department"><select className={inputClass} value={form.department_id} onChange={(event) => onChange({ ...form, department_id: event.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field> : null}<Field label="Frequency"><Select value={form.frequency} values={frequencies} onChange={(value) => onChange({ ...form, frequency: value })} /></Field><Field label="Start Date"><input className={inputClass} type="date" value={form.start_date} onChange={(event) => onChange({ ...form, start_date: event.target.value })} /></Field><Field label="End Date"><input className={inputClass} type="date" value={form.end_date} onChange={(event) => onChange({ ...form, end_date: event.target.value })} /></Field><Field label="Anonymity Threshold"><input className={inputClass} min="3" type="number" value={form.anonymity_threshold} onChange={(event) => onChange({ ...form, anonymity_threshold: event.target.value })} /></Field></div><div className="grid gap-3 md:grid-cols-3"><Toggle checked={form.consent_required} label="Consent required" onChange={(value) => onChange({ ...form, consent_required: value })} /><Toggle checked={form.manager_aggregate_only} label="Manager aggregate only" onChange={(value) => onChange({ ...form, manager_aggregate_only: value })} /><Toggle checked={form.critical_alerts_enabled} label="HR critical alerts" onChange={(value) => onChange({ ...form, critical_alerts_enabled: value })} /></div><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function QuestionModal({ editing, form, onChange, onClose, onSubmit, open, surveys }: { editing: Question | null; form: ReturnType<typeof defaultQuestionForm>; onChange: (form: ReturnType<typeof defaultQuestionForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; surveys: Survey[] }) {
  return <HrmsModal open={open} onClose={onClose} title={editing ? "Edit Question" : "New Question"}><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Survey"><select className={inputClass} value={form.survey_id} onChange={(event) => onChange({ ...form, survey_id: event.target.value })}><option value="">Select survey</option>{surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}</select></Field><Field label="Type"><Select value={form.question_type} values={questionTypes} onChange={(value) => onChange({ ...form, question_type: value })} /></Field><Field label="Category"><Select value={form.category} values={categories} onChange={(value) => onChange({ ...form, category: value })} /></Field><Field label="Sort Order"><input className={inputClass} type="number" value={form.sort_order} onChange={(event) => onChange({ ...form, sort_order: event.target.value })} /></Field></div><Field label="Question"><textarea className={`${inputClass} min-h-24`} value={form.question_text} onChange={(event) => onChange({ ...form, question_text: event.target.value })} /></Field><Field label="Options"><input className={inputClass} value={form.options} onChange={(event) => onChange({ ...form, options: event.target.value })} /></Field><Toggle checked={form.is_required} label="Required question" onChange={(value) => onChange({ ...form, is_required: value })} /><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function ResponseModal({ form, onChange, onClose, onSubmit, open, question, questions, surveys, workers }: { form: ReturnType<typeof defaultResponseForm>; onChange: (form: ReturnType<typeof defaultResponseForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; question: Question | null; questions: Question[]; surveys: Survey[]; workers: Worker[] }) {
  return <HrmsModal open={open} onClose={onClose} title="Submit Pulse Response"><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Survey"><select className={inputClass} value={form.survey_id} onChange={(event) => onChange({ ...form, survey_id: event.target.value })}><option value="">Select survey</option>{surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}</select></Field><Field label="Question"><select className={inputClass} value={form.question_id} onChange={(event) => onChange({ ...form, question_id: event.target.value })}><option value="">Select question</option>{questions.map((item) => <option key={item.id} value={item.id}>{item.question_text}</option>)}</select></Field><Field label="Worker"><select className={inputClass} value={form.worker_profile_id} onChange={(event) => onChange({ ...form, worker_profile_id: event.target.value })}><option value="">No worker</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Date"><input className={inputClass} type="date" value={form.response_date} onChange={(event) => onChange({ ...form, response_date: event.target.value })} /></Field></div>{question?.question_type === "text" ? <Field label="Text Response"><textarea className={`${inputClass} min-h-24`} value={form.text_response} onChange={(event) => onChange({ ...form, text_response: event.target.value })} /></Field> : question?.question_type === "boolean" ? <Field label="Boolean Response"><Select allowEmpty emptyLabel="Select" value={form.boolean_response} values={["true", "false"]} onChange={(value) => onChange({ ...form, boolean_response: value })} /></Field> : question?.question_type === "option" ? <Field label="Option Response"><select className={inputClass} value={form.option_value} onChange={(event) => onChange({ ...form, option_value: event.target.value })}><option value="">Select option</option>{(question.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select></Field> : <Field label="Score"><input className={inputClass} max="5" min="0" step="0.1" type="number" value={form.score} onChange={(event) => onChange({ ...form, score: event.target.value })} /></Field>}<div className="grid gap-4 md:grid-cols-2"><Field label="Risk"><Select value={form.risk_level} values={riskLevels} onChange={(value) => onChange({ ...form, risk_level: value })} /></Field><div className="grid gap-3"><Toggle checked={form.consent_given} label="Consent given" onChange={(value) => onChange({ ...form, consent_given: value })} /><Toggle checked={form.is_anonymous} label="Anonymous response" onChange={(value) => onChange({ ...form, is_anonymous: value })} /><Toggle checked={form.critical_alert} label="Critical HR alert" onChange={(value) => onChange({ ...form, critical_alert: value })} /></div></div><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function ScoreModal({ form, onChange, onClose, onSubmit, open, surveys, workers }: { form: ReturnType<typeof defaultScoreForm>; onChange: (form: ReturnType<typeof defaultScoreForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; surveys: Survey[]; workers: Worker[] }) {
  return <HrmsModal open={open} onClose={onClose} title="Add Wellbeing Score"><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Worker"><select className={inputClass} value={form.worker_profile_id} onChange={(event) => onChange({ ...form, worker_profile_id: event.target.value })}><option value="">Select worker</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{workerName(worker)}</option>)}</select></Field><Field label="Score Date"><input className={inputClass} type="date" value={form.score_date} onChange={(event) => onChange({ ...form, score_date: event.target.value })} /></Field><Field label="Source Survey"><select className={inputClass} value={form.source_survey_id} onChange={(event) => onChange({ ...form, source_survey_id: event.target.value })}><option value="">No survey</option>{surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}</select></Field><Field label="Wellbeing Score"><input className={inputClass} max="100" min="0" step="0.1" type="number" value={form.wellbeing_score} onChange={(event) => onChange({ ...form, wellbeing_score: event.target.value })} /></Field><Field label="Mood Score"><input className={inputClass} max="5" min="0" step="0.1" type="number" value={form.mood_score} onChange={(event) => onChange({ ...form, mood_score: event.target.value })} /></Field><Field label="Stress Score"><input className={inputClass} max="5" min="0" step="0.1" type="number" value={form.stress_score} onChange={(event) => onChange({ ...form, stress_score: event.target.value })} /></Field><Field label="Workload Score"><input className={inputClass} max="5" min="0" step="0.1" type="number" value={form.workload_score} onChange={(event) => onChange({ ...form, workload_score: event.target.value })} /></Field><Field label="Risk"><Select value={form.risk_level} values={riskLevels} onChange={(value) => onChange({ ...form, risk_level: value })} /></Field></div><Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function AlertModal({ form, onChange, onClose, onSubmit, open }: { form: ReturnType<typeof defaultAlertForm>; onChange: (form: ReturnType<typeof defaultAlertForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Review Wellbeing Alert"><div className="space-y-5"><Field label="Status"><Select value={form.status} values={alertStatuses} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Resolution Note"><textarea className={`${inputClass} min-h-24`} value={form.resolution_note} onChange={(event) => onChange({ ...form, resolution_note: event.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-3xl font-black text-[#111827]">{title}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">{subtitle}</p></div>{action}</header>;
}

function DataTable({ children, headers }: { children: ReactNode; headers: string[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((header) => <th className="px-5 py-4" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{children}</tbody></table></div></section>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={colSpan}>{text}</td></tr>;
}

function Metric({ label: labelText, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><span className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{labelText}</span><strong className="mt-2 block text-2xl font-black text-[#111827]">{value}</strong></div>;
}

function Field({ children, label: labelText }: { children: ReactNode; label: string }) {
  return <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{labelText}</span>{children}</label>;
}

function Select({ allowEmpty, emptyLabel = "None", onChange, value, values }: { allowEmpty?: boolean; emptyLabel?: string; onChange: (value: string) => void; value: string; values: string[] }) {
  return <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{allowEmpty ? <option value="">{emptyLabel}</option> : null}{values.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>;
}

function Toggle({ checked, label: labelText, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#fbfcfb] px-4 py-3 text-sm font-black text-[#374151]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{labelText}</label>;
}

function ModalActions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function Badge({ text }: { text: string }) {
  return <span className="inline-flex rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{text}</span>;
}

function Alert({ text, tone }: { text: string; tone: "success" | "danger" }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-[#cfe7d8] bg-[#f0faf3] text-[#2f6b43]" : "border-[#f4c7c7] bg-[#fff5f5] text-[#b42318]"}`}>{text}</div>;
}

function Info({ text }: { text: string }) {
  return <span className="group relative inline-flex"><button aria-label="Wellbeing privacy info" className="h-11 w-11 rounded-xl border border-[#dbe0e5] text-sm font-black text-[#588368]" type="button">i</button><span className="pointer-events-none absolute right-0 top-12 z-20 hidden w-80 rounded-2xl border border-[#dbe0e5] bg-white p-4 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span></span>;
}

function report(setError: (value: string) => void, fallback: string) {
  return (err: unknown) => setError(err instanceof Error ? err.message : fallback);
}

function responseValue(row: PulseResponse) {
  if (typeof row.score === "number") return row.score.toFixed(1);
  if (row.text_response) return row.text_response;
  if (typeof row.boolean_response === "boolean") return row.boolean_response ? "Yes" : "No";
  return row.option_value || "-";
}

function valueOrDash(value?: number | null) {
  return typeof value === "number" ? value.toFixed(1) : "-";
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
