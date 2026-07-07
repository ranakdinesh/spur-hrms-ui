"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { PublicCareersPage, PublicOpening } from "@/lib/public-careers";
import { apiRequest } from "@/lib/api";
import { logoSrc, publicJobPath } from "@/lib/public-careers";

type ApplyForm = {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  dob: string;
  total_experience: string;
  current_company: string;
  expected_ctc: string;
  notice_period: string;
  preferred_location: string;
  resume_url: string;
  cover_letter: string;
  consent: boolean;
};

const emptyApplyForm: ApplyForm = {
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  password: "",
  confirm_password: "",
  dob: "",
  total_experience: "",
  current_company: "",
  expected_ctc: "",
  notice_period: "",
  preferred_location: "",
  resume_url: "",
  cover_letter: "",
  consent: false,
};

export function PublicCareerSite({ page, selectedOpening }: { page: PublicCareersPage; selectedOpening?: PublicOpening | null }) {
  const [applyFor, setApplyFor] = useState<PublicOpening | null>(null);
  const [form, setForm] = useState<ApplyForm>(emptyApplyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const colors = useMemo(() => ({
    primary: page.branding?.primary_color || "#588368",
    secondary: page.branding?.secondary_color || "#e87839",
    accent: page.branding?.tertiary_color || "#f2b36d",
    ink: page.branding?.sidebar_color || "#426b53",
  }), [page.branding]);
  const logo = logoSrc(page.branding?.logo_path);
  const featured = useMemo(() => {
    const ids = new Set(page.content.featured_job_ids || []);
    const preferred = ids.size ? page.openings.filter((opening) => ids.has(opening.id)) : page.openings.slice(0, 3);
    return preferred.length ? preferred : page.openings.slice(0, 3);
  }, [page.content.featured_job_ids, page.openings]);
  const remaining = page.openings.filter((opening) => !featured.some((item) => item.id === opening.id));

  async function submitApplication() {
    if (!applyFor) return;
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/setika/applicants/apply", {
        method: "POST",
        body: {
          job_posting_id: applyFor.id,
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          phone: form.phone,
          password: form.password,
          dob: form.dob || undefined,
          total_experience: form.total_experience === "" ? undefined : Number(form.total_experience),
          current_company: form.current_company,
          expected_ctc: form.expected_ctc === "" ? undefined : Number(form.expected_ctc),
          notice_period: form.notice_period === "" ? undefined : Number(form.notice_period),
          preferred_location: form.preferred_location,
          resume_url: form.resume_url,
          cover_letter: form.cover_letter,
          consent: form.consent,
        },
      });
      setNotice("Application submitted. Sign in with this email to track the status.");
      setApplyFor(null);
      setForm(emptyApplyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit application.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#111827]" style={{ ["--career-primary" as string]: colors.primary, ["--career-secondary" as string]: colors.secondary, ["--career-accent" as string]: colors.accent }}>
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            {logo ? <img alt={page.tenant.display_name} className="h-11 w-36 object-contain object-left" src={logo} /> : <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: colors.primary }}>{page.tenant.display_name.slice(0, 1)}</span>}
            <span className="truncate text-sm font-black text-[#111827]">{page.tenant.display_name}</span>
          </Link>
          <nav className="flex items-center gap-2">
            <a className="hidden rounded-full px-4 py-2 text-sm font-black text-[#374151] hover:bg-[#f3f5f2] sm:inline-flex" href="#openings">Openings</a>
            <Link className="rounded-full px-4 py-2 text-sm font-black text-white shadow-sm" href="/login" style={{ backgroundColor: colors.primary }}>{page.content.login_button_text || "Login"}</Link>
          </nav>
        </div>
      </header>

      {selectedOpening ? (
        <JobDetailPage colors={colors} opening={selectedOpening} page={page} onApply={() => setApplyFor(selectedOpening)} />
      ) : (
        <TenantHome colors={colors} featured={featured} page={page} remaining={remaining} onApply={setApplyFor} />
      )}

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs font-bold text-[#6b7280] sm:flex-row sm:items-center sm:justify-between">
          <span>{page.tenant.display_name} careers</span>
          <span>Powered by Setika</span>
        </div>
      </footer>

      {applyFor ? <ApplyModal colors={colors} form={form} onChange={setForm} onClose={() => setApplyFor(null)} onSubmit={submitApplication} opening={applyFor} saving={saving} /> : null}
      {error ? <Toast tone="error" text={error} /> : null}
      {notice ? <Toast tone="success" text={notice} /> : null}
    </main>
  );
}

function TenantHome({ colors, featured, onApply, page, remaining }: { colors: ColorSet; featured: PublicOpening[]; onApply: (opening: PublicOpening) => void; page: PublicCareersPage; remaining: PublicOpening[] }) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(135deg, ${colors.ink}, ${colors.primary})` }} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f7f8f3] to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:py-16">
          <div className="text-white">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/70">{page.openings.length} active openings</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{page.content.headline}</h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/82">{page.content.welcome_message || page.content.about}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-lg" href="#openings" style={{ color: colors.primary }}>{page.content.candidate_cta || "View openings"}</a>
              <Link className="rounded-full border border-white/25 px-5 py-3 text-sm font-black text-white" href="/login">Login</Link>
            </div>
          </div>
          <div className="grid content-start gap-3">
            {(page.content.notices || []).slice(0, 3).map((notice) => <div className="rounded-2xl border border-white/12 bg-white/12 p-4 text-sm font-bold leading-6 text-white shadow-xl backdrop-blur" key={notice}>{notice}</div>)}
            <div className="rounded-3xl bg-white p-5 shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: colors.accent }}>Featured opening</p>
              {featured[0] ? <JobCard compact colors={colors} opening={featured[0]} onApply={onApply} /> : <p className="mt-4 text-sm font-bold text-[#6b7280]">Openings will appear here when HR publishes jobs.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">About {page.tenant.display_name}</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-[#4b5563]">{page.content.about}</p>
          </div>
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#111827]">HR values</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {page.content.core_values.map((value) => <span className="rounded-full bg-[#f1f5f2] px-4 py-2 text-xs font-black text-[#374151]" key={value}>{value}</span>)}
            </div>
          </div>
        </div>

        <div id="openings" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: colors.primary }}>Current openings</p>
              <h2 className="mt-2 text-3xl font-black text-[#111827]">Apply directly</h2>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#4b5563] shadow-sm">{page.openings.length} jobs</span>
          </div>
          {page.openings.length === 0 ? <div className="rounded-3xl border border-dashed border-[#cbd5d1] bg-white p-8 text-sm font-bold text-[#6b7280]">No openings are published right now.</div> : [...featured, ...remaining].map((opening) => <JobCard colors={colors} key={opening.id} opening={opening} onApply={onApply} />)}
        </div>
      </section>
    </>
  );
}

function JobDetailPage({ colors, opening, onApply, page }: { colors: ColorSet; opening: PublicOpening; onApply: () => void; page: PublicCareersPage }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-8">
        <Link className="text-sm font-black" href="/" style={{ color: colors.primary }}>Back to openings</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.22em]" style={{ color: colors.accent }}>{opening.department_name || opening.job_category || "Opening"}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-[#111827] md:text-5xl">{opening.title}</h1>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-[#4b5563]">
          {[opening.employment_type_name, opening.work_mode, experience(opening), salary(opening)].filter(Boolean).map((item) => <span className="rounded-full bg-[#f3f5f2] px-3 py-1" key={item}>{item}</span>)}
        </div>
        {opening.job_summary ? <p className="mt-6 rounded-2xl bg-[#f8faf9] p-5 text-base font-bold leading-8 text-[#374151]">{opening.job_summary}</p> : null}
        <div className="prose prose-sm mt-7 max-w-none whitespace-pre-line font-semibold leading-8 text-[#4b5563]">{opening.description || "The complete job description is being finalized."}</div>
      </article>
      <aside className="h-fit rounded-3xl border border-black/5 bg-white p-5 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-lg font-black text-[#111827]">Apply for this role</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#6b7280]">Create an applicant account and track your application from this portal.</p>
        <button className="mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black text-white shadow-sm" onClick={onApply} style={{ backgroundColor: colors.primary }} type="button">Apply Now</button>
        <div className="mt-5 rounded-2xl bg-[#f8faf9] p-4 text-xs font-bold leading-6 text-[#6b7280]">
          <strong className="block text-[#111827]">{page.tenant.display_name}</strong>
          {opening.expiry_date ? <span>Apply before {new Date(opening.expiry_date).toLocaleDateString("en-IN")}</span> : <span>Applications are open.</span>}
        </div>
      </aside>
    </section>
  );
}

function JobCard({ colors, compact = false, onApply, opening }: { colors: ColorSet; compact?: boolean; onApply: (opening: PublicOpening) => void; opening: PublicOpening }) {
  return (
    <article className={`group rounded-3xl border border-black/5 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${compact ? "mt-4 p-0 shadow-none" : "p-5"}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: colors.accent }}>{opening.department_name || opening.job_category || "Hiring"}</span>
          <h3 className="mt-2 text-2xl font-black text-[#111827]">{opening.title}</h3>
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-[#6b7280]">{opening.job_summary || opening.description || "View the full role details and apply."}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[#4b5563]">
            {[opening.employment_type_name, opening.work_mode, experience(opening), salary(opening)].filter(Boolean).map((item) => <span className="rounded-full bg-[#f3f5f2] px-3 py-1" key={item}>{item}</span>)}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col">
          <Link className="rounded-xl px-4 py-3 text-center text-sm font-black text-white" href={publicJobPath(opening)} style={{ backgroundColor: colors.primary }}>View JD</Link>
          <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => onApply(opening)} type="button">Apply</button>
        </div>
      </div>
    </article>
  );
}

function ApplyModal({ colors, form, onChange, onClose, onSubmit, opening, saving }: { colors: ColorSet; form: ApplyForm; onChange: (form: ApplyForm) => void; onClose: () => void; onSubmit: () => void; opening: PublicOpening; saving: boolean }) {
  const input = "h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1ef] p-6">
          <div><p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: colors.primary }}>Apply</p><h2 className="mt-2 text-2xl font-black text-[#111827]">{opening.title}</h2></div>
          <button className="rounded-full border border-[#dbe0e5] px-3 py-1 text-xl font-black text-[#6b7280]" onClick={onClose} type="button">x</button>
        </div>
        <div className="max-h-[calc(92vh-170px)] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input className={input} onChange={(event) => onChange({ ...form, firstname: event.target.value })} placeholder="First name" value={form.firstname} />
            <input className={input} onChange={(event) => onChange({ ...form, lastname: event.target.value })} placeholder="Last name" value={form.lastname} />
            <input className={input} onChange={(event) => onChange({ ...form, email: event.target.value })} placeholder="Email" type="email" value={form.email} />
            <input className={input} onChange={(event) => onChange({ ...form, phone: event.target.value })} placeholder="Phone" value={form.phone} />
            <input className={input} onChange={(event) => onChange({ ...form, password: event.target.value })} placeholder="Create password" type="password" value={form.password} />
            <input className={input} onChange={(event) => onChange({ ...form, confirm_password: event.target.value })} placeholder="Confirm password" type="password" value={form.confirm_password} />
            <input className={input} onChange={(event) => onChange({ ...form, dob: event.target.value })} type="date" value={form.dob} />
            <input className={input} min="0" onChange={(event) => onChange({ ...form, total_experience: event.target.value })} placeholder="Experience in years" type="number" value={form.total_experience} />
            <input className={input} onChange={(event) => onChange({ ...form, current_company: event.target.value })} placeholder="Current company" value={form.current_company} />
            <input className={input} onChange={(event) => onChange({ ...form, preferred_location: event.target.value })} placeholder="Preferred location" value={form.preferred_location} />
            <input className={input} min="0" onChange={(event) => onChange({ ...form, expected_ctc: event.target.value })} placeholder="Expected CTC" type="number" value={form.expected_ctc} />
            <input className={input} min="0" onChange={(event) => onChange({ ...form, notice_period: event.target.value })} placeholder="Notice period days" type="number" value={form.notice_period} />
          </div>
          <input className={`${input} mt-4 w-full`} onChange={(event) => onChange({ ...form, resume_url: event.target.value })} placeholder="Resume link" value={form.resume_url} />
          <textarea className="mt-4 min-h-28 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange({ ...form, cover_letter: event.target.value })} placeholder="Cover letter / short note" value={form.cover_letter} />
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#dbe0e5] bg-[#f8faf9] p-4 text-sm font-semibold leading-6 text-[#374151]">
            <input className="mt-1 h-4 w-4 accent-[#588368]" checked={form.consent} onChange={(event) => onChange({ ...form, consent: event.target.checked })} type="checkbox" />
            <span>I agree that this tenant can process my profile and application details for recruitment.</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#edf1ef] p-5">
          <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-xl px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={saving || !form.firstname.trim() || !form.lastname.trim() || !form.email.trim() || !form.password.trim() || !form.consent} onClick={onSubmit} style={{ backgroundColor: colors.primary }} type="button">{saving ? "Submitting..." : "Submit Application"}</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ text, tone }: { text: string; tone: "error" | "success" }) {
  const cls = tone === "error" ? "border-[#fecaca] text-[#b91c1c]" : "border-[#bbf7d0] text-[#166534]";
  return <div className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border bg-white px-5 py-3 text-sm font-bold shadow-xl ${cls}`}>{text}</div>;
}

type ColorSet = { primary: string; secondary: string; accent: string; ink: string };

function salary(opening: PublicOpening) {
  if (!opening.is_salary_visible || opening.min_salary == null || opening.max_salary == null) return "";
  const currency = opening.salary_currency || "INR";
  const format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency });
  return `${format.format(opening.min_salary)} - ${format.format(opening.max_salary)}${opening.salary_period ? ` / ${opening.salary_period}` : ""}`;
}

function experience(opening: PublicOpening) {
  if (opening.min_experience == null && opening.max_experience == null) return "";
  if (opening.min_experience != null && opening.max_experience != null) return `${opening.min_experience}-${opening.max_experience} yrs`;
  if (opening.min_experience != null) return `${opening.min_experience}+ yrs`;
  return `Up to ${opening.max_experience} yrs`;
}
