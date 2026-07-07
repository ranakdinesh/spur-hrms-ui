"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type SummaryRow = { metric: string; metric_count: number };
type Template = { id: string; code: string; name: string; start_time: string; end_time: string; break_minutes: number; work_mode: string; location_type: string; attendance_policy_id?: string; attendance_location_id?: string; is_active: boolean };
type Assignment = { id: string; schedule_date: string; worker_profile_id?: string; employee_user_id?: string; shift_template_id?: string; attendance_location_id?: string; start_time: string; end_time: string; work_mode: string; location_type: string; status: string; has_conflict: boolean; conflict_reason?: string; payroll_blocking: boolean; notes?: string };
type Requirement = { id: string; name: string; requirement_date?: string; start_date?: string; end_date?: string; attendance_location_id?: string; shift_template_id?: string; required_count: number; priority: string; status: string; payroll_blocking: boolean };
type SwapRequest = { id: string; requester_assignment_id: string; requester_user_id?: string; target_user_id?: string; status: string; reason?: string; payroll_blocking: boolean; created_at: string };
type StaffingGap = { requirement_id: string; requirement_name: string; required_count: number; assigned_count: number; gap_count: number; priority: string; payroll_blocking: boolean };
type AttendanceLocation = { id: string; name: string; location_type: string };

type ModalKey = "" | "template" | "requirement" | "assignment" | "status" | "swap" | "review";
type TabKey = "roster" | "templates" | "requirements" | "swaps" | "gaps";

const inputClass = "h-11 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#111827] outline-none focus:border-[#588368]";
const emptyTemplate = { code: "", name: "", start_time: "09:00", end_time: "18:00", break_minutes: "60", paid_minutes: "480", work_mode: "office", location_type: "office", attendance_location_id: "", attendance_policy_id: "", allow_overtime: false, is_active: true };
const emptyRequirement = { name: "", requirement_date: "", start_date: "", end_date: "", attendance_location_id: "", shift_template_id: "", required_count: "1", min_count: "0", max_count: "", priority: "medium", status: "active", payroll_blocking: false };
const emptyAssignment = { schedule_date: todayKey(), worker_profile_id: "", employee_user_id: "", shift_template_id: "", attendance_location_id: "", start_time: "", end_time: "", break_minutes: "60", work_mode: "office", location_type: "office", status: "draft", source: "manual", overtime_planned_minutes: "0", notes: "" };
const emptySwap = { requester_assignment_id: "", target_user_id: "", requested_date: "", requested_shift_template_id: "", reason: "" };

export function ShiftSchedulingSection({ isSuperAdmin, tenants, tenantsError, tenantsLoading }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => `${a.name} ${a.code}`.localeCompare(`${b.name} ${b.code}`)), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [tab, setTab] = useState<TabKey>("roster");
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(todayKey());
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [gaps, setGaps] = useState<StaffingGap[]>([]);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [modal, setModal] = useState<ModalKey>("");
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [requirementForm, setRequirementForm] = useState(emptyRequirement);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignment);
  const [swapForm, setSwapForm] = useState(emptySwap);
  const [statusForm, setStatusForm] = useState({ id: "", status: "published", remarks: "" });
  const [reviewForm, setReviewForm] = useState({ id: "", status: "approved", remarks: "" });
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const metric = useCallback((key: string) => summary.find((row) => row.metric === key)?.metric_count || 0, [summary]);

  const loadData = useCallback(async () => {
    if (!canLoad) return;
    const range = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    const assignmentQuery = new URLSearchParams({ start_date: startDate, end_date: endDate, limit: "200" });
    if (status) assignmentQuery.set("status", status);
    setLoading(true);
    setError("");
    try {
      const [summaryRows, templateRows, assignmentRows, requirementRows, swapRows, gapRows, locationRows] = await Promise.all([
        apiRequest<SummaryRow[]>(`${basePath}/shift-schedule-summary?${range}`),
        apiRequest<Template[]>(`${basePath}/shift-templates?limit=200`),
        apiRequest<Assignment[]>(`${basePath}/shift-assignments?${assignmentQuery.toString()}`),
        apiRequest<Requirement[]>(`${basePath}/staffing-requirements?limit=200`),
        apiRequest<SwapRequest[]>(`${basePath}/shift-swap-requests?limit=100`),
        apiRequest<StaffingGap[]>(`${basePath}/shift-staffing-gaps?${range}`),
        apiRequest<AttendanceLocation[]>(`${basePath}/attendance-locations`),
      ]);
      setSummary(Array.isArray(summaryRows) ? summaryRows : []);
      setTemplates(Array.isArray(templateRows) ? templateRows : []);
      setAssignments(Array.isArray(assignmentRows) ? assignmentRows : []);
      setRequirements(Array.isArray(requirementRows) ? requirementRows : []);
      setSwaps(Array.isArray(swapRows) ? swapRows : []);
      setGaps(Array.isArray(gapRows) ? gapRows : []);
      setLocations(Array.isArray(locationRows) ? locationRows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load shift scheduling.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, endDate, startDate, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function saveTemplate() {
    await apiRequest(`${basePath}/shift-templates`, { method: "POST", body: numberPayload(templateForm, ["break_minutes", "paid_minutes"]) });
    setTemplateForm(emptyTemplate);
    setModal("");
    await loadData();
  }

  async function saveRequirement() {
    await apiRequest(`${basePath}/staffing-requirements`, { method: "POST", body: numberPayload(requirementForm, ["required_count", "min_count", "max_count"]) });
    setRequirementForm(emptyRequirement);
    setModal("");
    await loadData();
  }

  async function saveAssignment() {
    await apiRequest(`${basePath}/shift-assignments`, { method: "POST", body: numberPayload(assignmentForm, ["break_minutes", "overtime_planned_minutes"]) });
    setAssignmentForm(emptyAssignment);
    setModal("");
    await loadData();
  }

  async function updateStatus() {
    await apiRequest(`${basePath}/shift-assignments/${statusForm.id}/status`, { method: "POST", body: { status: statusForm.status, remarks: statusForm.remarks || undefined } });
    setModal("");
    await loadData();
  }

  async function saveSwap() {
    await apiRequest(`${basePath}/shift-swap-requests`, { method: "POST", body: cleanPayload(swapForm) });
    setSwapForm(emptySwap);
    setModal("");
    await loadData();
  }

  async function reviewSwap() {
    await apiRequest(`${basePath}/shift-swap-requests/${reviewForm.id}/review`, { method: "POST", body: { status: reviewForm.status, remarks: reviewForm.remarks || undefined } });
    setModal("");
    await loadData();
  }

  if (isSuperAdmin && !selectedTenantID) {
    return <main className="space-y-5 p-6 lg:p-10"><Header showInfo={showInfo} setShowInfo={setShowInfo} onRefresh={loadData} onNew={() => setModal("assignment")} /><TenantPicker disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /></main>;
  }

  return (
    <main className="space-y-5 p-6 lg:p-10">
      <Header showInfo={showInfo} setShowInfo={setShowInfo} onRefresh={loadData} onNew={() => setModal("assignment")} />
      {isSuperAdmin ? <TenantPicker compact disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Scheduled" value={metric("assignments_total")} />
        <Metric label="Conflicts" value={metric("assignments_conflict")} tone="warn" />
        <Metric label="Payroll blockers" value={metric("payroll_blockers")} tone="danger" />
        <Metric label="Staffing gap" value={metric("staffing_gap_people")} tone="info" />
      </section>
      <section className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto]">
          <input className={inputClass} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <input className={inputClass} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All status</option>{["draft", "published", "locked", "cancelled", "completed"].map((item) => <option key={item} value={item}>{title(item)}</option>)}</select>
          <button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">{loading ? "Loading" : "Refresh"}</button>
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-[#dfe6e2] bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-[#edf1ef] p-3">{(["roster", "templates", "requirements", "swaps", "gaps"] as TabKey[]).map((item) => <button className={`rounded-lg px-4 py-2 text-sm font-black ${tab === item ? "bg-[#111827] text-white" : "text-[#374151] hover:bg-[#f8faf9]"}`} key={item} onClick={() => setTab(item)} type="button">{title(item)}</button>)}</div>
        <div className="p-4">{tab === "roster" ? <Roster assignments={assignments} locationName={locationName(locations)} templateName={templateName(templates)} onStatus={(assignment) => { setStatusForm({ id: assignment.id, status: assignment.status === "draft" ? "published" : "locked", remarks: "" }); setModal("status"); }} onSwap={(assignment) => { setSwapForm({ ...emptySwap, requester_assignment_id: assignment.id }); setModal("swap"); }} /> : null}{tab === "templates" ? <Templates items={templates} onNew={() => setModal("template")} /> : null}{tab === "requirements" ? <Requirements items={requirements} onNew={() => setModal("requirement")} templateName={templateName(templates)} /> : null}{tab === "swaps" ? <Swaps items={swaps} onReview={(swap) => { setReviewForm({ id: swap.id, status: "approved", remarks: "" }); setModal("review"); }} /> : null}{tab === "gaps" ? <Gaps items={gaps} /> : null}</div>
      </section>
      <HrmsModal open={modal === "template"} onClose={() => setModal("")} title="Shift Template"><TemplateForm form={templateForm} locations={locations} onCancel={() => setModal("")} onChange={setTemplateForm} onSubmit={saveTemplate} /></HrmsModal>
      <HrmsModal open={modal === "requirement"} onClose={() => setModal("")} title="Staffing Requirement"><RequirementForm form={requirementForm} locations={locations} templates={templates} onCancel={() => setModal("")} onChange={setRequirementForm} onSubmit={saveRequirement} /></HrmsModal>
      <HrmsModal open={modal === "assignment"} onClose={() => setModal("")} title="Assign Shift"><AssignmentForm form={assignmentForm} locations={locations} templates={templates} onCancel={() => setModal("")} onChange={setAssignmentForm} onSubmit={saveAssignment} /></HrmsModal>
      <HrmsModal open={modal === "status"} onClose={() => setModal("")} title="Update Shift Status"><StatusForm form={statusForm} onCancel={() => setModal("")} onChange={setStatusForm} onSubmit={updateStatus} /></HrmsModal>
      <HrmsModal open={modal === "swap"} onClose={() => setModal("")} title="Request Shift Swap"><SwapForm form={swapForm} templates={templates} onCancel={() => setModal("")} onChange={setSwapForm} onSubmit={saveSwap} /></HrmsModal>
      <HrmsModal open={modal === "review"} onClose={() => setModal("")} title="Review Shift Swap"><ReviewForm form={reviewForm} onCancel={() => setModal("")} onChange={setReviewForm} onSubmit={reviewSwap} /></HrmsModal>
    </main>
  );
}

function Header({ onNew, onRefresh, showInfo, setShowInfo }: { onNew: () => void; onRefresh: () => void; showInfo: boolean; setShowInfo: (value: boolean) => void }) {
  return <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Time / Workforce Scheduling</p><button className="grid size-7 place-items-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" onClick={() => setShowInfo(!showInfo)} type="button">i</button></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">Shift Planning</h1>{showInfo ? <p className="mt-2 max-w-3xl rounded-lg border border-[#dfe6e2] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#6b7280]">Use templates for repeatable shifts, publish assignments after conflict review, lock finalized rosters before payroll, and keep swaps auditable.</p> : null}</div><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151]" onClick={onRefresh} type="button">Refresh</button><button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={onNew} type="button">Assign Shift</button></div></header>;
}

function TenantPicker({ compact, disabled, error, onChange, tenants, value }: { compact?: boolean; disabled?: boolean; error: string; onChange: (value: string) => void; tenants: BranchTenantOption[]; value: string }) {
  return <section className={`rounded-lg border border-[#dfe6e2] bg-white ${compact ? "p-3" : "p-5"}`}><select className={inputClass + " w-full"} disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}</select>{error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}</section>;
}

function Roster({ assignments, locationName, onStatus, onSwap, templateName }: { assignments: Assignment[]; locationName: (id?: string) => string; onStatus: (item: Assignment) => void; onSwap: (item: Assignment) => void; templateName: (id?: string) => string }) {
  if (!assignments.length) return <Empty text="No assignments for this range." />;
  return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#f8faf9] text-xs uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Shift</th><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Flags</th><th className="px-4 py-3"></th></tr></thead><tbody>{assignments.map((item) => <tr className="border-t border-[#edf1ef]" key={item.id}><td className="px-4 py-3 font-bold">{dateOnly(item.schedule_date)}</td><td className="px-4 py-3">{templateName(item.shift_template_id)}<br /><span className="text-xs font-bold text-[#6b7280]">{item.start_time} - {item.end_time}</span></td><td className="px-4 py-3">{item.employee_user_id || item.worker_profile_id || "-"}</td><td className="px-4 py-3">{locationName(item.attendance_location_id)}</td><td className="px-4 py-3"><Badge text={title(item.status)} /></td><td className="px-4 py-3">{item.has_conflict ? <Badge tone="danger" text="Conflict" /> : null}{item.payroll_blocking ? <Badge tone="warn" text="Payroll" /> : null}</td><td className="px-4 py-3"><div className="flex gap-2"><button className="rounded-lg border px-3 py-2 text-xs font-black" onClick={() => onStatus(item)} type="button">Status</button><button className="rounded-lg border px-3 py-2 text-xs font-black" onClick={() => onSwap(item)} type="button">Swap</button></div></td></tr>)}</tbody></table></div>;
}

function Templates({ items, onNew }: { items: Template[]; onNew: () => void }) {
  return <ListHeader label="Templates" onNew={onNew}>{items.length ? items.map((item) => <Card key={item.id} title={`${item.code} · ${item.name}`} meta={`${item.start_time} - ${item.end_time} · ${title(item.work_mode)}`} badge={item.is_active ? "Active" : "Inactive"} />) : <Empty text="No shift templates configured." />}</ListHeader>;
}

function Requirements({ items, onNew, templateName }: { items: Requirement[]; onNew: () => void; templateName: (id?: string) => string }) {
  return <ListHeader label="Staffing Requirements" onNew={onNew}>{items.length ? items.map((item) => <Card key={item.id} title={item.name} meta={`${templateName(item.shift_template_id)} · Required ${item.required_count}`} badge={title(item.priority)} />) : <Empty text="No staffing requirements configured." />}</ListHeader>;
}

function Swaps({ items, onReview }: { items: SwapRequest[]; onReview: (item: SwapRequest) => void }) {
  if (!items.length) return <Empty text="No swap requests." />;
  return <div className="grid gap-3">{items.map((item) => <div className="rounded-lg border border-[#edf1ef] p-4" key={item.id}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#111827]">{item.reason || "Shift swap request"}</p><p className="mt-1 text-xs font-bold text-[#6b7280]">{dateOnly(item.created_at)}</p></div><Badge text={title(item.status)} /></div>{item.status === "pending" ? <button className="mt-3 rounded-lg border px-3 py-2 text-xs font-black" onClick={() => onReview(item)} type="button">Review</button> : null}</div>)}</div>;
}

function Gaps({ items }: { items: StaffingGap[] }) {
  if (!items.length) return <Empty text="No staffing gaps for this range." />;
  return <div className="grid gap-3 md:grid-cols-2">{items.map((item) => <Card key={item.requirement_id} title={item.requirement_name} meta={`${item.assigned_count}/${item.required_count} assigned · gap ${item.gap_count}`} badge={item.payroll_blocking ? "Payroll blocker" : title(item.priority)} />)}</div>;
}

function TemplateForm({ form, locations, onCancel, onChange, onSubmit }: { form: typeof emptyTemplate; locations: AttendanceLocation[]; onCancel: () => void; onChange: (form: typeof emptyTemplate) => void; onSubmit: () => void }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Code"><input className={inputClass} value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value })} /></Field><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field><Field label="Start"><input className={inputClass} type="time" value={form.start_time} onChange={(e) => onChange({ ...form, start_time: e.target.value })} /></Field><Field label="End"><input className={inputClass} type="time" value={form.end_time} onChange={(e) => onChange({ ...form, end_time: e.target.value })} /></Field><Field label="Break minutes"><input className={inputClass} value={form.break_minutes} onChange={(e) => onChange({ ...form, break_minutes: e.target.value })} /></Field><Field label="Paid minutes"><input className={inputClass} value={form.paid_minutes} onChange={(e) => onChange({ ...form, paid_minutes: e.target.value })} /></Field><Field label="Location"><LocationSelect value={form.attendance_location_id} locations={locations} onChange={(value) => onChange({ ...form, attendance_location_id: value })} /></Field><Field label="Work mode"><OptionSelect value={form.work_mode} options={["office", "remote", "field", "hybrid"]} onChange={(value) => onChange({ ...form, work_mode: value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

function RequirementForm({ form, locations, onCancel, onChange, onSubmit, templates }: { form: typeof emptyRequirement; locations: AttendanceLocation[]; templates: Template[]; onCancel: () => void; onChange: (form: typeof emptyRequirement) => void; onSubmit: () => void }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field><Field label="Date"><input className={inputClass} type="date" value={form.requirement_date} onChange={(e) => onChange({ ...form, requirement_date: e.target.value })} /></Field><Field label="Template"><TemplateSelect value={form.shift_template_id} templates={templates} onChange={(value) => onChange({ ...form, shift_template_id: value })} /></Field><Field label="Location"><LocationSelect value={form.attendance_location_id} locations={locations} onChange={(value) => onChange({ ...form, attendance_location_id: value })} /></Field><Field label="Required count"><input className={inputClass} value={form.required_count} onChange={(e) => onChange({ ...form, required_count: e.target.value })} /></Field><Field label="Priority"><OptionSelect value={form.priority} options={["low", "medium", "high", "critical"]} onChange={(value) => onChange({ ...form, priority: value })} /></Field><label className="flex items-center gap-2 text-sm font-black"><input checked={form.payroll_blocking} onChange={(e) => onChange({ ...form, payroll_blocking: e.target.checked })} type="checkbox" />Payroll blocker</label><Actions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

function AssignmentForm({ form, locations, onCancel, onChange, onSubmit, templates }: { form: typeof emptyAssignment; locations: AttendanceLocation[]; templates: Template[]; onCancel: () => void; onChange: (form: typeof emptyAssignment) => void; onSubmit: () => void }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Date"><input className={inputClass} type="date" value={form.schedule_date} onChange={(e) => onChange({ ...form, schedule_date: e.target.value })} /></Field><Field label="Employee User ID"><input className={inputClass} value={form.employee_user_id} onChange={(e) => onChange({ ...form, employee_user_id: e.target.value })} /></Field><Field label="Worker Profile ID"><input className={inputClass} value={form.worker_profile_id} onChange={(e) => onChange({ ...form, worker_profile_id: e.target.value })} /></Field><Field label="Template"><TemplateSelect value={form.shift_template_id} templates={templates} onChange={(value) => onChange({ ...form, shift_template_id: value })} /></Field><Field label="Location"><LocationSelect value={form.attendance_location_id} locations={locations} onChange={(value) => onChange({ ...form, attendance_location_id: value })} /></Field><Field label="Status"><OptionSelect value={form.status} options={["draft", "published", "locked"]} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Start"><input className={inputClass} type="time" value={form.start_time} onChange={(e) => onChange({ ...form, start_time: e.target.value })} /></Field><Field label="End"><input className={inputClass} type="time" value={form.end_time} onChange={(e) => onChange({ ...form, end_time: e.target.value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

function StatusForm({ form, onCancel, onChange, onSubmit }: { form: typeof statusFormShape; onCancel: () => void; onChange: (form: typeof statusFormShape) => void; onSubmit: () => void }) {
  return <div className="space-y-4"><Field label="Status"><OptionSelect value={form.status} options={["published", "locked", "cancelled", "completed"]} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Remarks"><textarea className={inputClass + " min-h-24"} value={form.remarks} onChange={(e) => onChange({ ...form, remarks: e.target.value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

const statusFormShape = { id: "", status: "", remarks: "" };

function SwapForm({ form, onCancel, onChange, onSubmit, templates }: { form: typeof emptySwap; templates: Template[]; onCancel: () => void; onChange: (form: typeof emptySwap) => void; onSubmit: () => void }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Assignment ID"><input className={inputClass} value={form.requester_assignment_id} onChange={(e) => onChange({ ...form, requester_assignment_id: e.target.value })} /></Field><Field label="Target User ID"><input className={inputClass} value={form.target_user_id} onChange={(e) => onChange({ ...form, target_user_id: e.target.value })} /></Field><Field label="Requested Date"><input className={inputClass} type="date" value={form.requested_date} onChange={(e) => onChange({ ...form, requested_date: e.target.value })} /></Field><Field label="Requested Template"><TemplateSelect value={form.requested_shift_template_id} templates={templates} onChange={(value) => onChange({ ...form, requested_shift_template_id: value })} /></Field><Field label="Reason"><textarea className={inputClass + " min-h-24"} value={form.reason} onChange={(e) => onChange({ ...form, reason: e.target.value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

function ReviewForm({ form, onCancel, onChange, onSubmit }: { form: typeof reviewFormShape; onCancel: () => void; onChange: (form: typeof reviewFormShape) => void; onSubmit: () => void }) {
  return <div className="space-y-4"><Field label="Decision"><OptionSelect value={form.status} options={["approved", "rejected", "cancelled"]} onChange={(value) => onChange({ ...form, status: value })} /></Field><Field label="Remarks"><textarea className={inputClass + " min-h-24"} value={form.remarks} onChange={(e) => onChange({ ...form, remarks: e.target.value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

const reviewFormShape = { id: "", status: "", remarks: "" };

function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="grid gap-2 text-sm font-black text-[#374151]">{label}{children}</label>; }
function Actions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) { return <div className="col-span-full flex justify-end gap-2"><button className="rounded-lg border px-4 py-2 text-sm font-black" onClick={onCancel} type="button">Cancel</button><button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>; }
function Metric({ label, tone, value }: { label: string; value: number; tone?: "warn" | "danger" | "info" }) { const color = tone === "danger" ? "text-red-700" : tone === "warn" ? "text-amber-700" : tone === "info" ? "text-blue-700" : "text-[#111827]"; return <div className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-[#6b7280]">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>; }
function Badge({ text, tone }: { text: string; tone?: "danger" | "warn" }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${tone === "danger" ? "bg-red-50 text-red-700" : tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-[#edf7f0] text-[#315f3d]"}`}>{text}</span>; }
function Empty({ text }: { text: string }) { return <p className="rounded-lg bg-[#f8faf9] px-4 py-5 text-sm font-bold text-[#6b7280]">{text}</p>; }
function Card({ badge, meta, title: cardTitle }: { title: string; meta: string; badge: string }) { return <div className="rounded-lg border border-[#edf1ef] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#111827]">{cardTitle}</p><p className="mt-1 text-sm font-semibold text-[#6b7280]">{meta}</p></div><Badge text={badge} /></div></div>; }
function ListHeader({ children, label, onNew }: { children: ReactNode; label: string; onNew: () => void }) { return <div><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-[#111827]">{label}</h2><button className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-black text-white" onClick={onNew} type="button">New</button></div><div className="grid gap-3 md:grid-cols-2">{children}</div></div>; }
function LocationSelect({ locations, onChange, value }: { locations: AttendanceLocation[]; value: string; onChange: (value: string) => void }) { return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}><option value="">No location</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>; }
function TemplateSelect({ onChange, templates, value }: { templates: Template[]; value: string; onChange: (value: string) => void }) { return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}><option value="">No template</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select>; }
function OptionSelect({ onChange, options, value }: { options: string[]; value: string; onChange: (value: string) => void }) { return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((item) => <option key={item} value={item}>{title(item)}</option>)}</select>; }

function cleanPayload<T extends Record<string, unknown>>(value: T) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item != null)); }
function numberPayload<T extends Record<string, unknown>>(value: T, keys: string[]) { const payload = cleanPayload(value); for (const key of keys) if (payload[key] !== undefined) payload[key] = Number(payload[key]); return payload; }
function templateName(templates: Template[]) { return (id?: string) => templates.find((item) => item.id === id)?.name || "Manual shift"; }
function locationName(locations: AttendanceLocation[]) { return (id?: string) => locations.find((item) => item.id === id)?.name || "-"; }
function title(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function dateOnly(value?: string) { return value ? value.slice(0, 10) : "-"; }
