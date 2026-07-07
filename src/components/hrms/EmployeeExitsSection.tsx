"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Page<T> = { items: T[]; total?: number };
type Employee = { id: string; user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null; email?: string | null; department_name?: string | null; branch_name?: string | null };
type ExitTask = { id: string; task_key: string; title: string; description?: string | null; owner_role?: string | null; due_date?: string | null; status: string; remarks?: string | null; completed_at?: string | null };
type ExitEvent = { id: string; action: string; from_status?: string | null; to_status?: string | null; remarks?: string | null; created_at: string };
type ExitRequest = {
  id: string;
  employee_id: string;
  employee_user_id: string;
  employee_firstname?: string | null;
  employee_lastname?: string | null;
  employee_code?: string | null;
  employee_email?: string | null;
  department_name?: string | null;
  branch_name?: string | null;
  status: string;
  exit_type: string;
  reason?: string | null;
  resignation_date?: string | null;
  notice_start_date?: string | null;
  last_working_date: string;
  requested_relieving_date?: string | null;
  approved_relieving_date?: string | null;
  final_settlement_status: string;
  access_revocation_status: string;
  asset_clearance_status: string;
  handover_status: string;
  exit_interview_status: string;
  notes?: string | null;
  total_tasks: number;
  completed_tasks: number;
  blocked_tasks: number;
  tasks?: ExitTask[];
  events?: ExitEvent[];
};

const requestStatuses = ["submitted", "approved", "rejected", "completed", "canceled"];
const taskStatuses = ["pending", "in_progress", "completed", "waived", "blocked"];
const exitTypes = ["resignation", "termination", "retirement", "contract_end", "absconding", "other"];

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "-";
}

function personName(item: ExitRequest | Employee) {
  const first = "employee_id" in item ? item.employee_firstname : item.firstname;
  const last = "employee_id" in item ? item.employee_lastname : item.lastname;
  return [first, last].filter(Boolean).join(" ") || "Unnamed employee";
}

function badge(status: string) {
  if (status === "completed" || status === "waived" || status === "approved") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "blocked" || status === "rejected" || status === "canceled") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "in_progress" || status === "submitted") return "bg-[#e0f2fe] text-[#0369a1]";
  return "bg-[#fef3c7] text-[#92400e]";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeExitsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employee Lifecycle</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Employee Exits</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Select a tenant to initiate exits, run approvals, track clearance tasks, and deactivate access only after completion.</p>
        </div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Exits</button></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }
  return <ExitManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function ExitManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<ExitRequest[]>([]);
  const [selected, setSelected] = useState<ExitRequest | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ employee_id: "", exit_type: "resignation", resignation_date: today(), notice_start_date: today(), last_working_date: today(), requested_relieving_date: "", reason: "", notes: "" });

  const loadSetup = useCallback(async () => {
    const rows = await apiRequest<Employee[]>(`${basePath}/employees`);
    setEmployees(rows);
  }, [basePath]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    const page = await apiRequest<Page<ExitRequest>>(`${basePath}/employee-exits?${params.toString()}`);
    setItems(page.items || []);
    if (selected) {
      const refreshed = page.items?.find((item) => item.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
  }, [basePath, search, selected, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup().catch((err) => setError(err instanceof Error ? err.message : "Failed to load employees.")); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load exits.")); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function createExit() {
    setError(""); setNotice("");
    try {
      const item = await apiRequest<ExitRequest>(`${basePath}/employee-exits`, { method: "POST", body: { ...form, requested_relieving_date: form.requested_relieving_date || null, reason: form.reason || null, notes: form.notes || null } });
      setSelected(item);
      setNotice("Exit workflow initiated with the standard clearance checklist.");
      setForm({ employee_id: "", exit_type: "resignation", resignation_date: today(), notice_start_date: today(), last_working_date: today(), requested_relieving_date: "", reason: "", notes: "" });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to initiate exit."); }
  }

  async function openExit(id: string) {
    setError("");
    try {
      setSelected(await apiRequest<ExitRequest>(`${basePath}/employee-exits/${id}`));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to open exit."); }
  }

  async function action(item: ExitRequest, next: "approve" | "reject" | "cancel" | "complete") {
    setError(""); setNotice("");
    try {
      const updated = await apiRequest<ExitRequest>(`${basePath}/employee-exits/${item.id}/${next}`, { method: "POST", body: { remarks: remarks[item.id] || null, approved_relieving_date: next === "approve" ? item.approved_relieving_date || item.last_working_date.slice(0, 10) : null } });
      setSelected(updated);
      setNotice(`Exit ${next} action saved.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${next} exit.`); }
  }

  async function updateTask(task: ExitTask, next: string) {
    if (!selected) return;
    setError(""); setNotice("");
    try {
      const item = await apiRequest<ExitRequest>(`${basePath}/employee-exit-tasks/${task.id}/status`, { method: "PUT", body: { status: next, remarks: remarks[task.id] || task.remarks || null } });
      setSelected(item);
      setNotice("Checklist task updated.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update task."); }
  }

  const active = items.filter((item) => item.status === "submitted" || item.status === "approved").length;
  const blocked = items.reduce((sum, item) => sum + item.blocked_tasks, 0);
  const completed = items.filter((item) => item.status === "completed").length;
  const completionReady = selected ? (selected.tasks || []).every((task) => task.status === "completed" || task.status === "waived") : false;

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employee Lifecycle</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Employee Exits` : "Employee Exits"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Manage resignation, termination, clearance, final settlement readiness, and access deactivation from one workflow.</p></div>
        {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      </div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Total", value: items.length }, { label: "Active", value: active }, { label: "Completed", value: completed }, { label: "Blocked Tasks", value: blocked }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-3xl text-[#111827]">{item.value}</strong></div>)}</section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, code, email" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{requestStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setStatus(""); }} type="button">Reset</button></div></section>

          <section className="grid gap-4 lg:grid-cols-2">{items.length === 0 ? <div className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-sm font-semibold text-[#6b7280]">No exit workflows yet.</div> : items.map((item) => <article className={`rounded-2xl border bg-white p-5 shadow-sm ${selected?.id === item.id ? "border-[#588368]" : "border-[#edf1ef]"}`} key={item.id}><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[#111827]">{personName(item)}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{item.employee_code || "No code"} - {item.department_name || "No department"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.status)}`}>{item.status}</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs font-black uppercase text-[#6b7280]">Last Working</p><strong>{dateOnly(item.last_working_date)}</strong></div><div><p className="text-xs font-black uppercase text-[#6b7280]">Type</p><strong>{item.exit_type}</strong></div></div><div className="mt-4"><div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-[#6b7280]"><span>{item.completed_tasks}/{item.total_tasks} tasks</span><span>{item.blocked_tasks} blocked</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-[#588368]" style={{ width: `${item.total_tasks ? Math.round((item.completed_tasks / item.total_tasks) * 100) : 0}%` }} /></div></div><button className="mt-5 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void openExit(item.id)} type="button">Open Exit</button></article>)}</section>

          {selected ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-black text-[#111827]">{personName(selected)}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{selected.exit_type} - last working {dateOnly(selected.last_working_date)}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${badge(selected.status)}`}>{selected.status}</span></div><div className="mt-5 grid gap-3 md:grid-cols-5">{[{ label: "Handover", value: selected.handover_status }, { label: "Assets", value: selected.asset_clearance_status }, { label: "Access", value: selected.access_revocation_status }, { label: "Interview", value: selected.exit_interview_status }, { label: "F&F", value: selected.final_settlement_status }].map((item) => <div className="rounded-xl bg-[#f8faf9] p-3" key={item.label}><p className="text-xs font-black uppercase text-[#6b7280]">{item.label}</p><strong className="mt-1 block text-sm text-[#111827]">{item.value}</strong></div>)}</div><div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input className="h-11 rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setRemarks({ ...remarks, [selected.id]: event.target.value })} placeholder="Action remarks" value={remarks[selected.id] || ""} /><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] disabled:opacity-50" disabled={selected.status !== "submitted"} onClick={() => void action(selected, "approve")} type="button">Approve</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] disabled:opacity-50" disabled={selected.status !== "submitted"} onClick={() => void action(selected, "reject")} type="button">Reject</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] disabled:opacity-50" disabled={selected.status === "completed" || selected.status === "canceled"} onClick={() => void action(selected, "cancel")} type="button">Cancel</button><button className="rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white disabled:bg-[#a8b7ae]" disabled={selected.status !== "approved" || !completionReady} onClick={() => void action(selected, "complete")} type="button">Complete & Deactivate</button></div></div><div className="mt-5 divide-y divide-[#edf1ef]">{(selected.tasks || []).map((task) => <div className="py-5" key={task.id}><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><strong className="text-sm text-[#111827]">{task.title}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">{task.owner_role || "owner"} - due {dateOnly(task.due_date)}</p>{task.description ? <p className="mt-2 text-sm text-[#4b5563]">{task.description}</p> : null}</div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${badge(task.status)}`}>{task.status}</span></div><div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]"><input className="h-11 rounded-xl border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setRemarks({ ...remarks, [task.id]: event.target.value })} placeholder="Task remarks" value={remarks[task.id] ?? task.remarks ?? ""} /><div className="flex flex-wrap gap-2">{taskStatuses.map((next) => <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] disabled:opacity-50" disabled={task.status === next} key={next} onClick={() => void updateTask(task, next)} type="button">{next}</button>)}</div></div></div>)}</div><h3 className="mt-6 text-sm font-black uppercase tracking-wide text-[#6b7280]">Audit Trail</h3><div className="mt-3 divide-y divide-[#edf1ef]">{(selected.events || []).map((event) => <div className="py-3" key={event.id}><div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#111827]">{event.action}</strong><span className="text-xs font-bold text-[#6b7280]">{dateOnly(event.created_at)}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.from_status || "-"} to {event.to_status || "-"}</p>{event.remarks ? <p className="mt-1 text-xs font-bold text-[#92400e]">{event.remarks}</p> : null}</div>)}</div></section> : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Initiate Exit</h2><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, employee_id: event.target.value })} value={form.employee_id}><option value="">Select employee</option>{employees.map((item) => <option key={item.id} value={item.id}>{personName(item)}{item.employee_code ? ` - ${item.employee_code}` : ""}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, exit_type: event.target.value })} value={form.exit_type}>{exitTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="text-xs font-black uppercase text-[#6b7280]">Resignation Date<input className="mt-1 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, resignation_date: event.target.value })} type="date" value={form.resignation_date} /></label><label className="text-xs font-black uppercase text-[#6b7280]">Notice Start<input className="mt-1 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, notice_start_date: event.target.value })} type="date" value={form.notice_start_date} /></label><label className="text-xs font-black uppercase text-[#6b7280]">Last Working Day<input className="mt-1 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, last_working_date: event.target.value })} type="date" value={form.last_working_date} /></label><label className="text-xs font-black uppercase text-[#6b7280]">Requested Relieving<input className="mt-1 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, requested_relieving_date: event.target.value })} type="date" value={form.requested_relieving_date} /></label><textarea className="min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Reason" value={form.reason} /><textarea className="min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" value={form.notes} /><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.employee_id || !form.last_working_date} onClick={() => void createExit()} type="button">Create Exit Workflow</button></div></section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Completion Gate</h2><p className="mt-3 text-sm leading-6 text-[#6b7280]">The complete action stays blocked until every checklist item is completed or waived. Completion then deactivates the employee and linked identity access.</p></section>
        </aside>
      </section>
    </main>
  );
}
