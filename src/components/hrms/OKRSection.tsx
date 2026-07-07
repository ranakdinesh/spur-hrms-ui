"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Cycle = { id: string; name: string; cycle_code: string; description?: string | null; start_date: string; end_date: string; status: string; review_cadence: string };
type Objective = { id: string; cycle_id: string; cycle_name?: string | null; parent_objective_id?: string | null; parent_objective_title?: string | null; owner_type: string; owner_worker_profile_id?: string | null; owner_department_id?: string | null; owner_project_id?: string | null; owner_worker_name?: string | null; owner_department_name?: string | null; owner_project_name?: string | null; title: string; description?: string | null; status: string; priority: string; progress_percent: number; weight: number; start_date?: string | null; due_date?: string | null; key_result_count: number; average_key_result_progress: number };
type KeyResult = { id: string; objective_id: string; objective_title?: string | null; cycle_name?: string | null; title: string; description?: string | null; metric_type: string; start_value: number; target_value: number; current_value: number; progress_percent: number; confidence: string; status: string; weight: number; unit_label?: string | null; due_date?: string | null; latest_checkin_date?: string | null; latest_note?: string | null };
type CheckIn = { id: string; key_result_id: string; key_result_title?: string | null; objective_id?: string | null; objective_title?: string | null; checkin_date: string; value: number; progress_percent: number; confidence: string; status: string; note?: string | null };
type Summary = { owner_type: string; objective_count: number; key_result_count: number; average_progress: number; at_risk_count: number; completed_count: number };
type Worker = { id: string; display_name?: string | null; worker_code?: string | null };
type Department = { id: string; name: string };
type Project = { id: string; name: string; project_code?: string | null };
type Tab = "cycles" | "objectives" | "key-results" | "check-ins";

const inputClass = "w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]";
const cycleStatuses = ["draft", "active", "closed", "archived"];
const reviewCadences = ["weekly", "biweekly", "monthly"];
const ownerTypes = ["company", "department", "project", "worker"];
const objectiveStatuses = ["draft", "active", "at_risk", "completed", "closed", "cancelled"];
const priorities = ["low", "normal", "high", "critical"];
const metricTypes = ["number", "percent", "currency", "boolean"];
const keyResultStatuses = ["not_started", "on_track", "at_risk", "behind", "completed", "closed", "cancelled"];
const confidences = ["low", "medium", "high"];

function defaultCycleForm() {
  return { name: "", cycle_code: "", description: "", start_date: "", end_date: "", status: "draft", review_cadence: "weekly" };
}

function defaultObjectiveForm() {
  return { cycle_id: "", parent_objective_id: "", owner_type: "company", owner_worker_profile_id: "", owner_department_id: "", owner_project_id: "", title: "", description: "", status: "draft", priority: "normal", progress_percent: "", weight: "1", start_date: "", due_date: "" };
}

function defaultKeyResultForm() {
  return { objective_id: "", title: "", description: "", metric_type: "number", start_value: "0", target_value: "100", current_value: "0", progress_percent: "", confidence: "medium", status: "not_started", weight: "1", unit_label: "", due_date: "" };
}

export function OKRSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="OKR Performance" subtitle="Open a tenant to manage cycles, objectives, key results, and check-ins." />
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

  return <OKRWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function OKRWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("cycles");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycleFilter, setCycleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cycleModal, setCycleModal] = useState(false);
  const [objectiveModal, setObjectiveModal] = useState(false);
  const [keyResultModal, setKeyResultModal] = useState(false);
  const [checkInModal, setCheckInModal] = useState<KeyResult | null>(null);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [editingKeyResult, setEditingKeyResult] = useState<KeyResult | null>(null);
  const [cycleForm, setCycleForm] = useState(defaultCycleForm());
  const [objectiveForm, setObjectiveForm] = useState(defaultObjectiveForm());
  const [keyResultForm, setKeyResultForm] = useState(defaultKeyResultForm());
  const [checkInForm, setCheckInForm] = useState({ checkin_date: dateOnly(new Date().toISOString()), value: "", progress_percent: "", confidence: "medium", status: "on_track", note: "" });

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const cycleSuffix = params.toString() ? `?${params}` : "";
    const objectiveParams = new URLSearchParams();
    if (cycleFilter) objectiveParams.set("cycle_id", cycleFilter);
    if (search.trim()) objectiveParams.set("search", search.trim());
    const objectiveSuffix = objectiveParams.toString() ? `?${objectiveParams}` : "";
    const summarySuffix = cycleFilter ? `?cycle_id=${encodeURIComponent(cycleFilter)}` : "";
    const [cycleRows, objectiveRows, keyResultRows, checkInRows, summaryRows, workerRows, departmentRows, projectRows] = await Promise.all([
      apiRequest<Cycle[]>(`${basePath}/okr-cycles${cycleSuffix}`).catch(() => []),
      apiRequest<Objective[]>(`${basePath}/objectives${objectiveSuffix}`).catch(() => []),
      apiRequest<KeyResult[]>(`${basePath}/key-results`).catch(() => []),
      apiRequest<CheckIn[]>(`${basePath}/key-result-checkins`).catch(() => []),
      apiRequest<Summary[]>(`${basePath}/okr-summary${summarySuffix}`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<Department[]>(`${basePath}/departments`).catch(() => []),
      apiRequest<Project[]>(`${basePath}/projects`).catch(() => []),
    ]);
    setCycles(cycleRows);
    setObjectives(objectiveRows);
    setKeyResults(keyResultRows);
    setCheckIns(checkInRows);
    setSummary(summaryRows);
    setWorkers(workerRows);
    setDepartments(departmentRows);
    setProjects(projectRows);
    setCycleFilter((current) => current || cycleRows.find((row) => row.status === "active")?.id || cycleRows[0]?.id || "");
  }, [basePath, cycleFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load OKRs."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const objectiveCount = summary.reduce((sum, row) => sum + row.objective_count, 0);
    const keyResultCount = summary.reduce((sum, row) => sum + row.key_result_count, 0);
    const atRisk = summary.reduce((sum, row) => sum + row.at_risk_count, 0);
    const completed = summary.reduce((sum, row) => sum + row.completed_count, 0);
    const avg = summary.length ? Math.round(summary.reduce((sum, row) => sum + row.average_progress, 0) / summary.length) : 0;
    return { cycles: cycles.length, objectiveCount, keyResultCount, atRisk, completed, avg };
  }, [cycles.length, summary]);

  function openCycle(item?: Cycle) {
    setEditingCycle(item || null);
    setCycleForm(item ? { name: item.name, cycle_code: item.cycle_code, description: item.description || "", start_date: dateOnly(item.start_date), end_date: dateOnly(item.end_date), status: item.status, review_cadence: item.review_cadence } : defaultCycleForm());
    setCycleModal(true);
  }

  function openObjective(item?: Objective) {
    setEditingObjective(item || null);
    setObjectiveForm(item ? { cycle_id: item.cycle_id, parent_objective_id: item.parent_objective_id || "", owner_type: item.owner_type, owner_worker_profile_id: item.owner_worker_profile_id || "", owner_department_id: item.owner_department_id || "", owner_project_id: item.owner_project_id || "", title: item.title, description: item.description || "", status: item.status, priority: item.priority, progress_percent: String(item.progress_percent ?? 0), weight: String(item.weight || 1), start_date: dateOnly(item.start_date), due_date: dateOnly(item.due_date) } : { ...defaultObjectiveForm(), cycle_id: cycleFilter || cycles[0]?.id || "" });
    setObjectiveModal(true);
  }

  function openKeyResult(item?: KeyResult) {
    setEditingKeyResult(item || null);
    setKeyResultForm(item ? { objective_id: item.objective_id, title: item.title, description: item.description || "", metric_type: item.metric_type, start_value: String(item.start_value ?? 0), target_value: String(item.target_value ?? 100), current_value: String(item.current_value ?? 0), progress_percent: String(item.progress_percent ?? 0), confidence: item.confidence, status: item.status, weight: String(item.weight || 1), unit_label: item.unit_label || "", due_date: dateOnly(item.due_date) } : { ...defaultKeyResultForm(), objective_id: objectives[0]?.id || "" });
    setKeyResultModal(true);
  }

  async function submitCycle() {
    const payload = { ...cycleForm, description: cycleForm.description || null, metadata: {} };
    const path = editingCycle ? `${basePath}/okr-cycles/${editingCycle.id}` : `${basePath}/okr-cycles`;
    await apiRequest(path, { method: editingCycle ? "PUT" : "POST", body: JSON.stringify(payload) });
    setNotice(editingCycle ? "Cycle updated." : "Cycle created.");
    setCycleModal(false);
    await load();
  }

  async function cycleStatus(item: Cycle, status: string) {
    await apiRequest(`${basePath}/okr-cycles/${item.id}/status`, { method: "POST", body: JSON.stringify({ status }) });
    setNotice(`Cycle marked ${label(status)}.`);
    await load();
  }

  async function submitObjective() {
    const payload = { ...objectiveForm, parent_objective_id: objectiveForm.parent_objective_id || null, owner_worker_profile_id: objectiveForm.owner_type === "worker" ? objectiveForm.owner_worker_profile_id || null : null, owner_department_id: objectiveForm.owner_type === "department" ? objectiveForm.owner_department_id || null : null, owner_project_id: objectiveForm.owner_type === "project" ? objectiveForm.owner_project_id || null : null, description: objectiveForm.description || null, progress_percent: objectiveForm.progress_percent === "" ? null : Number(objectiveForm.progress_percent), weight: objectiveForm.weight === "" ? null : Number(objectiveForm.weight), metadata: {} };
    const path = editingObjective ? `${basePath}/objectives/${editingObjective.id}` : `${basePath}/objectives`;
    await apiRequest(path, { method: editingObjective ? "PUT" : "POST", body: JSON.stringify(payload) });
    setNotice(editingObjective ? "Objective updated." : "Objective created.");
    setObjectiveModal(false);
    await load();
  }

  async function submitKeyResult() {
    const payload = { ...keyResultForm, description: keyResultForm.description || null, start_value: Number(keyResultForm.start_value || 0), target_value: Number(keyResultForm.target_value || 0), current_value: Number(keyResultForm.current_value || 0), progress_percent: keyResultForm.progress_percent === "" ? null : Number(keyResultForm.progress_percent), weight: keyResultForm.weight === "" ? null : Number(keyResultForm.weight), unit_label: keyResultForm.unit_label || null, metadata: {} };
    const path = editingKeyResult ? `${basePath}/key-results/${editingKeyResult.id}` : `${basePath}/key-results`;
    await apiRequest(path, { method: editingKeyResult ? "PUT" : "POST", body: JSON.stringify(payload) });
    setNotice(editingKeyResult ? "Key result updated." : "Key result created.");
    setKeyResultModal(false);
    await load();
  }

  async function submitCheckIn() {
    if (!checkInModal) return;
    const payload = { key_result_id: checkInModal.id, checkin_date: checkInForm.checkin_date, value: Number(checkInForm.value || 0), progress_percent: checkInForm.progress_percent === "" ? null : Number(checkInForm.progress_percent), confidence: checkInForm.confidence, status: checkInForm.status, note: checkInForm.note || null, metadata: {} };
    await apiRequest(`${basePath}/key-result-checkins`, { method: "POST", body: JSON.stringify(payload) });
    setNotice("Check-in recorded.");
    setCheckInModal(null);
    await load();
  }

  async function remove(path: string, labelText: string) {
    if (!window.confirm(`Deactivate ${labelText}?`)) return;
    await apiRequest(path, { method: "DELETE" });
    setNotice("Record deactivated.");
    await load();
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title="OKR Performance" subtitle={tenant ? tenant.name : "Cycles, objectives, measurable key results, and continuous progress check-ins."} action={<div className="flex gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}<button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openCycle()} type="button">New Cycle</button></div>} />
      {notice ? <Alert tone="success" text={notice} /> : null}
      {error ? <Alert tone="danger" text={error} /> : null}
      <section className="grid gap-4 md:grid-cols-6"><Metric label="Cycles" value={String(metrics.cycles)} /><Metric label="Objectives" value={String(metrics.objectiveCount)} /><Metric label="Key Results" value={String(metrics.keyResultCount)} /><Metric label="Average" value={`${metrics.avg}%`} /><Metric label="At Risk" value={String(metrics.atRisk)} /><Metric label="Completed" value={String(metrics.completed)} /></section>
      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]"><select className={inputClass} value={cycleFilter} onChange={(event) => setCycleFilter(event.target.value)}><option value="">All cycles</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select><input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cycles or objectives" /><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={() => openObjective()} type="button">New Objective</button><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={() => openKeyResult()} type="button">New Key Result</button></div></section>
      <section className="flex flex-wrap gap-2">{(["cycles", "objectives", "key-results", "check-ins"] as Tab[]).map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</section>
      {tab === "cycles" ? <CyclesTable onDelete={(row) => remove(`${basePath}/okr-cycles/${row.id}`, row.name)} onEdit={openCycle} onStatus={cycleStatus} rows={cycles} /> : null}
      {tab === "objectives" ? <ObjectivesTable onDelete={(row) => remove(`${basePath}/objectives/${row.id}`, row.title)} onEdit={openObjective} rows={objectives} /> : null}
      {tab === "key-results" ? <KeyResultsTable onCheckIn={(row) => { setCheckInModal(row); setCheckInForm({ checkin_date: dateOnly(new Date().toISOString()), value: String(row.current_value ?? ""), progress_percent: String(row.progress_percent ?? ""), confidence: row.confidence, status: row.status === "not_started" ? "on_track" : row.status, note: "" }); }} onDelete={(row) => remove(`${basePath}/key-results/${row.id}`, row.title)} onEdit={openKeyResult} rows={keyResults} /> : null}
      {tab === "check-ins" ? <CheckInsTable rows={checkIns} /> : null}
      <CycleModal form={cycleForm} editing={editingCycle} onChange={setCycleForm} onClose={() => setCycleModal(false)} onSubmit={() => void submitCycle().catch((err) => setError(err instanceof Error ? err.message : "Unable to save cycle."))} open={cycleModal} />
      <ObjectiveModal cycles={cycles} departments={departments} editing={editingObjective} form={objectiveForm} objectives={objectives} onChange={setObjectiveForm} onClose={() => setObjectiveModal(false)} onSubmit={() => void submitObjective().catch((err) => setError(err instanceof Error ? err.message : "Unable to save objective."))} open={objectiveModal} projects={projects} workers={workers} />
      <KeyResultModal editing={editingKeyResult} form={keyResultForm} objectives={objectives} onChange={setKeyResultForm} onClose={() => setKeyResultModal(false)} onSubmit={() => void submitKeyResult().catch((err) => setError(err instanceof Error ? err.message : "Unable to save key result."))} open={keyResultModal} />
      <HrmsModal open={Boolean(checkInModal)} onClose={() => setCheckInModal(null)} title="Key Result Check-In">
        <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Date"><input className={inputClass} type="date" value={checkInForm.checkin_date} onChange={(event) => setCheckInForm({ ...checkInForm, checkin_date: event.target.value })} /></Field><Field label="Current Value"><input className={inputClass} type="number" value={checkInForm.value} onChange={(event) => setCheckInForm({ ...checkInForm, value: event.target.value })} /></Field><Field label="Progress %"><input className={inputClass} max="100" min="0" type="number" value={checkInForm.progress_percent} onChange={(event) => setCheckInForm({ ...checkInForm, progress_percent: event.target.value })} /></Field><Field label="Confidence"><Select value={checkInForm.confidence} values={confidences} onChange={(value) => setCheckInForm({ ...checkInForm, confidence: value })} /></Field><Field label="Status"><Select value={checkInForm.status} values={keyResultStatuses} onChange={(value) => setCheckInForm({ ...checkInForm, status: value })} /></Field></div><Field label="Note"><textarea className={`${inputClass} min-h-24`} value={checkInForm.note} onChange={(event) => setCheckInForm({ ...checkInForm, note: event.target.value })} /></Field><ModalActions onCancel={() => setCheckInModal(null)} onSubmit={() => void submitCheckIn().catch((err) => setError(err instanceof Error ? err.message : "Unable to save check-in."))} /></div>
      </HrmsModal>
    </main>
  );
}

function CycleModal({ editing, form, onChange, onClose, onSubmit, open }: { editing: Cycle | null; form: ReturnType<typeof defaultCycleForm>; onChange: (form: ReturnType<typeof defaultCycleForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title={editing ? "Edit OKR Cycle" : "New OKR Cycle"}><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field><Field label="Code"><input className={inputClass} value={form.cycle_code} onChange={(e) => onChange({ ...form, cycle_code: e.target.value })} /></Field><Field label="Start Date"><input className={inputClass} type="date" value={form.start_date} onChange={(e) => onChange({ ...form, start_date: e.target.value })} /></Field><Field label="End Date"><input className={inputClass} type="date" value={form.end_date} onChange={(e) => onChange({ ...form, end_date: e.target.value })} /></Field><Field label="Status"><Select value={form.status} values={cycleStatuses} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Cadence"><Select value={form.review_cadence} values={reviewCadences} onChange={(value) => onChange({ ...form, review_cadence: value })} /></Field></div><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function ObjectiveModal({ cycles, departments, editing, form, objectives, onChange, onClose, onSubmit, open, projects, workers }: { cycles: Cycle[]; departments: Department[]; editing: Objective | null; form: ReturnType<typeof defaultObjectiveForm>; objectives: Objective[]; onChange: (form: ReturnType<typeof defaultObjectiveForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean; projects: Project[]; workers: Worker[] }) {
  return <HrmsModal open={open} onClose={onClose} title={editing ? "Edit Objective" : "New Objective"}><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Cycle"><select className={inputClass} value={form.cycle_id} onChange={(e) => onChange({ ...form, cycle_id: e.target.value })}>{cycles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field label="Parent"><select className={inputClass} value={form.parent_objective_id} onChange={(e) => onChange({ ...form, parent_objective_id: e.target.value })}><option value="">No parent</option>{objectives.filter((row) => row.id !== editing?.id).map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></Field><Field label="Owner Type"><Select value={form.owner_type} values={ownerTypes} onChange={(value) => onChange({ ...form, owner_type: value, owner_worker_profile_id: "", owner_department_id: "", owner_project_id: "" })} /></Field>{form.owner_type === "worker" ? <Field label="Worker"><select className={inputClass} value={form.owner_worker_profile_id} onChange={(e) => onChange({ ...form, owner_worker_profile_id: e.target.value })}>{workers.map((row) => <option key={row.id} value={row.id}>{row.display_name || row.worker_code || row.id}</option>)}</select></Field> : null}{form.owner_type === "department" ? <Field label="Department"><select className={inputClass} value={form.owner_department_id} onChange={(e) => onChange({ ...form, owner_department_id: e.target.value })}>{departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field> : null}{form.owner_type === "project" ? <Field label="Project"><select className={inputClass} value={form.owner_project_id} onChange={(e) => onChange({ ...form, owner_project_id: e.target.value })}>{projects.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field> : null}<Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} /></Field><Field label="Status"><Select value={form.status} values={objectiveStatuses} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Priority"><Select value={form.priority} values={priorities} onChange={(value) => onChange({ ...form, priority: value })} /></Field><Field label="Weight"><input className={inputClass} min="0.1" step="0.1" type="number" value={form.weight} onChange={(e) => onChange({ ...form, weight: e.target.value })} /></Field><Field label="Start Date"><input className={inputClass} type="date" value={form.start_date} onChange={(e) => onChange({ ...form, start_date: e.target.value })} /></Field><Field label="Due Date"><input className={inputClass} type="date" value={form.due_date} onChange={(e) => onChange({ ...form, due_date: e.target.value })} /></Field></div><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function KeyResultModal({ editing, form, objectives, onChange, onClose, onSubmit, open }: { editing: KeyResult | null; form: ReturnType<typeof defaultKeyResultForm>; objectives: Objective[]; onChange: (form: ReturnType<typeof defaultKeyResultForm>) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title={editing ? "Edit Key Result" : "New Key Result"}><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Objective"><select className={inputClass} value={form.objective_id} onChange={(e) => onChange({ ...form, objective_id: e.target.value })}>{objectives.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></Field><Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} /></Field><Field label="Metric Type"><Select value={form.metric_type} values={metricTypes} onChange={(value) => onChange({ ...form, metric_type: value })} /></Field><Field label="Unit"><input className={inputClass} value={form.unit_label} onChange={(e) => onChange({ ...form, unit_label: e.target.value })} /></Field><Field label="Start Value"><input className={inputClass} type="number" value={form.start_value} onChange={(e) => onChange({ ...form, start_value: e.target.value })} /></Field><Field label="Target Value"><input className={inputClass} type="number" value={form.target_value} onChange={(e) => onChange({ ...form, target_value: e.target.value })} /></Field><Field label="Current Value"><input className={inputClass} type="number" value={form.current_value} onChange={(e) => onChange({ ...form, current_value: e.target.value })} /></Field><Field label="Progress %"><input className={inputClass} max="100" min="0" type="number" value={form.progress_percent} onChange={(e) => onChange({ ...form, progress_percent: e.target.value })} /></Field><Field label="Confidence"><Select value={form.confidence} values={confidences} onChange={(value) => onChange({ ...form, confidence: value })} /></Field><Field label="Status"><Select value={form.status} values={keyResultStatuses} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Weight"><input className={inputClass} min="0.1" step="0.1" type="number" value={form.weight} onChange={(e) => onChange({ ...form, weight: e.target.value })} /></Field><Field label="Due Date"><input className={inputClass} type="date" value={form.due_date} onChange={(e) => onChange({ ...form, due_date: e.target.value })} /></Field></div><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function CyclesTable({ onDelete, onEdit, onStatus, rows }: { onDelete: (row: Cycle) => void; onEdit: (row: Cycle) => void; onStatus: (row: Cycle, status: string) => void; rows: Cycle[] }) {
  return <Table empty="No OKR cycles yet." headers={["Cycle", "Dates", "Status", "Cadence", "Actions"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><Cell title={row.name} sub={row.cycle_code} /><td className="px-5 py-4 text-sm font-bold">{dateOnly(row.start_date)} to {dateOnly(row.end_date)}</td><td className="px-5 py-4"><Pill value={row.status} /></td><td className="px-5 py-4 text-sm font-bold">{label(row.review_cadence)}</td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onStatus(row, row.status === "active" ? "closed" : "active")} type="button">{row.status === "active" ? "Close" : "Activate"}</button><button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button><button className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => onDelete(row)} type="button">Delete</button></td></tr>)}</Table>;
}

function ObjectivesTable({ onDelete, onEdit, rows }: { onDelete: (row: Objective) => void; onEdit: (row: Objective) => void; rows: Objective[] }) {
  return <Table empty="No objectives yet." headers={["Objective", "Owner", "Progress", "Status", "KRs", "Actions"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><Cell title={row.title} sub={row.cycle_name || row.parent_objective_title || ""} /><Cell title={ownerLabel(row)} sub={label(row.owner_type)} /><td className="px-5 py-4 font-black">{Math.round(row.progress_percent)}%</td><td className="px-5 py-4"><Pill value={row.status} /></td><td className="px-5 py-4 text-sm font-bold">{row.key_result_count}</td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button><button className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => onDelete(row)} type="button">Delete</button></td></tr>)}</Table>;
}

function KeyResultsTable({ onCheckIn, onDelete, onEdit, rows }: { onCheckIn: (row: KeyResult) => void; onDelete: (row: KeyResult) => void; onEdit: (row: KeyResult) => void; rows: KeyResult[] }) {
  return <Table empty="No key results yet." headers={["Key Result", "Objective", "Progress", "Confidence", "Status", "Actions"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><Cell title={row.title} sub={row.latest_note || row.cycle_name || ""} /><Cell title={row.objective_title || row.objective_id} /><td className="px-5 py-4 text-sm font-bold">{row.current_value}/{row.target_value} · {Math.round(row.progress_percent)}%</td><td className="px-5 py-4"><Pill value={row.confidence} /></td><td className="px-5 py-4"><Pill value={row.status} /></td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white" onClick={() => onCheckIn(row)} type="button">Check In</button><button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button><button className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => onDelete(row)} type="button">Delete</button></td></tr>)}</Table>;
}

function CheckInsTable({ rows }: { rows: CheckIn[] }) {
  return <Table empty="No check-ins yet." headers={["Date", "Key Result", "Objective", "Value", "Confidence", "Status", "Note"]}>{rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4 text-sm font-bold">{dateOnly(row.checkin_date)}</td><Cell title={row.key_result_title || row.key_result_id} /><Cell title={row.objective_title || row.objective_id || "-"} /><td className="px-5 py-4 text-sm font-bold">{row.value} · {Math.round(row.progress_percent)}%</td><td className="px-5 py-4"><Pill value={row.confidence} /></td><td className="px-5 py-4"><Pill value={row.status} /></td><td className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{row.note || "-"}</td></tr>)}</Table>;
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

function Field({ children, label: fieldLabel }: { children: ReactNode; label: string }) {
  return <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}<button className="grid size-5 place-items-center rounded-full border border-[#dbe0e5] text-[11px]" title={`Configure ${fieldLabel.toLowerCase()}`} type="button">i</button></span>{children}</label>;
}

function Select({ onChange, value, values }: { onChange: (value: string) => void; value: string; values: string[] }) {
  return <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>;
}

function ModalActions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function Table({ children, empty, headers }: { children: ReactNode; empty: string; headers: string[] }) {
  const rows = Array.isArray(children) ? children : [children];
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><table className="w-full min-w-[920px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((item) => <th className="px-5 py-4" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.length && rows.some(Boolean) ? children : <tr><td className="px-5 py-10 text-center text-sm font-bold text-[#6b7280]" colSpan={headers.length}>{empty}</td></tr>}</tbody></table></section>;
}

function Cell({ sub, title }: { sub?: string; title: string }) {
  return <td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{title}</strong>{sub ? <span className="mt-1 block text-xs font-bold text-[#6b7280]">{sub}</span> : null}</td>;
}

function Pill({ value }: { value: string }) {
  const tone = value === "at_risk" || value === "behind" || value === "critical" || value === "low" ? "bg-[#fee2e2] text-[#b91c1c]" : value === "active" || value === "on_track" || value === "completed" || value === "high" ? "bg-[#e7f6ed] text-[#237a45]" : value === "medium" || value === "draft" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone}`}>{label(value)}</span>;
}

function ownerLabel(row: Objective) {
  return row.owner_worker_name || row.owner_department_name || row.owner_project_name || "Company";
}

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}
