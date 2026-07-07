"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Application = { id: string; candidate_firstname?: string | null; candidate_lastname?: string | null; job_posting_title?: string | null; status: string };
type ApplicationPage = { items: Application[] };
type Employee = { id: string; user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null; email?: string | null; inactive: boolean };
type InterviewRound = { id: string; application_id: string; candidate_firstname?: string | null; candidate_lastname?: string | null; job_posting_title?: string | null; job_posting_code?: string | null; round_name?: string | null; round_number?: number | null; scheduled_date?: string | null; duration_minutes?: number | null; interviewer_user_id?: string | null; mode?: string | null; meeting_link?: string | null; location?: string | null; status: string; remarks?: string | null; timezone: string; feedback?: string | null; score?: number | null; decision?: string | null; completed_at?: string | null };
type InterviewPage = { items: InterviewRound[]; total: number };

const statuses = ["Scheduled", "Rescheduled", "Completed", "Cancelled", "NoShow"];
const modes = ["Phone", "Video", "InPerson", "Panel", "Assignment"];
const decisions = ["StrongHire", "Hire", "Hold", "NoHire"];
const emptyForm = { application_id: "", round_name: "", round_number: "", scheduled_date: "", duration_minutes: "60", interviewer_user_id: "", mode: "Video", meeting_link: "", location: "", status: "Scheduled", remarks: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", feedback: "", score: "", decision: "", completed_at: "" };

function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ") || "Unnamed candidate";
}

function employeeName(item: Employee) {
  return [item.firstname, item.lastname].filter(Boolean).join(" ") || item.email || "Unnamed employee";
}

function badge(status: string) {
  if (status === "Completed") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "Cancelled" || status === "NoShow") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "Rescheduled") return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

function dateTimeLabel(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function dateKey(value?: string | null) {
  return value ? value.slice(0, 10) : "Unscheduled";
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toApiDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function InterviewRoundsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Interview Schedule</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to schedule rounds, update outcomes, and review calendar load.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Interviews</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }

  return <InterviewManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function InterviewManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [rounds, setRounds] = useState<InterviewPage>({ items: [], total: 0 });
  const [applications, setApplications] = useState<Application[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<InterviewRound | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadSetup = useCallback(async () => {
    const [applicationPage, employeeRows] = await Promise.all([
      apiRequest<ApplicationPage>(`${basePath}/candidate-applications?limit=200`).catch(() => ({ items: [] })),
      apiRequest<Employee[]>(`${basePath}/employees`).catch(() => []),
    ]);
    setApplications(applicationPage.items || []);
    setEmployees((employeeRows || []).filter((item) => !item.inactive));
  }, [basePath]);

  const loadRounds = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (status) params.set("status", status);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (search.trim()) params.set("search", search.trim());
    try {
      setRounds(await apiRequest<InterviewPage>(`${basePath}/interview-rounds?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interview rounds.");
    }
  }, [basePath, dateFrom, dateTo, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup(); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadRounds(); }, 0); return () => window.clearTimeout(timer); }, [loadRounds]);

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
  }

  function openRound(item: InterviewRound) {
    setSelected(item);
    setForm({ application_id: item.application_id, round_name: item.round_name || "", round_number: item.round_number == null ? "" : String(item.round_number), scheduled_date: toInputDateTime(item.scheduled_date), duration_minutes: item.duration_minutes == null ? "60" : String(item.duration_minutes), interviewer_user_id: item.interviewer_user_id || "", mode: item.mode || "Video", meeting_link: item.meeting_link || "", location: item.location || "", status: item.status, remarks: item.remarks || "", timezone: item.timezone || "UTC", feedback: item.feedback || "", score: item.score == null ? "" : String(item.score), decision: item.decision || "", completed_at: toInputDateTime(item.completed_at) });
  }

  function body(statusOverride?: string) {
    return { application_id: form.application_id, round_name: form.round_name || null, round_number: form.round_number === "" ? null : Number(form.round_number), scheduled_date: toApiDateTime(form.scheduled_date), duration_minutes: form.duration_minutes === "" ? null : Number(form.duration_minutes), interviewer_user_id: form.interviewer_user_id || null, mode: form.mode || null, meeting_link: form.meeting_link || null, location: form.location || null, status: statusOverride || form.status, remarks: form.remarks || null, timezone: form.timezone || "UTC", feedback: form.feedback || null, score: form.score === "" ? null : Number(form.score), decision: form.decision || null, completed_at: toApiDateTime(form.completed_at) };
  }

  async function save() {
    setError("");
    setNotice("");
    try {
      const saved = await apiRequest<InterviewRound>(`${basePath}/interview-rounds${selected ? `/${selected.id}` : ""}`, { method: selected ? "PUT" : "POST", body: body() });
      setNotice(selected ? "Interview round updated." : "Interview round scheduled.");
      await loadRounds();
      openRound(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save interview round.");
    }
  }

  async function updateStatus(item: InterviewRound, nextStatus: string) {
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<InterviewRound>(`${basePath}/interview-rounds/${item.id}/status`, { method: "POST", body: { status: nextStatus, remarks: form.remarks || item.remarks || null, feedback: form.feedback || item.feedback || null, score: form.score === "" ? item.score ?? null : Number(form.score), decision: form.decision || item.decision || null, completed_at: nextStatus === "Completed" ? toApiDateTime(form.completed_at) : null } });
      setNotice(`Interview marked ${nextStatus}.`);
      await loadRounds();
      openRound(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update interview status.");
    }
  }

  async function remove(item: InterviewRound) {
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`${basePath}/interview-rounds/${item.id}`, { method: "DELETE" });
      setNotice("Interview round deleted.");
      resetForm();
      await loadRounds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete interview round.");
    }
  }

  const grouped = rounds.items.reduce<Record<string, InterviewRound[]>>((acc, item) => {
    const key = dateKey(item.scheduled_date);
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});
  const upcoming = rounds.items.filter((item) => item.scheduled_date && new Date(item.scheduled_date) >= new Date() && !["Completed", "Cancelled", "NoShow"].includes(item.status)).length;
  const completed = rounds.items.filter((item) => item.status === "Completed").length;
  const pendingFeedback = rounds.items.filter((item) => item.status === "Completed" && !item.feedback).length;

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Interview Schedule` : "Interview Schedule"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Schedule rounds, assign interviewers, capture remarks, and close interviews with feedback, score, and hiring decision.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Total rounds", value: rounds.total }, { label: "Upcoming", value: upcoming }, { label: "Completed", value: completed }, { label: "Need feedback", value: pendingFeedback }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-3xl text-[#111827]">{item.value}</strong></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, job, round" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} /><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setStatus(""); setDateFrom(""); setDateTo(""); }} type="button">Reset</button></div></div>
          <div className="space-y-4">{Object.keys(grouped).length === 0 ? <div className="rounded-2xl border border-[#edf1ef] bg-white p-10 text-center text-sm font-semibold text-[#6b7280] shadow-sm">No interview rounds found.</div> : Object.entries(grouped).map(([day, items]) => <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={day}><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">{day === "Unscheduled" ? day : new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date(day))}</h2><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{items.length} rounds</span></div><div className="mt-4 grid gap-3">{items.map((item) => <article className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={item.id}><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-base text-[#111827]">{item.round_name || `Round ${item.round_number || ""}`}</strong><span className={`rounded-full px-2 py-1 text-xs font-black ${badge(item.status)}`}>{item.status}</span></div><p className="mt-2 text-sm font-bold text-[#374151]">{fullName(item.candidate_firstname, item.candidate_lastname)}</p><p className="mt-1 text-xs font-semibold text-[#6b7280]">{item.job_posting_title || "No job posting"}{item.job_posting_code ? ` (${item.job_posting_code})` : ""}</p><p className="mt-2 text-xs font-bold text-[#6b7280]">{dateTimeLabel(item.scheduled_date)} - {item.duration_minutes || "-"} min - {item.mode || "Mode not set"}</p>{item.meeting_link ? <a className="mt-2 inline-block text-xs font-black text-[#2563eb]" href={item.meeting_link} rel="noreferrer" target="_blank">Open meeting link</a> : null}{item.location ? <p className="mt-2 text-xs font-bold text-[#6b7280]">{item.location}</p> : null}{item.feedback ? <p className="mt-3 rounded-lg bg-white p-3 text-xs font-semibold text-[#4b5563]">{item.feedback}</p> : null}</div><div className="flex flex-wrap gap-2 lg:justify-end"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => openRound(item)} type="button">Open</button>{statuses.filter((next) => next !== item.status).slice(0, 3).map((next) => <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" key={next} onClick={() => void updateStatus(item, next)} type="button">{next}</button>)}</div></div></article>)}</div></section>)}</div>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">{selected ? "Interview Detail" : "Schedule Round"}</h2>{selected ? <button className="text-sm font-black text-[#588368]" onClick={resetForm} type="button">New</button> : null}</div><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, application_id: event.target.value })} value={form.application_id}><option value="">Select application</option>{applications.map((item) => <option key={item.id} value={item.id}>{fullName(item.candidate_firstname, item.candidate_lastname)} - {item.job_posting_title || "No posting"} - {item.status}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, round_name: event.target.value })} placeholder="Round name" value={form.round_name} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, round_number: event.target.value })} placeholder="Round no." type="number" value={form.round_number} /></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} type="datetime-local" value={form.scheduled_date} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} placeholder="Duration minutes" type="number" value={form.duration_minutes} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, timezone: event.target.value })} placeholder="Timezone" value={form.timezone} /></div><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, interviewer_user_id: event.target.value })} value={form.interviewer_user_id}><option value="">Select interviewer</option>{employees.map((item) => <option key={item.id} value={item.user_id}>{employeeName(item)}{item.employee_code ? ` (${item.employee_code})` : ""}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, mode: event.target.value })} value={form.mode}>{modes.map((item) => <option key={item}>{item}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, meeting_link: event.target.value })} placeholder="Meeting link" value={form.meeting_link} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Location" value={form.location} /><textarea className="min-h-[76px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, remarks: event.target.value })} placeholder="Scheduling remarks" value={form.remarks} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" max="5" min="0" onChange={(event) => setForm({ ...form, score: event.target.value })} placeholder="Score 0-5" step="0.1" type="number" value={form.score} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, decision: event.target.value })} value={form.decision}><option value="">Decision</option>{decisions.map((item) => <option key={item}>{item}</option>)}</select></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, completed_at: event.target.value })} type="datetime-local" value={form.completed_at} /><textarea className="min-h-[96px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, feedback: event.target.value })} placeholder="Interviewer feedback" value={form.feedback} /><div className="grid gap-3 sm:grid-cols-2"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.application_id} onClick={() => void save()} type="button">{selected ? "Update" : "Schedule"}</button>{selected ? <button className="rounded-xl border border-[#fee2e2] px-4 py-3 text-sm font-black text-[#b91c1c]" onClick={() => void remove(selected)} type="button">Delete</button> : <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Clear</button>}</div></div></section>
          {selected ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Status Actions</h2><div className="mt-4 grid gap-2">{statuses.map((next) => <button className={`rounded-xl px-4 py-3 text-sm font-black ${selected.status === next ? "bg-[#588368] text-white" : "border border-[#dbe0e5] text-[#374151]"}`} disabled={selected.status === next} key={next} onClick={() => void updateStatus(selected, next)} type="button">{next}</button>)}</div></section> : null}
        </aside>
      </section>
    </main>
  );
}
