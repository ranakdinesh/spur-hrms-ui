"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Candidate = { id: string; firstname?: string | null; lastname?: string | null; email?: string | null };
type Workflow = { id: string; name: string; is_default: boolean; is_active: boolean };
type Page<T> = { items: T[]; total?: number };
type OnboardingTask = { id: string; task_title?: string | null; task_description?: string | null; task_is_required: boolean; status: string; due_at?: string | null; completed_at?: string | null; remarks?: string | null; is_overdue: boolean };
type OnboardingEvent = { id: string; action: string; from_status?: string | null; to_status?: string | null; remarks?: string | null; created_at: string };
type CandidateOnboarding = { id: string; candidate_id: string; candidate_firstname?: string | null; candidate_lastname?: string | null; candidate_email?: string | null; workflow_id: string; workflow_name?: string | null; onboarding_status: string; progress_percentage: number; total_tasks: number; completed_tasks: number; required_tasks: number; completed_required_tasks: number; overdue_tasks: number; started_at?: string | null; completed_at?: string | null; tasks?: OnboardingTask[]; events?: OnboardingEvent[] };

const statuses = ["Pending", "InProgress", "Completed"];

function candidateName(item: CandidateOnboarding | Candidate) {
  const first = "candidate_id" in item ? item.candidate_firstname : item.firstname;
  const last = "candidate_id" in item ? item.candidate_lastname : item.lastname;
  return [first, last].filter(Boolean).join(" ") || "Unnamed candidate";
}

function badge(status: string) {
  if (status === "Completed") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "InProgress") return "bg-[#e0f2fe] text-[#0369a1]";
  return "bg-[#fef3c7] text-[#92400e]";
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "-";
}

export function CandidateOnboardingProgressSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Onboarding</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Candidate Progress</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to start onboarding, track progress, and close required tasks.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Progress</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <ProgressManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function ProgressManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<CandidateOnboarding[]>([]);
  const [total, setTotal] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<CandidateOnboarding | null>(null);
  const [candidateID, setCandidateID] = useState("");
  const [workflowID, setWorkflowID] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadSetup = useCallback(async () => {
    const [candidatePage, workflowRows] = await Promise.all([
      apiRequest<Page<Candidate>>(`${basePath}/candidates?limit=200`).catch(() => ({ items: [] })),
      apiRequest<Workflow[]>(`${basePath}/onboarding-workflows`).catch(() => []),
    ]);
    setCandidates(candidatePage.items || []);
    setWorkflows(workflowRows.filter((item) => item.is_active));
  }, [basePath]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    const page = await apiRequest<Page<CandidateOnboarding>>(`${basePath}/candidate-onboardings?${params.toString()}`);
    setItems(page.items || []);
    setTotal(page.total || 0);
    if (selected) {
      const refreshed = page.items?.find((item) => item.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
  }, [basePath, search, selected, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup().catch((err) => setError(err instanceof Error ? err.message : "Failed to load setup.")); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load onboardings.")); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function startOnboarding() {
    setError(""); setNotice("");
    try {
      const item = await apiRequest<CandidateOnboarding>(`${basePath}/candidate-onboardings/start`, { method: "POST", body: { candidate_id: candidateID, workflow_id: workflowID || null } });
      setSelected(item);
      setCandidateID("");
      setWorkflowID("");
      setNotice("Candidate onboarding started.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to start onboarding."); }
  }

  async function openItem(id: string) {
    setError("");
    try {
      setSelected(await apiRequest<CandidateOnboarding>(`${basePath}/candidate-onboardings/${id}`));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to open onboarding."); }
  }

  async function updateTask(task: OnboardingTask, next: string) {
    if (!selected) return;
    setError(""); setNotice("");
    try {
      const item = await apiRequest<CandidateOnboarding>(`${basePath}/candidate-onboarding-tasks/${task.id}/status`, { method: "POST", body: { status: next, remarks: remarks[task.id] || task.remarks || null } });
      setSelected(item);
      setNotice("Task status updated.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update task."); }
  }

  const activeCount = items.filter((item) => item.onboarding_status !== "Completed").length;
  const completedCount = items.filter((item) => item.onboarding_status === "Completed").length;
  const overdueCount = items.reduce((sum, item) => sum + item.overdue_tasks, 0);
  const averageProgress = items.length ? Math.round(items.reduce((sum, item) => sum + item.progress_percentage, 0) / items.length) : 0;

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Onboarding</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Candidate Progress` : "Candidate Progress"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Start candidate onboarding from reusable workflows, track overdue work, and complete required tasks with an audit trail.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Total", value: total }, { label: "Active", value: activeCount }, { label: "Completed", value: completedCount }, { label: "Overdue Tasks", value: overdueCount }, { label: "Avg Progress", value: `${averageProgress}%` }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-3xl text-[#111827]">{item.value}</strong></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate or workflow" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setStatus(""); }} type="button">Reset</button></div></section>
          <section className="grid gap-4 lg:grid-cols-2">{items.length === 0 ? <div className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-sm font-semibold text-[#6b7280]">No candidate onboarding records yet.</div> : items.map((item) => <article className={`rounded-2xl border bg-white p-5 shadow-sm ${selected?.id === item.id ? "border-[#588368]" : "border-[#edf1ef]"}`} key={item.id}><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[#111827]">{candidateName(item)}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{item.workflow_name || "Workflow"} - started {dateOnly(item.started_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.onboarding_status)}`}>{item.onboarding_status}</span></div><div className="mt-5"><div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-[#6b7280]"><span>{item.completed_tasks}/{item.total_tasks} tasks</span><span>{item.progress_percentage}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-[#588368]" style={{ width: `${item.progress_percentage}%` }} /></div></div><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{item.completed_required_tasks}/{item.required_tasks} required</span>{item.overdue_tasks > 0 ? <span className="rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-black text-[#b91c1c]">{item.overdue_tasks} overdue</span> : null}</div><button className="mt-5 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void openItem(item.id)} type="button">Open Checklist</button></article>)}</section>
          {selected ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-black text-[#111827]">{candidateName(selected)}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{selected.workflow_name || "Workflow"} - {selected.progress_percentage}% complete</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${badge(selected.onboarding_status)}`}>{selected.onboarding_status}</span></div><div className="mt-5 divide-y divide-[#edf1ef]">{(selected.tasks || []).map((task) => <div className="py-5" key={task.id}><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><strong className="text-sm text-[#111827]">{task.task_title || "Task"}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">{task.task_is_required ? "Required" : "Optional"} - due {dateOnly(task.due_at)}{task.is_overdue ? " - overdue" : ""}</p>{task.task_description ? <p className="mt-2 text-sm text-[#4b5563]">{task.task_description}</p> : null}</div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${badge(task.status)}`}>{task.status}</span></div><div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]"><input className="h-11 rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setRemarks({ ...remarks, [task.id]: event.target.value })} placeholder="Remarks" value={remarks[task.id] ?? task.remarks ?? ""} /><div className="flex flex-wrap gap-2">{statuses.map((next) => <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] disabled:opacity-50" disabled={task.status === next} key={next} onClick={() => void updateTask(task, next)} type="button">{next}</button>)}</div></div></div>)}</div><h3 className="mt-6 text-sm font-black uppercase tracking-wide text-[#6b7280]">Event trail</h3><div className="mt-3 divide-y divide-[#edf1ef]">{(selected.events || []).map((event) => <div className="py-3" key={event.id}><div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#111827]">{event.action}</strong><span className="text-xs font-bold text-[#6b7280]">{dateOnly(event.created_at)}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.from_status || "-"} to {event.to_status || "-"}</p>{event.remarks ? <p className="mt-1 text-xs font-bold text-[#92400e]">{event.remarks}</p> : null}</div>)}</div></section> : null}
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Start Onboarding</h2><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setCandidateID(event.target.value)} value={candidateID}><option value="">Select candidate</option>{candidates.map((item) => <option key={item.id} value={item.id}>{candidateName(item)}{item.email ? ` - ${item.email}` : ""}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setWorkflowID(event.target.value)} value={workflowID}><option value="">Auto resolve workflow</option>{workflows.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_default ? " (default)" : ""}</option>)}</select><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!candidateID} onClick={() => void startOnboarding()} type="button">Start Checklist</button></div></section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Progress Signals</h2><div className="mt-4 space-y-3">{items.filter((item) => item.overdue_tasks > 0 || item.progress_percentage < 50).slice(0, 8).map((item) => <button className="block w-full rounded-xl border border-[#edf1ef] p-4 text-left hover:border-[#588368]" key={item.id} onClick={() => void openItem(item.id)} type="button"><strong className="text-sm text-[#111827]">{candidateName(item)}</strong><p className="mt-1 text-xs font-bold text-[#6b7280]">{item.progress_percentage}% complete - {item.overdue_tasks} overdue</p></button>)}{items.filter((item) => item.overdue_tasks > 0 || item.progress_percentage < 50).length === 0 ? <p className="text-sm font-semibold text-[#6b7280]">No stalled or overdue onboarding records.</p> : null}</div></section>
        </aside>
      </section>
    </main>
  );
}
