"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Task = {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  source_module: string;
  source_type: string;
  source_record_label?: string;
  status: string;
  priority: number;
  severity: string;
  visibility_scope: string;
  due_at?: string;
  created_at: string;
  updated_at: string;
  comment_count?: number;
  attachment_count?: number;
  watched_by_viewer?: boolean;
};

type TaskWorkspace = {
  task: Task;
  comments?: Array<{ id: string; body: string; visibility: string; created_at: string }>;
  attachments?: Array<{ id: string; file_name: string; content_type: string; storage_path: string; created_at: string }>;
  events?: Array<{ id: string; action: string; from_status?: string; to_status?: string; remarks?: string; created_at: string }>;
};

type Template = {
  id: string;
  name: string;
  source_module: string;
  source_type: string;
  default_priority: number;
  default_severity: string;
};

type ViewKey = "inbox" | "my_requests" | "team" | "watching" | "completed" | "delegated";
type ModalKey = "" | "new" | "action" | "comment" | "delegate" | "attachment";

const views: Array<{ key: ViewKey; label: string }> = [
  { key: "inbox", label: "Inbox" },
  { key: "my_requests", label: "My Requests" },
  { key: "team", label: "Team" },
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
  { key: "delegated", label: "Delegated" },
];

const emptyTaskForm = { title: "", description: "", template_id: "", source_module: "hrms", source_type: "manual", source_record_label: "", assignee_role: "", assignee_team: "", priority: "50", severity: "medium", due_at: "" };

export function WorkflowInboxSection({ isSuperAdmin, onNavigate, tenants, tenantsError, tenantsLoading }: { isSuperAdmin: boolean; onNavigate?: (section: string) => void; tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => `${a.name} ${a.code}`.localeCompare(`${b.name} ${b.code}`)), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [view, setView] = useState<ViewKey>("inbox");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workspace, setWorkspace] = useState<TaskWorkspace | null>(null);
  const [selectedID, setSelectedID] = useState("");
  const [modal, setModal] = useState<ModalKey>("");
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [actionForm, setActionForm] = useState({ action: "approve", remarks: "" });
  const [delegateForm, setDelegateForm] = useState({ assignee_role: "", assignee_team: "", remarks: "" });
  const [commentBody, setCommentBody] = useState("");
  const [attachmentForm, setAttachmentForm] = useState({ file_name: "", content_type: "", file_content_base64: "", visibility: "tenant" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const loadTasks = useCallback(async () => {
    if (!canLoad) return;
    const params = new URLSearchParams({ view, limit: "200" });
    if (search.trim()) params.set("search", search.trim());
    if (severity) params.set("severity", severity);
    setLoading(true);
    setError("");
    try {
      const [taskRows, templateRows] = await Promise.all([
        apiRequest<Task[]>(`${basePath}/workflow-tasks?${params.toString()}`),
        apiRequest<Template[]>(`${basePath}/operation-templates?active_only=true&limit=100`),
      ]);
      const normalizedTasks = Array.isArray(taskRows) ? taskRows : [];
      setTasks(normalizedTasks);
      setTemplates(Array.isArray(templateRows) ? templateRows : []);
      setSelectedID((current) => current && normalizedTasks.some((task) => task.id === current) ? current : normalizedTasks[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workflow inbox.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, search, severity, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTasks(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTasks]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!selectedID || !canLoad) {
        setWorkspace(null);
        return;
      }
      apiRequest<TaskWorkspace>(`${basePath}/workflow-tasks/${selectedID}`).then((data) => {
        if (!cancelled) setWorkspace(data);
      }).catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load workflow task.");
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [basePath, canLoad, selectedID]);

  const selected = workspace?.task || tasks.find((task) => task.id === selectedID);

  async function saveTask() {
    const payload = {
      ...taskForm,
      template_id: taskForm.template_id || undefined,
      source_record_label: taskForm.source_record_label || undefined,
      assignee_role: taskForm.assignee_role || undefined,
      assignee_team: taskForm.assignee_team || undefined,
      priority: Number(taskForm.priority || 50),
      due_at: taskForm.due_at ? new Date(taskForm.due_at).toISOString() : undefined,
    };
    const created = await apiRequest<Task>(`${basePath}/workflow-tasks`, { method: "POST", body: JSON.stringify(payload) });
    setModal("");
    setTaskForm(emptyTaskForm);
    setSelectedID(created.id);
    await loadTasks();
  }

  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (!selected) return;
    await apiRequest<Task>(`${basePath}/workflow-tasks/${selected.id}/actions`, { method: "POST", body: JSON.stringify({ action, ...payload }) });
    setModal("");
    await loadTasks();
  }

  async function saveComment() {
    if (!selected) return;
    await apiRequest(`${basePath}/workflow-tasks/${selected.id}/comments`, { method: "POST", body: JSON.stringify({ visibility: "tenant", body: commentBody }) });
    setCommentBody("");
    setModal("");
    await loadTasks();
  }

  async function saveAttachment() {
    if (!selected) return;
    await apiRequest(`${basePath}/workflow-tasks/${selected.id}/attachments`, { method: "POST", body: JSON.stringify(attachmentForm) });
    setAttachmentForm({ file_name: "", content_type: "", file_content_base64: "", visibility: "tenant" });
    setModal("");
    await loadTasks();
  }

  if (isSuperAdmin && !selectedTenantID) {
    return <main className="space-y-5 p-6 lg:p-10"><Header showInfo={showInfo} setShowInfo={setShowInfo} onNew={() => setModal("new")} onRefresh={loadTasks} /><TenantPicker disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /></main>;
  }

  return (
    <main className="space-y-5 p-6 lg:p-10">
      <Header showInfo={showInfo} setShowInfo={setShowInfo} onNew={() => setModal("new")} onRefresh={loadTasks} />
      {isSuperAdmin ? <TenantPicker compact disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <section className="grid min-h-[680px] overflow-hidden rounded-lg border border-[#dfe6e2] bg-white shadow-sm xl:grid-cols-[220px_minmax(320px,0.9fr)_minmax(420px,1.45fr)]">
        <aside className="border-b border-[#edf1ef] bg-[#f8faf9] p-3 xl:border-b-0 xl:border-r">
          <div className="space-y-1">{views.map((item) => <button className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-black ${view === item.key ? "bg-[#111827] text-white" : "text-[#374151] hover:bg-white"}`} key={item.key} onClick={() => setView(item.key)} type="button"><span>{item.label}</span><span>{view === item.key ? tasks.length : ""}</span></button>)}</div>
        </aside>
        <section className="border-b border-[#edf1ef] xl:border-b-0 xl:border-r">
          <div className="grid gap-2 border-b border-[#edf1ef] p-3">
            <input className="h-10 rounded-lg border border-[#dbe0e5] px-3 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" value={search} />
            <select className="h-10 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#374151]" onChange={(event) => setSeverity(event.target.value)} value={severity}><option value="">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
          </div>
          <div className="max-h-[600px] overflow-y-auto p-2">
            {loading && !tasks.length ? <Empty text="Loading tasks..." /> : null}
            {!loading && !tasks.length ? <Empty text="No tasks in this folder." /> : null}
            {tasks.map((task) => <TaskRow key={task.id} selected={selectedID === task.id} task={task} onClick={() => setSelectedID(task.id)} />)}
          </div>
        </section>
        <ReadingPane onAction={(value) => { setActionForm({ action: value, remarks: "" }); setModal("action"); }} onAttachment={() => setModal("attachment")} onComment={() => setModal("comment")} onDelegate={() => setModal("delegate")} onNavigate={onNavigate} onWatch={() => void apiRequest(`${basePath}/workflow-tasks/${selected?.id}/watch`, { method: "POST" }).then(loadTasks)} workspace={workspace} />
      </section>
      <HrmsModal open={modal === "new"} onClose={() => setModal("")} title="New Task"><TaskForm form={taskForm} onCancel={() => setModal("")} onChange={setTaskForm} onSubmit={saveTask} templates={templates} /></HrmsModal>
      <HrmsModal open={modal === "action"} onClose={() => setModal("")} title={label(actionForm.action)}><ActionForm form={actionForm} onCancel={() => setModal("")} onChange={setActionForm} onSubmit={() => act(actionForm.action, { remarks: actionForm.remarks })} /></HrmsModal>
      <HrmsModal open={modal === "delegate"} onClose={() => setModal("")} title="Delegate Task"><DelegateForm form={delegateForm} onCancel={() => setModal("")} onChange={setDelegateForm} onSubmit={() => act("delegate", delegateForm)} /></HrmsModal>
      <HrmsModal open={modal === "comment"} onClose={() => setModal("")} title="Add Comment"><div className="space-y-4"><textarea className={inputClass + " min-h-32"} onChange={(event) => setCommentBody(event.target.value)} value={commentBody} /><ModalActions onCancel={() => setModal("")} onSubmit={saveComment} /></div></HrmsModal>
      <HrmsModal open={modal === "attachment"} onClose={() => setModal("")} title="Attach File"><AttachmentForm form={attachmentForm} onCancel={() => setModal("")} onChange={setAttachmentForm} onSubmit={saveAttachment} /></HrmsModal>
    </main>
  );
}

function Header({ onNew, onRefresh, showInfo, setShowInfo }: { onNew: () => void; onRefresh: () => void; showInfo: boolean; setShowInfo: (value: boolean) => void }) {
  return <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Workflow Inbox</p><button className="grid size-7 place-items-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" onClick={() => setShowInfo(!showInfo)} type="button">i</button></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">My Work</h1>{showInfo ? <p className="mt-2 max-w-3xl rounded-lg border border-[#dfe6e2] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#6b7280]">Workflow tasks centralize requests, approvals, comments, attachments, and delegated work while source modules remain the system of record.</p> : null}</div><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151]" onClick={onRefresh} type="button">Refresh</button><button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={onNew} type="button">New Task</button></div></header>;
}

function TaskRow({ onClick, selected, task }: { onClick: () => void; selected: boolean; task: Task }) {
  return <button className={`mb-2 w-full rounded-lg border p-4 text-left ${selected ? "border-[#588368] bg-[#f4f8f5]" : "border-[#edf1ef] hover:bg-[#f8faf9]"}`} onClick={onClick} type="button"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#111827]">{task.title}</p><p className="mt-1 text-xs font-bold text-[#6b7280]">{task.task_number}</p></div><Badge tone={task.severity} text={label(task.severity)} /></div><p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#6b7280]">{task.description || task.source_record_label || label(task.source_type)}</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#6b7280]"><span>{label(task.status)}</span><span>·</span><span>{task.due_at ? fmtDate(task.due_at) : "No due"}</span>{task.comment_count ? <><span>·</span><span>{task.comment_count} comments</span></> : null}</div></button>;
}

function ReadingPane({ onAction, onAttachment, onComment, onDelegate, onNavigate, onWatch, workspace }: { onAction: (action: string) => void; onAttachment: () => void; onComment: () => void; onDelegate: () => void; onNavigate?: (section: string) => void; onWatch: () => void; workspace: TaskWorkspace | null }) {
  const task = workspace?.task;
  if (!task) return <section className="p-8 text-sm font-bold text-[#6b7280]">Select a task to open the reading pane.</section>;
  return <section className="flex min-h-[680px] flex-col"><div className="border-b border-[#edf1ef] p-5"><div className="flex flex-wrap gap-2"><Badge tone={task.severity} text={label(task.severity)} /><Badge text={label(task.status)} /><Badge text={task.visibility_scope} /></div><h2 className="mt-4 text-2xl font-black text-[#111827]">{task.title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-[#6b7280]">{task.description || task.source_record_label || "No description"}</p></div><div className="grid gap-3 p-5 sm:grid-cols-2"><Fact label="Source" value={`${label(task.source_module)} · ${label(task.source_type)}`} /><Fact label="Due" value={task.due_at ? fmtDate(task.due_at) : "No due date"} /><Fact label="Task" value={task.task_number} /><Fact label="Priority" value={String(task.priority)} /></div><div className="flex flex-wrap gap-2 border-y border-[#edf1ef] p-5">{["approve", "reject", "request_info", "complete"].map((action) => <button className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-black text-white" key={action} onClick={() => onAction(action)} type="button">{label(action)}</button>)}<button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onDelegate} type="button">Delegate</button><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onComment} type="button">Comment</button><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onAttachment} type="button">Attach</button><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onWatch} type="button">Watch</button><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => onNavigate?.("operations-workbench")} type="button">Open Full Record</button></div><div className="grid flex-1 gap-4 p-5 xl:grid-cols-2"><Timeline events={workspace?.events || []} /><Activity title="Comments" empty="No comments yet." rows={(workspace?.comments || []).map((row) => ({ id: row.id, title: row.body, meta: fmtDate(row.created_at) }))} /><Activity title="Attachments" empty="No attachments yet." rows={(workspace?.attachments || []).map((row) => ({ id: row.id, title: row.file_name, meta: row.content_type || fmtDate(row.created_at) }))} /></div></section>;
}

function TaskForm({ form, onCancel, onChange, onSubmit, templates }: { form: typeof emptyTaskForm; onCancel: () => void; onChange: (form: typeof emptyTaskForm) => void; onSubmit: () => void; templates: Template[] }) {
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Template"><select className={inputClass} value={form.template_id} onChange={(event) => onChange({ ...form, template_id: event.target.value })}><option value="">Manual task</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field><Field label="Title"><input className={inputClass} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></Field><Field label="Source Module"><input className={inputClass} value={form.source_module} onChange={(event) => onChange({ ...form, source_module: event.target.value })} /></Field><Field label="Source Type"><input className={inputClass} value={form.source_type} onChange={(event) => onChange({ ...form, source_type: event.target.value })} /></Field><Field label="Assignee Role"><input className={inputClass} value={form.assignee_role} onChange={(event) => onChange({ ...form, assignee_role: event.target.value })} /></Field><Field label="Assignee Team"><input className={inputClass} value={form.assignee_team} onChange={(event) => onChange({ ...form, assignee_team: event.target.value })} /></Field><Field label="Severity"><select className={inputClass} value={form.severity} onChange={(event) => onChange({ ...form, severity: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field><Field label="Due At"><input className={inputClass} type="datetime-local" value={form.due_at} onChange={(event) => onChange({ ...form, due_at: event.target.value })} /></Field></div><Field label="Description"><textarea className={inputClass + " min-h-28"} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></Field><ModalActions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

function ActionForm({ form, onCancel, onChange, onSubmit }: { form: { action: string; remarks: string }; onCancel: () => void; onChange: (form: { action: string; remarks: string }) => void; onSubmit: () => void }) {
  return <div className="space-y-4"><Field label="Action"><select className={inputClass} value={form.action} onChange={(event) => onChange({ ...form, action: event.target.value })}>{["approve", "reject", "request_info", "complete"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field><Field label="Remarks"><textarea className={inputClass + " min-h-28"} value={form.remarks} onChange={(event) => onChange({ ...form, remarks: event.target.value })} /></Field><ModalActions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

function DelegateForm({ form, onCancel, onChange, onSubmit }: { form: { assignee_role: string; assignee_team: string; remarks: string }; onCancel: () => void; onChange: (form: { assignee_role: string; assignee_team: string; remarks: string }) => void; onSubmit: () => void }) {
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Assignee Role"><input className={inputClass} value={form.assignee_role} onChange={(event) => onChange({ ...form, assignee_role: event.target.value })} /></Field><Field label="Assignee Team"><input className={inputClass} value={form.assignee_team} onChange={(event) => onChange({ ...form, assignee_team: event.target.value })} /></Field></div><Field label="Remarks"><textarea className={inputClass + " min-h-24"} value={form.remarks} onChange={(event) => onChange({ ...form, remarks: event.target.value })} /></Field><ModalActions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

function AttachmentForm({ form, onCancel, onChange, onSubmit }: { form: typeof attachmentFormDefault; onCancel: () => void; onChange: (form: typeof attachmentFormDefault) => void; onSubmit: () => void }) {
  return <div className="space-y-4"><Field label="File"><input className={inputClass} type="file" onChange={(event) => void readFile(event.currentTarget.files?.[0], onChange, form)} /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="File Name"><input className={inputClass} value={form.file_name} onChange={(event) => onChange({ ...form, file_name: event.target.value })} /></Field><Field label="Content Type"><input className={inputClass} value={form.content_type} onChange={(event) => onChange({ ...form, content_type: event.target.value })} /></Field></div><ModalActions onCancel={onCancel} onSubmit={onSubmit} /></div>;
}

const attachmentFormDefault = { file_name: "", content_type: "", file_content_base64: "", visibility: "tenant" };
const inputClass = "w-full rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-semibold outline-none focus:border-[#588368]";

function Field({ children, label: labelText }: { children: ReactNode; label: string }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]"><span>{labelText}</span>{children}</label>;
}

function ModalActions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function TenantPicker({ compact, disabled, error, onChange, tenants, value }: { compact?: boolean; disabled: boolean; error: string; onChange: (value: string) => void; tenants: BranchTenantOption[]; value: string }) {
  return <section className={compact ? "" : "rounded-lg border border-[#dfe6e2] bg-white p-5 shadow-sm"}>{error ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}<select className="h-11 w-full rounded-lg border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}</select></section>;
}

function Timeline({ events }: { events: TaskWorkspace["events"] }) {
  return <section><h3 className="mb-3 text-sm font-black text-[#111827]">Timeline</h3><div className="space-y-2">{events?.length ? events.map((event) => <div className="rounded-lg bg-[#f8faf9] p-3 text-xs font-semibold text-[#374151]" key={event.id}><strong>{label(event.action)}</strong><span className="ml-2 text-[#6b7280]">{event.from_status || "-"} {"->"} {event.to_status || "-"}</span><p className="mt-1 text-[#6b7280]">{event.remarks || fmtDate(event.created_at)}</p></div>) : <Empty text="No timeline events." />}</div></section>;
}

function Activity({ empty, rows, title }: { empty: string; rows: Array<{ id: string; title: string; meta: string }>; title: string }) {
  return <section><h3 className="mb-3 text-sm font-black text-[#111827]">{title}</h3><div className="space-y-2">{rows.length ? rows.map((row) => <div className="rounded-lg bg-[#f8faf9] p-3 text-xs font-semibold text-[#374151]" key={row.id}><p>{row.title}</p><p className="mt-1 text-[#6b7280]">{row.meta}</p></div>) : <Empty text={empty} />}</div></section>;
}

function Fact({ label: labelText, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[#f8faf9] px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#6b7280]">{labelText}</p><p className="mt-1 break-words text-sm font-bold text-[#111827]">{value || "-"}</p></div>;
}

function Badge({ text, tone }: { text: string; tone?: string }) {
  const cls = tone === "critical" || tone === "high" ? "bg-red-50 text-red-700" : tone === "medium" ? "bg-amber-50 text-amber-700" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${cls}`}>{text}</span>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg bg-[#f8faf9] p-4 text-sm font-bold text-[#6b7280]">{text}</p>;
}

function label(value?: string | null) {
  return (value || "-").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

async function readFile(file: File | undefined, onChange: (form: typeof attachmentFormDefault) => void, current: typeof attachmentFormDefault) {
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  onChange({ ...current, file_name: file.name, content_type: file.type || "application/octet-stream", file_content_base64: window.btoa(binary) });
}
