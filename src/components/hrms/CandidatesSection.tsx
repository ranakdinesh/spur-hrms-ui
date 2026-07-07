"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Candidate = { id: string; firstname?: string | null; lastname?: string | null; email?: string | null; phone?: string | null; dob?: string | null; gender?: string | null; total_experience?: number | null; current_company?: string | null; current_designation?: string | null; current_salary?: number | null; expected_salary?: number | null; notice_period?: number | null; current_location?: string | null; preferred_location?: string | null; source?: string | null; resume_url?: string | null; created_at: string };
type CandidatePage = { items: Candidate[]; total: number; limit: number; offset: number; next_offset?: number | null };

const emptyForm = { firstname: "", lastname: "", email: "", phone: "", dob: "", gender: "", total_experience: "", current_company: "", current_designation: "", current_salary: "", expected_salary: "", notice_period: "", current_location: "", preferred_location: "", source: "Career Site", resume_url: "" };
const sources = ["Career Site", "Referral", "LinkedIn", "Naukri", "Indeed", "Agency", "Walk-in", "Campus", "Other"];
const genders = ["Female", "Male", "Non-binary", "Prefer not to say"];

function fullName(candidate: Candidate) {
  return [candidate.firstname, candidate.lastname].filter(Boolean).join(" ") || "Unnamed candidate";
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function money(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(value);
}

export function CandidatesSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Candidates</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage candidate profiles and resume metadata.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Candidates</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <CandidateManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function CandidateManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [page, setPage] = useState<CandidatePage>({ items: [], total: 0, limit: 25, offset: 0 });
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [gender, setGender] = useState("");
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState<"table" | "grid">("table");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const limit = 25;

  const loadCandidates = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) params.set("search", search.trim());
    if (source) params.set("source", source);
    if (gender) params.set("gender", gender);
    try {
      setPage(await apiRequest<CandidatePage>(`${basePath}/candidates?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates.");
    }
  }, [basePath, gender, offset, search, source]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadCandidates(); }, 0); return () => window.clearTimeout(timer); }, [loadCandidates]);

  async function loadDetail(id: string) {
    const item = await apiRequest<Candidate>(`${basePath}/candidates/${id}`);
    setSelected(item);
    setForm({ firstname: item.firstname || "", lastname: item.lastname || "", email: item.email || "", phone: item.phone || "", dob: dateOnly(item.dob), gender: item.gender || "", total_experience: item.total_experience == null ? "" : String(item.total_experience), current_company: item.current_company || "", current_designation: item.current_designation || "", current_salary: item.current_salary == null ? "" : String(item.current_salary), expected_salary: item.expected_salary == null ? "" : String(item.expected_salary), notice_period: item.notice_period == null ? "" : String(item.notice_period), current_location: item.current_location || "", preferred_location: item.preferred_location || "", source: item.source || "Career Site", resume_url: item.resume_url || "" });
  }

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
  }

  function body() {
    return { firstname: form.firstname || null, lastname: form.lastname || null, email: form.email || null, phone: form.phone || null, dob: form.dob ? `${form.dob}T00:00:00Z` : null, gender: form.gender || null, total_experience: form.total_experience === "" ? null : Number(form.total_experience), current_company: form.current_company || null, current_designation: form.current_designation || null, current_salary: form.current_salary === "" ? null : Number(form.current_salary), expected_salary: form.expected_salary === "" ? null : Number(form.expected_salary), notice_period: form.notice_period === "" ? null : Number(form.notice_period), current_location: form.current_location || null, preferred_location: form.preferred_location || null, source: form.source || null, resume_url: form.resume_url || null };
  }

  async function save() {
    setError("");
    setNotice("");
    try {
      const saved = await apiRequest<Candidate>(`${basePath}/candidates${selected ? `/${selected.id}` : ""}`, { method: selected ? "PUT" : "POST", body: body() });
      setNotice(selected ? "Candidate updated." : "Candidate created.");
      await loadCandidates();
      await loadDetail(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save candidate.");
    }
  }

  async function deactivate(item: Candidate) {
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`${basePath}/candidates/${item.id}`, { method: "DELETE" });
      setNotice("Candidate deactivated.");
      resetForm();
      await loadCandidates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate candidate.");
    }
  }

  const totalWithResume = page.items.filter((item) => item.resume_url).length;
  const experienced = page.items.filter((item) => Number(item.total_experience || 0) >= 3).length;
  const sourceCount = new Set(page.items.map((item) => item.source).filter(Boolean)).size;

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Candidates` : "Candidates"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Capture candidate profiles, resume links, source, compensation expectations, and search-ready hiring details.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Candidates", value: page.total }, { label: "With Resume", value: totalWithResume }, { label: "Experienced", value: experienced }, { label: "Sources", value: sourceCount }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-3xl text-[#111827]">{item.value}</strong></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search name, email, phone, company, skill source" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setSource(event.target.value); setOffset(0); }} value={source}><option value="">All sources</option>{sources.map((item) => <option key={item}>{item}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setGender(event.target.value); setOffset(0); }} value={gender}><option value="">All genders</option>{genders.map((item) => <option key={item}>{item}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setSource(""); setGender(""); setOffset(0); }} type="button">Reset</button><button className="h-12 rounded-xl bg-[#111827] px-4 text-sm font-black text-white" onClick={() => setView(view === "table" ? "grid" : "table")} type="button">{view === "table" ? "Grid" : "Table"}</button></div></div>
          {view === "table" ? <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Candidate</th><th className="px-5 py-4">Current role</th><th className="px-5 py-4">Experience</th><th className="px-5 py-4">Compensation</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Source</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{page.items.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No candidates found.</td></tr> : page.items.map((item) => <tr className="align-top hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{fullName(item)}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.email || "No email"} - {item.phone || "No phone"}</span></td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{item.current_designation || "No designation"}<br />{item.current_company || "No company"}</td><td className="px-5 py-5 text-sm font-black text-[#111827]">{item.total_experience ?? "-"} yrs<br /><span className="text-xs text-[#6b7280]">{item.notice_period ?? "-"} days notice</span></td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">Current {money(item.current_salary)}<br />Expected {money(item.expected_salary)}</td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{item.current_location || "-"}<br />Prefers {item.preferred_location || "-"}</td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{item.source || "Unknown"}</span>{item.resume_url ? <p className="mt-2 text-xs font-bold text-[#237a45]">Resume linked</p> : null}</td><td className="px-5 py-5 text-right"><button className="rounded-xl border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => void loadDetail(item.id)} type="button">Open</button></td></tr>)}</tbody></table></div><Pager limit={limit} offset={offset} page={page} setOffset={setOffset} /></section> : <section className="grid gap-4 md:grid-cols-2">{page.items.length === 0 ? <div className="rounded-2xl border border-[#edf1ef] bg-white p-10 text-center text-sm font-semibold text-[#6b7280] md:col-span-2">No candidates found.</div> : page.items.map((item) => <article className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.id}><div className="flex items-start justify-between gap-4"><div><strong className="block text-base text-[#111827]">{fullName(item)}</strong><p className="mt-1 text-xs font-bold text-[#6b7280]">{item.current_designation || "Candidate"} - {item.current_company || "Open market"}</p></div><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{item.source || "Unknown"}</span></div><div className="mt-4 grid gap-3 text-xs font-bold text-[#6b7280] sm:grid-cols-2"><p>{item.email || "No email"}<br />{item.phone || "No phone"}</p><p>{item.total_experience ?? "-"} yrs exp<br />{item.notice_period ?? "-"} days notice</p><p>{item.current_location || "-"}<br />Prefers {item.preferred_location || "-"}</p><p>{money(item.current_salary)}<br />Expected {money(item.expected_salary)}</p></div><button className="mt-5 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void loadDetail(item.id)} type="button">Open Candidate</button></article>)}</section>}
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">{selected ? "Candidate Detail" : "New Candidate"}</h2>{selected ? <button className="text-sm font-black text-[#588368]" onClick={resetForm} type="button">New</button> : null}</div><div className="mt-5 grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, firstname: event.target.value })} placeholder="First name" value={form.firstname} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, lastname: event.target.value })} placeholder="Last name" value={form.lastname} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" type="email" value={form.email} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" value={form.phone} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, dob: event.target.value })} type="date" value={form.dob} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, gender: event.target.value })} value={form.gender}><option value="">Gender</option>{genders.map((item) => <option key={item}>{item}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, total_experience: event.target.value })} placeholder="Experience years" type="number" value={form.total_experience} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, notice_period: event.target.value })} placeholder="Notice days" type="number" value={form.notice_period} /></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, current_company: event.target.value })} placeholder="Current company" value={form.current_company} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, current_designation: event.target.value })} placeholder="Current designation" value={form.current_designation} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, current_salary: event.target.value })} placeholder="Current salary" type="number" value={form.current_salary} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, expected_salary: event.target.value })} placeholder="Expected salary" type="number" value={form.expected_salary} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, current_location: event.target.value })} placeholder="Current location" value={form.current_location} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, preferred_location: event.target.value })} placeholder="Preferred location" value={form.preferred_location} /></div><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, source: event.target.value })} value={form.source}><option value="">Source</option>{sources.map((item) => <option key={item}>{item}</option>)}</select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, resume_url: event.target.value })} placeholder="Resume URL" value={form.resume_url} /><div className="grid gap-3 sm:grid-cols-2"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.firstname.trim() && !form.lastname.trim()} onClick={() => void save()} type="button">{selected ? "Update" : "Create"}</button>{selected ? <button className="rounded-xl border border-[#fee2e2] px-4 py-3 text-sm font-black text-[#b91c1c]" onClick={() => void deactivate(selected)} type="button">Deactivate</button> : <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={resetForm} type="button">Clear</button>}</div></div></section>
        </aside>
      </section>
    </main>
  );
}

function Pager({ page, offset, limit, setOffset }: { page: CandidatePage; offset: number; limit: number; setOffset: (value: number) => void }) {
  return <div className="flex items-center justify-between border-t border-[#edf1ef] p-5"><p className="text-sm font-bold text-[#6b7280]">{page.total === 0 ? "0" : `${page.offset + 1}-${Math.min(page.offset + page.items.length, page.total)} of ${page.total}`}</p><div className="flex gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151] disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} type="button">Previous</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!page.next_offset} onClick={() => setOffset(page.next_offset || offset)} type="button">Next</button></div></div>;
}
