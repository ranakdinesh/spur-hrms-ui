"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest, API_BASE_URL } from "@/lib/api";

type Application = { id: string; candidate_firstname?: string | null; candidate_lastname?: string | null; candidate_email?: string | null; job_posting_title?: string | null; status: string };
type ApplicationPage = { items: Application[] };
type Template = { id: string; name: string; description?: string | null; subject?: string | null; body_html: string; footer_html?: string | null; locale: string; is_default: boolean; is_active: boolean };
type Offer = { id: string; application_id: string; candidate_firstname?: string | null; candidate_lastname?: string | null; candidate_email?: string | null; job_posting_title?: string | null; template_name?: string | null; template_id?: string | null; offered_ctc?: number | null; currency: string; joining_date?: string | null; valid_until_date?: string | null; status: string; version: number; is_latest: boolean; subject?: string | null; rendered_html?: string | null; signature_token?: string | null; signature_completed_at?: string | null; signer_name?: string | null; signature_hash?: string | null; candidate_rejection_reason?: string | null };
type OfferPage = { items: Offer[]; total: number };
type OfferEvent = { id: string; from_status?: string | null; to_status: string; action: string; remarks?: string | null; actor_email?: string | null; ip_address?: string | null; user_agent?: string | null; created_at: string; metadata?: Record<string, unknown> };

const statuses = ["Generated", "Sent", "Accepted", "Declined", "Revoked"];
const defaultBody = `<p>Dear {{candidate_name}},</p><p>We are pleased to offer you the position of <strong>{{job_title}}</strong>.</p><p>Your offered CTC is {{currency}} {{offered_ctc}}. Your joining date is {{joining_date}} and this offer is valid until {{valid_until}}.</p><p>Please review and sign this offer to confirm acceptance.</p>`;
const emptyTemplate = { name: "Standard Offer Letter", description: "", subject: "Offer for {{job_title}}", body_html: defaultBody, footer_html: "<p>Regards,<br/>HR Team</p>", locale: "en-IN", is_default: true, is_active: true };
const emptyOffer = { application_id: "", template_id: "", offered_ctc: "", currency: "INR", joining_date: "", valid_until_date: "", signer_email: "" };

function name(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ") || "Unnamed candidate";
}

function badge(status: string) {
  if (status === "Accepted") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "Declined" || status === "Revoked") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "Sent") return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function OfferLettersSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Offer Letters</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage offer templates, generated offers, signatures, and audit trails.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Offers</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <OfferManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function OfferManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [offers, setOffers] = useState<OfferPage>({ items: [], total: 0 });
  const [applications, setApplications] = useState<Application[]>([]);
  const [events, setEvents] = useState<OfferEvent[]>([]);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [offerForm, setOfferForm] = useState(emptyOffer);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadSetup = useCallback(async () => {
    const [templateRows, applicationPage] = await Promise.all([
      apiRequest<Template[]>(`${basePath}/offer-letter-templates`).catch(() => []),
      apiRequest<ApplicationPage>(`${basePath}/candidate-applications?limit=200`).catch(() => ({ items: [] })),
    ]);
    setTemplates(templateRows);
    setApplications(applicationPage.items || []);
  }, [basePath]);

  const loadOffers = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    setOffers(await apiRequest<OfferPage>(`${basePath}/offer-letters?${params.toString()}`));
  }, [basePath, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup().catch((err) => setError(err instanceof Error ? err.message : "Failed to load setup.")); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadOffers().catch((err) => setError(err instanceof Error ? err.message : "Failed to load offers.")); }, 0); return () => window.clearTimeout(timer); }, [loadOffers]);

  async function saveTemplate() {
    setError(""); setNotice("");
    try {
      await apiRequest<Template>(`${basePath}/offer-letter-templates`, { method: "POST", body: templateForm });
      setTemplateForm(emptyTemplate);
      setNotice("Offer template saved.");
      await loadSetup();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save template."); }
  }

  async function createOffer() {
    setError(""); setNotice("");
    try {
      const payload = { application_id: offerForm.application_id, template_id: offerForm.template_id || null, offered_ctc: offerForm.offered_ctc === "" ? null : Number(offerForm.offered_ctc), currency: offerForm.currency, joining_date: offerForm.joining_date ? `${offerForm.joining_date}T00:00:00Z` : null, valid_until_date: offerForm.valid_until_date ? `${offerForm.valid_until_date}T00:00:00Z` : null, signer_email: offerForm.signer_email || null };
      const offer = await apiRequest<Offer>(`${basePath}/offer-letters`, { method: "POST", body: payload });
      setSelectedOffer(offer);
      setOfferForm(emptyOffer);
      setNotice("Offer generated.");
      await loadOffers();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to generate offer."); }
  }

  async function setOfferStatus(offer: Offer, next: string) {
    setError(""); setNotice("");
    try {
      const updated = await apiRequest<Offer>(`${basePath}/offer-letters/${offer.id}/status`, { method: "POST", body: { status: next, reason: next === "Declined" ? offer.candidate_rejection_reason || "Declined by candidate" : null } });
      setSelectedOffer(updated);
      setNotice(`Offer marked ${next}.`);
      await loadOffers();
      await loadEvents(updated.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update offer."); }
  }

  async function loadEvents(id: string) {
    setEvents(await apiRequest<OfferEvent[]>(`${basePath}/offer-letters/${id}/events`).catch(() => []));
  }

  function openOffer(offer: Offer) {
    setSelectedOffer(offer);
    void loadEvents(offer.id);
  }

  const defaultTemplate = templates.find((item) => item.is_default);
  const signatureURL = selectedOffer?.signature_token ? `${API_BASE_URL}/hrms/offers/sign/${selectedOffer.signature_token}` : "";

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Offer Letters` : "Offer Letters"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Manage tenant-specific templates, latest offer versions, candidate signatures, and audit trails.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Offers", value: offers.total }, { label: "Sent", value: offers.items.filter((i) => i.status === "Sent").length }, { label: "Accepted", value: offers.items.filter((i) => i.status === "Accepted").length }, { label: "Templates", value: templates.length }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-3xl text-[#111827]">{item.value}</strong></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, job, subject" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setStatus(""); }} type="button">Reset</button></div></div>
          <section className="rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Candidate</th><th className="px-5 py-4">Offer</th><th className="px-5 py-4">Template</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{offers.items.map((offer) => <tr className="hover:bg-[#f8faf9]" key={offer.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{name(offer.candidate_firstname, offer.candidate_lastname)}</strong><span className="text-xs font-semibold text-[#6b7280]">{offer.job_posting_title || "No posting"}</span></td><td className="px-5 py-5 text-sm font-bold text-[#374151]">{offer.currency} {offer.offered_ctc || "-"}<span className="ml-2 text-xs text-[#6b7280]">v{offer.version}{offer.is_latest ? " latest" : ""}</span></td><td className="px-5 py-5 text-sm font-semibold text-[#6b7280]">{offer.template_name || "Custom"}</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(offer.status)}`}>{offer.status}</span></td><td className="px-5 py-5 text-right"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => openOffer(offer)} type="button">Open</button></td></tr>)}</tbody></table></div></section>
          {selectedOffer ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-black text-[#111827]">{selectedOffer.subject || "Offer Letter"}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{name(selectedOffer.candidate_firstname, selectedOffer.candidate_lastname)} - {selectedOffer.job_posting_title || "No posting"}</p></div><div className="flex flex-wrap gap-2">{statuses.filter((item) => item !== selectedOffer.status).map((item) => <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" key={item} onClick={() => void setOfferStatus(selectedOffer, item)} type="button">{item}</button>)}</div></div>{signatureURL ? <div className="mt-4 rounded-xl bg-[#f8faf9] p-3 text-xs font-bold text-[#374151]">Signature link: <span className="break-all text-[#2563eb]">{signatureURL}</span></div> : null}{selectedOffer.signature_hash ? <div className="mt-3 rounded-xl bg-[#f0fdf4] p-3 text-xs font-bold text-[#166534]">Signed by {selectedOffer.signer_name || "candidate"} on {dateOnly(selectedOffer.signature_completed_at)}. Hash {selectedOffer.signature_hash}</div> : null}<div className="prose prose-sm mt-5 max-w-none rounded-xl border border-[#edf1ef] p-4" dangerouslySetInnerHTML={{ __html: selectedOffer.rendered_html || "" }} /><h3 className="mt-6 text-sm font-black uppercase tracking-wide text-[#6b7280]">Audit trail</h3><div className="mt-3 divide-y divide-[#edf1ef]">{events.map((event) => <div className="py-3" key={event.id}><div className="flex items-center justify-between"><strong className="text-sm text-[#111827]">{event.action}</strong><span className="text-xs font-bold text-[#6b7280]">{dateOnly(event.created_at)}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.from_status || "-"} to {event.to_status}{event.ip_address ? ` - ${event.ip_address}` : ""}</p>{event.remarks ? <p className="mt-1 text-xs font-bold text-[#92400e]">{event.remarks}</p> : null}</div>)}</div></section> : null}
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Generate Offer</h2><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setOfferForm({ ...offerForm, application_id: e.target.value })} value={offerForm.application_id}><option value="">Select application</option>{applications.map((item) => <option key={item.id} value={item.id}>{name(item.candidate_firstname, item.candidate_lastname)} - {item.job_posting_title || "No posting"} - {item.status}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setOfferForm({ ...offerForm, template_id: e.target.value })} value={offerForm.template_id}><option value="">{defaultTemplate ? `Default: ${defaultTemplate.name}` : "Use default template"}</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_default ? " (default)" : ""}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setOfferForm({ ...offerForm, offered_ctc: e.target.value })} placeholder="Offered CTC" type="number" value={offerForm.offered_ctc} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setOfferForm({ ...offerForm, currency: e.target.value })} placeholder="Currency" value={offerForm.currency} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setOfferForm({ ...offerForm, joining_date: e.target.value })} type="date" value={offerForm.joining_date} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setOfferForm({ ...offerForm, valid_until_date: e.target.value })} type="date" value={offerForm.valid_until_date} /></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setOfferForm({ ...offerForm, signer_email: e.target.value })} placeholder="Signer email" value={offerForm.signer_email} /><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!offerForm.application_id} onClick={() => void createOffer()} type="button">Generate Latest Offer</button></div></section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Template</h2><div className="mt-5 grid gap-3"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Template name" value={templateForm.name} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} placeholder="Subject" value={templateForm.subject} /><textarea className="min-h-[180px] rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })} value={templateForm.body_html} /><textarea className="min-h-[80px] rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, footer_html: e.target.value })} value={templateForm.footer_html} /><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={templateForm.is_default} onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })} type="checkbox" /> Default template</label><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void saveTemplate()} type="button">Save Template</button></div></section>
        </aside>
      </section>
    </main>
  );
}
