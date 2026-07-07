"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Candidate = { id: string; firstname?: string | null; lastname?: string | null; email?: string | null; resume_url?: string | null; current_salary?: number | null; expected_salary?: number | null; notice_period?: number | null; source?: string | null };
type CandidatePage = { items: Candidate[] };
type Posting = { id: string; title?: string | null; code?: string | null; effective_status?: string | null; job_status?: string | null };
type PostingPage = { items: Posting[] };
type Application = { id: string; candidate_id?: string | null; candidate_firstname?: string | null; candidate_lastname?: string | null; candidate_email?: string | null; candidate_phone?: string | null; job_posting_id?: string | null; job_posting_title?: string | null; job_posting_code?: string | null; resume_url?: string | null; cover_letter?: string | null; current_ctc?: number | null; expected_ctc?: number | null; notice_period?: number | null; referred_by?: string | null; source?: string | null; source_detail?: string | null; status: string; comments?: string | null; applied_at?: string | null; status_changed_at?: string | null; rejection_reason?: string | null; withdrawal_reason?: string | null; duplicate_of_application_id?: string | null; days_in_stage: number; updated_at: string };
type ApplicationPage = { items: Application[]; total: number; limit: number; offset: number; next_offset?: number | null };
type ApplicationEvent = { id: string; from_status?: string | null; to_status: string; action: string; reason?: string | null; remarks?: string | null; created_at: string };

const statuses = ["New", "Screening", "Interview", "Offered", "Hired", "Rejected", "Withdrawn"];
const sources = ["Career Site", "Referral", "LinkedIn", "Naukri", "Indeed", "Agency", "Walk-in", "Campus", "Other"];
const emptyForm = { candidate_id: "", job_posting_id: "", resume_url: "", cover_letter: "", current_ctc: "", expected_ctc: "", notice_period: "", referred_by: "", source: "Career Site", source_detail: "", status: "New", comments: "", applied_at: "", rejection_reason: "", withdrawal_reason: "", duplicate_of_application_id: "", move_reason: "" };

function candidateName(item: Candidate) {
  return [item.firstname, item.lastname].filter(Boolean).join(" ") || "Unnamed candidate";
}

function applicationCandidateName(item: Application) {
  return [item.candidate_firstname, item.candidate_lastname].filter(Boolean).join(" ") || "Unnamed candidate";
}

function money(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(value);
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function badge(status: string) {
  if (status === "Hired" || status === "Offered") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "Rejected" || status === "Withdrawn") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "Interview") return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

export function CandidateApplicationsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Candidate Applications</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage application stages and resume metadata.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Pipeline</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <ApplicationManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function ApplicationManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [applications, setApplications] = useState<ApplicationPage>({ items: [], total: 0, limit: 100, offset: 0 });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [postings, setPostings] = useState<Posting[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadSetup = useCallback(async () => {
    const [candidatePage, postingPage] = await Promise.all([
      apiRequest<CandidatePage>(`${basePath}/candidates?limit=100`).catch(() => ({ items: [] })),
      apiRequest<PostingPage>(`${basePath}/job-postings?limit=100`).catch(() => ({ items: [] })),
    ]);
    setCandidates(candidatePage.items || []);
    setPostings((postingPage.items || []).filter((item) => ["Open", "Draft"].includes(item.effective_status || item.job_status || "")));
  }, [basePath]);

  const loadApplications = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    try {
      setApplications(await apiRequest<ApplicationPage>(`${basePath}/candidate-applications?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications.");
    }
  }, [basePath, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup(); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadApplications(); }, 0); return () => window.clearTimeout(timer); }, [loadApplications]);

  function chooseCandidate(id: string) {
    const candidate = candidates.find((item) => item.id === id);
    setForm({ ...form, candidate_id: id, resume_url: candidate?.resume_url || form.resume_url, current_ctc: candidate?.current_salary == null ? form.current_ctc : String(candidate.current_salary), expected_ctc: candidate?.expected_salary == null ? form.expected_ctc : String(candidate.expected_salary), notice_period: candidate?.notice_period == null ? form.notice_period : String(candidate.notice_period), source: candidate?.source || form.source });
  }

  async function loadDetail(id: string) {
    const [item, eventRows] = await Promise.all([apiRequest<Application>(`${basePath}/candidate-applications/${id}`), apiRequest<ApplicationEvent[]>(`${basePath}/candidate-applications/${id}/events`).catch(() => [])]);
    setSelected(item);
    setEvents(eventRows);
    setForm({ candidate_id: item.candidate_id || "", job_posting_id: item.job_posting_id || "", resume_url: item.resume_url || "", cover_letter: item.cover_letter || "", current_ctc: item.current_ctc == null ? "" : String(item.current_ctc), expected_ctc: item.expected_ctc == null ? "" : String(item.expected_ctc), notice_period: item.notice_period == null ? "" : String(item.notice_period), referred_by: item.referred_by || "", source: item.source || "Career Site", source_detail: item.source_detail || "", status: item.status || "New", comments: item.comments || "", applied_at: dateOnly(item.applied_at), rejection_reason: item.rejection_reason || "", withdrawal_reason: item.withdrawal_reason || "", duplicate_of_application_id: item.duplicate_of_application_id || "", move_reason: "" });
  }

  function resetForm() {
    setSelected(null);
    setEvents([]);
    setForm(emptyForm);
  }

  function body(statusOverride?: string) {
    return { candidate_id: form.candidate_id || null, job_posting_id: form.job_posting_id || null, resume_url: form.resume_url || null, cover_letter: form.cover_letter || null, current_ctc: form.current_ctc === "" ? null : Number(form.current_ctc), expected_ctc: form.expected_ctc === "" ? null : Number(form.expected_ctc), notice_period: form.notice_period === "" ? null : Number(form.notice_period), referred_by: form.referred_by || null, source: form.source || null, source_detail: form.source_detail || null, status: statusOverride || form.status || "New", comments: form.comments || null, applied_at: form.applied_at ? `${form.applied_at}T00:00:00Z` : null, rejection_reason: form.rejection_reason || null, withdrawal_reason: form.withdrawal_reason || null, duplicate_of_application_id: form.duplicate_of_application_id || null };
  }

  async function save(statusOverride?: string) {
    setError("");
    setNotice("");
    try {
      const saved = await apiRequest<Application>(`${basePath}/candidate-applications${selected ? `/${selected.id}` : ""}`, { method: selected ? "PUT" : "POST", body: body(statusOverride) });
      setNotice(selected ? "Application updated." : "Application created.");
      await loadApplications();
      await loadDetail(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save application.");
    }
  }

  async function move(item: Application, nextStatus: string) {
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Application>(`${basePath}/candidate-applications/${item.id}/move`, { method: "POST", body: { status: nextStatus, comments: form.comments || item.comments || null, reason: form.move_reason || form.rejection_reason || form.withdrawal_reason || null } });
      setNotice(`Application moved to ${nextStatus}.`);
      await loadApplications();
      await loadDetail(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move application.");
    }
  }

  async function deactivate(item: Application) {
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`${basePath}/candidate-applications/${item.id}`, { method: "DELETE" });
      setNotice("Application deactivated.");
      resetForm();
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate application.");
    }
  }

  const grouped = Object.fromEntries(statuses.map((item) => [item, applications.items.filter((application) => application.status === item)]));

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Application Pipeline` : "Candidate Applications"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Track applications from new lead through screening, interview, offer, hire, rejection, or withdrawal.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Applications", value: applications.total }, { label: "Interview", value: grouped.Interview?.length || 0 }, { label: "Offered", value: grouped.Offered?.length || 0 }, { label: "Stale 7+ days", value: applications.items.filter((item) => item.days_in_stage >= 7 && !["Hired", "Rejected", "Withdrawn"].includes(item.status)).length }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-3xl text-[#111827]">{item.value}</strong></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, job, referral, comments" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All stages</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setStatus(""); }} type="button">Reset</button></div></div>
              <section className="grid gap-4 2xl:grid-cols-7">{statuses.map((stage) => <div className="min-h-[260px] rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-3" key={stage}><div className="mb-3 flex items-center justify-between"><strong className="text-sm text-[#111827]">{stage}</strong><span className={`rounded-full px-2 py-1 text-xs font-black ${badge(stage)}`}>{grouped[stage]?.length || 0}</span></div><div className="space-y-3">{(grouped[stage] || []).map((item) => <article className="rounded-xl border border-[#edf1ef] bg-white p-4 shadow-sm" key={item.id}><div className="flex items-start justify-between gap-2"><div><strong className="text-sm text-[#111827]">{applicationCandidateName(item)}</strong><p className="mt-1 text-xs font-bold text-[#6b7280]">{item.candidate_email || "No email"}</p></div><button className="rounded-lg border border-[#dbe0e5] px-2 py-1 text-xs font-black text-[#374151]" onClick={() => void loadDetail(item.id)} type="button">Open</button></div><p className="mt-3 text-xs font-bold text-[#6b7280]">{item.job_posting_title || "No posting"}{item.job_posting_code ? ` (${item.job_posting_code})` : ""}</p><p className="mt-2 text-xs font-semibold text-[#6b7280]">Expected {money(item.expected_ctc)} - Notice {item.notice_period ?? "-"} days</p><p className={`mt-2 text-xs font-black ${item.days_in_stage >= 7 && !["Hired", "Rejected", "Withdrawn"].includes(item.status) ? "text-[#b91c1c]" : "text-[#6b7280]"}`}>{item.days_in_stage} days in stage</p>{item.rejection_reason || item.withdrawal_reason ? <p className="mt-2 text-xs font-bold text-[#92400e]">{item.rejection_reason || item.withdrawal_reason}</p> : null}{item.comments ? <p className="mt-3 rounded-lg bg-[#f8faf9] p-2 text-xs font-semibold text-[#4b5563]">{item.comments}</p> : null}</article>)}</div></div>)}</section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">{selected ? "Application Detail" : "New Application"}</h2>{selected ? <button className="text-sm font-black text-[#588368]" onClick={resetForm} type="button">New</button> : null}</div><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => chooseCandidate(event.target.value)} value={form.candidate_id}><option value="">Select candidate</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidateName(candidate)}{candidate.email ? ` (${candidate.email})` : ""}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, job_posting_id: event.target.value })} value={form.job_posting_id}><option value="">Select job posting</option>{postings.map((posting) => <option key={posting.id} value={posting.id}>{posting.title || "Untitled"}{posting.code ? ` (${posting.code})` : ""}</option>)}</select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, applied_at: event.target.value })} type="date" value={form.applied_at} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, current_ctc: event.target.value })} placeholder="Current CTC" type="number" value={form.current_ctc} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, expected_ctc: event.target.value })} placeholder="Expected CTC" type="number" value={form.expected_ctc} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, notice_period: event.target.value })} placeholder="Notice days" type="number" value={form.notice_period} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, source: event.target.value })} value={form.source}>{sources.map((item) => <option key={item}>{item}</option>)}</select></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, source_detail: event.target.value })} placeholder="Source detail, campaign, job board id" value={form.source_detail} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, referred_by: event.target.value })} placeholder="Referred by" value={form.referred_by} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, resume_url: event.target.value })} placeholder="Resume URL" value={form.resume_url} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, duplicate_of_application_id: event.target.value })} value={form.duplicate_of_application_id}><option value="">Not a duplicate</option>{applications.items.filter((item) => item.id !== selected?.id).map((item) => <option key={item.id} value={item.id}>{applicationCandidateName(item)} - {item.job_posting_title || "No posting"}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>{statuses.map((item) => <option key={item}>{item}</option>)}</select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, rejection_reason: event.target.value })} placeholder="Rejection reason" value={form.rejection_reason} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, withdrawal_reason: event.target.value })} placeholder="Withdrawal reason" value={form.withdrawal_reason} /><textarea className="min-h-[82px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, cover_letter: event.target.value })} placeholder="Cover letter summary" value={form.cover_letter} /><textarea className="min-h-[82px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, comments: event.target.value })} placeholder="Comments and reviewer notes" value={form.comments} /><div className="grid gap-3 sm:grid-cols-2"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.candidate_id && !form.job_posting_id} onClick={() => void save()} type="button">{selected ? "Update" : "Create"}</button>{selected ? <button className="rounded-xl border border-[#fee2e2] px-4 py-3 text-sm font-black text-[#b91c1c]" onClick={() => void deactivate(selected)} type="button">Deactivate</button> : <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Clear</button>}</div></div></section>
          {selected ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Move Stage</h2><div className="mt-4 grid gap-2">{statuses.map((next) => <button className={`rounded-xl px-4 py-3 text-sm font-black ${selected.status === next ? "bg-[#588368] text-white" : "border border-[#dbe0e5] text-[#374151]"}`} disabled={selected.status === next} key={next} onClick={() => void move(selected, next)} type="button">{next}</button>)}</div></section> : null}
          {selected ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Stage History</h2><input className="mt-4 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, move_reason: event.target.value })} placeholder="Reason for next stage move" value={form.move_reason} /><div className="mt-4 divide-y divide-[#edf1ef]">{events.length === 0 ? <p className="py-4 text-sm font-semibold text-[#6b7280]">No stage history yet.</p> : events.map((event) => <div className="py-3" key={event.id}><div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#111827]">{event.action}</strong><span className="text-xs font-bold text-[#6b7280]">{dateOnly(event.created_at)}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.from_status || "-"} to {event.to_status}</p>{event.reason ? <p className="mt-2 text-xs font-bold text-[#92400e]">{event.reason}</p> : null}{event.remarks ? <p className="mt-2 text-sm font-semibold text-[#4b5563]">{event.remarks}</p> : null}</div>)}</div></section> : null}
        </aside>
      </section>
    </main>
  );
}
