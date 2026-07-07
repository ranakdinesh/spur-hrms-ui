"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { API_BASE_URL, apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";

type Employee = { id: string; user_id: string; employee_code?: string | null; firstname: string; lastname?: string | null; email?: string | null; department_name?: string | null; branch_name?: string | null; designation_name?: string | null };
type DocumentType = { id: string; name: string; is_required: boolean };
type Template = { id: string; letter_type: LetterType; name: string; description?: string | null; subject?: string | null; body_html: string; footer_html?: string | null; locale: string; is_default: boolean; is_active: boolean };
type EmployeeLetter = { id: string; employee_id: string; employee_code?: string | null; employee_firstname?: string | null; employee_lastname?: string | null; employee_email?: string | null; department_name?: string | null; branch_name?: string | null; designation_name?: string | null; template_id?: string | null; template_name?: string | null; document_type_id?: string | null; document_type_name?: string | null; employee_document_id?: string | null; letter_type: LetterType; subject?: string | null; rendered_html?: string | null; status: string; issue_date?: string | null; effective_date?: string | null; end_date?: string | null; pdf_path?: string | null; version: number; is_latest: boolean; signature_token?: string | null; signature_completed_at?: string | null; signer_name?: string | null; signature_hash?: string | null };
type EmployeeLetterPage = { items: EmployeeLetter[]; total: number };
type EmployeeLetterEvent = { id: string; from_status?: string | null; to_status: string; action: string; remarks?: string | null; actor_email?: string | null; ip_address?: string | null; created_at: string };
type LetterType = "appointment" | "experience" | "relieving";

const letterTypes: Array<{ value: LetterType; label: string }> = [
  { value: "appointment", label: "Appointment" },
  { value: "experience", label: "Experience" },
  { value: "relieving", label: "Relieving" },
];
const statuses = ["Generated", "Approved", "Sent", "Signed", "Revoked"];
const defaultBodies: Record<LetterType, string> = {
  appointment: "<p>Dear {{employee_name}},</p><p>We are pleased to appoint you as <strong>{{designation}}</strong> effective {{effective_date}}.</p><p>Your employee code is {{employee_code}} and your joining date is {{joining_date}}.</p>",
  experience: "<p>This is to certify that {{employee_name}} worked with us as <strong>{{designation}}</strong> from {{joining_date}} to {{end_date}}.</p><p>During this period, the employee was associated with {{department}} at {{branch}}.</p>",
  relieving: "<p>Dear {{employee_name}},</p><p>This confirms that you are relieved from your duties effective {{end_date}}.</p><p>We thank you for your contribution and wish you success.</p>",
};

const emptyTemplate = (letterType: LetterType): TemplateForm => ({ id: "", letter_type: letterType, name: `${labelType(letterType)} Letter`, description: "", subject: `${labelType(letterType)} Letter - {{employee_name}}`, body_html: defaultBodies[letterType], footer_html: "<p>Regards,<br/>HR Team</p>", locale: "en-IN", is_default: true, is_active: true });
const emptyLetter = { employee_id: "", template_id: "", document_type_id: "", letter_type: "appointment" as LetterType, issue_date: "", effective_date: "", end_date: "", signature_required: false, signer_email: "", link_document: true };
type TemplateForm = Omit<Template, "id"> & { id: string; description: string; subject: string; footer_html: string };

function labelType(value: string) {
  return letterTypes.find((item) => item.value === value)?.label || value;
}

function person(first?: string | null, last?: string | null, code?: string | null) {
  const base = [first, last].filter(Boolean).join(" ") || "Unnamed employee";
  return code ? `${base} (${code})` : base;
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function badge(status: string) {
  if (status === "Signed" || status === "Approved") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "Revoked") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "Sent") return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

function isoDate(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

export function EmployeeLettersSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employee Lifecycle</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">HR Letters</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage appointment, experience, and relieving letters.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Letters</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <LettersManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function LettersManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [letters, setLetters] = useState<EmployeeLetterPage>({ items: [], total: 0 });
  const [events, setEvents] = useState<EmployeeLetterEvent[]>([]);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate("appointment"));
  const [letterForm, setLetterForm] = useState(emptyLetter);
  const [selectedLetter, setSelectedLetter] = useState<EmployeeLetter | null>(null);
  const [status, setStatus] = useState("");
  const [letterType, setLetterType] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadSetup = useCallback(async () => {
    const [templateRows, employeeRows, docRows] = await Promise.all([
      apiRequest<Template[]>(`${basePath}/employee-letter-templates`).catch(() => []),
      apiRequest<Employee[]>(`${basePath}/employees`).catch(() => []),
      apiRequest<DocumentType[]>(`${basePath}/document-types`).catch(() => []),
    ]);
    setTemplates(templateRows);
    setEmployees(employeeRows);
    setDocumentTypes(docRows);
  }, [basePath]);

  const loadLetters = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (status) params.set("status", status);
    if (letterType) params.set("letter_type", letterType);
    if (search.trim()) params.set("search", search.trim());
    setLetters(await apiRequest<EmployeeLetterPage>(`${basePath}/employee-letters?${params.toString()}`));
  }, [basePath, letterType, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup().catch((err) => setError(err instanceof Error ? err.message : "Failed to load letter setup.")); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadLetters().catch((err) => setError(err instanceof Error ? err.message : "Failed to load letters.")); }, 0); return () => window.clearTimeout(timer); }, [loadLetters]);

  async function saveTemplate() {
    setError(""); setNotice("");
    try {
      const payload = { ...templateForm };
      const id = payload.id;
      delete (payload as Partial<TemplateForm>).id;
      if (id) await apiRequest<Template>(`${basePath}/employee-letter-templates/${id}`, { method: "PUT", body: payload });
      else await apiRequest<Template>(`${basePath}/employee-letter-templates`, { method: "POST", body: payload });
      setTemplateForm(emptyTemplate(templateForm.letter_type));
      setNotice("Letter template saved.");
      await loadSetup();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save template."); }
  }

  async function generateLetter() {
    setError(""); setNotice("");
    try {
      const payload = { employee_id: letterForm.employee_id, template_id: letterForm.template_id || null, document_type_id: letterForm.document_type_id || null, letter_type: letterForm.letter_type, issue_date: isoDate(letterForm.issue_date), effective_date: isoDate(letterForm.effective_date), end_date: isoDate(letterForm.end_date), signature_required: letterForm.signature_required, signer_email: letterForm.signer_email || null, link_document: letterForm.link_document };
      const letter = await apiRequest<EmployeeLetter>(`${basePath}/employee-letters`, { method: "POST", body: payload });
      setSelectedLetter(letter);
      setLetterForm(emptyLetter);
      setNotice("Employee letter generated.");
      await loadLetters();
      await loadSetup();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to generate letter."); }
  }

  async function setLetterStatus(letter: EmployeeLetter, next: string) {
    setError(""); setNotice("");
    try {
      const updated = await apiRequest<EmployeeLetter>(`${basePath}/employee-letters/${letter.id}/status`, { method: "POST", body: { status: next, remarks: `${next} from HR letters console` } });
      setSelectedLetter(updated);
      setNotice(`Letter marked ${next}.`);
      await loadLetters();
      await loadEvents(updated.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update letter."); }
  }

  async function downloadLetter(letter: EmployeeLetter) {
    setError(""); setNotice("");
    try {
      const { blob, filename } = await apiDownload(`${basePath}/employee-letters/${letter.id}/download`);
      saveBlobDownload(blob, filename);
      setNotice("Letter PDF downloaded.");
      await loadEvents(letter.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to download letter."); }
  }

  async function loadEvents(id: string) {
    setEvents(await apiRequest<EmployeeLetterEvent[]>(`${basePath}/employee-letters/${id}/events`).catch(() => []));
  }

  function openLetter(letter: EmployeeLetter) {
    setSelectedLetter(letter);
    void loadEvents(letter.id);
  }

  function editTemplate(template: Template) {
    setTemplateForm({ id: template.id, letter_type: template.letter_type, name: template.name, description: template.description || "", subject: template.subject || "", body_html: template.body_html, footer_html: template.footer_html || "", locale: template.locale, is_default: template.is_default, is_active: template.is_active });
  }

  const selectedTypeTemplates = templates.filter((item) => item.letter_type === letterForm.letter_type);
  const defaultTemplate = selectedTypeTemplates.find((item) => item.is_default);
  const signatureURL = selectedLetter?.signature_token ? `${API_BASE_URL}/hrms/employee-letters/sign/${selectedLetter.signature_token}` : "";

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employee Lifecycle</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} HR Letters` : "HR Letters"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Generate appointment, experience, and relieving letters with PDF storage, document linkage, signature tracking, and audit history.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Letters", value: letters.total }, { label: "Approved", value: letters.items.filter((i) => i.status === "Approved").length }, { label: "Signed", value: letters.items.filter((i) => i.status === "Signed").length }, { label: "Templates", value: templates.length }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-3xl text-[#111827]">{item.value}</strong></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, code, subject" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setLetterType(event.target.value)} value={letterType}><option value="">All types</option>{letterTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setStatus(""); setLetterType(""); }} type="button">Reset</button></div></div>
          <section className="rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Employee</th><th className="px-5 py-4">Letter</th><th className="px-5 py-4">Template</th><th className="px-5 py-4">Document</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{letters.items.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No letters found.</td></tr> : letters.items.map((letter) => <tr className="hover:bg-[#f8faf9]" key={letter.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{person(letter.employee_firstname, letter.employee_lastname, letter.employee_code)}</strong><span className="text-xs font-semibold text-[#6b7280]">{letter.department_name || "-"} / {letter.designation_name || "-"}</span></td><td className="px-5 py-5 text-sm font-bold text-[#374151]">{labelType(letter.letter_type)}<span className="ml-2 text-xs text-[#6b7280]">v{letter.version}{letter.is_latest ? " latest" : ""}</span><span className="mt-1 block text-xs text-[#6b7280]">{dateOnly(letter.issue_date) || "-"}</span></td><td className="px-5 py-5 text-sm font-semibold text-[#6b7280]">{letter.template_name || "Custom"}</td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{letter.employee_document_id ? "Linked" : "Not linked"}</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(letter.status)}`}>{letter.status}</span></td><td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => openLetter(letter)} type="button">Open</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => void downloadLetter(letter)} type="button">PDF</button></div></td></tr>)}</tbody></table></div></section>
          {selectedLetter ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-black text-[#111827]">{selectedLetter.subject || `${labelType(selectedLetter.letter_type)} Letter`}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{person(selectedLetter.employee_firstname, selectedLetter.employee_lastname, selectedLetter.employee_code)} - {selectedLetter.department_name || "No department"}</p></div><div className="flex flex-wrap gap-2">{statuses.filter((item) => item !== selectedLetter.status && !(selectedLetter.status === "Revoked" && item !== "Revoked")).map((item) => <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" key={item} onClick={() => void setLetterStatus(selectedLetter, item)} type="button">{item}</button>)}<button className="rounded-lg bg-[#588368] px-3 py-2 text-xs font-black text-white" onClick={() => void downloadLetter(selectedLetter)} type="button">Download PDF</button></div></div>{signatureURL ? <div className="mt-4 rounded-xl bg-[#f8faf9] p-3 text-xs font-bold text-[#374151]">Signature link: <span className="break-all text-[#2563eb]">{signatureURL}</span></div> : null}{selectedLetter.signature_hash ? <div className="mt-3 rounded-xl bg-[#f0fdf4] p-3 text-xs font-bold text-[#166534]">Signed by {selectedLetter.signer_name || "employee"} on {dateOnly(selectedLetter.signature_completed_at)}. Hash {selectedLetter.signature_hash}</div> : null}<div className="prose prose-sm mt-5 max-w-none rounded-xl border border-[#edf1ef] p-4" dangerouslySetInnerHTML={{ __html: selectedLetter.rendered_html || "" }} /><h3 className="mt-6 text-sm font-black uppercase tracking-wide text-[#6b7280]">Audit trail</h3><div className="mt-3 divide-y divide-[#edf1ef]">{events.map((event) => <div className="py-3" key={event.id}><div className="flex items-center justify-between"><strong className="text-sm text-[#111827]">{event.action}</strong><span className="text-xs font-bold text-[#6b7280]">{dateOnly(event.created_at)}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.from_status || "-"} to {event.to_status}{event.ip_address ? ` - ${event.ip_address}` : ""}</p>{event.remarks ? <p className="mt-1 text-xs font-bold text-[#92400e]">{event.remarks}</p> : null}</div>)}</div></section> : null}
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Generate Letter</h2><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, employee_id: e.target.value })} value={letterForm.employee_id}><option value="">Select employee</option>{employees.map((item) => <option key={item.id} value={item.id}>{person(item.firstname, item.lastname, item.employee_code)} - {item.designation_name || "No designation"}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, letter_type: e.target.value as LetterType, template_id: "" })} value={letterForm.letter_type}>{letterTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, template_id: e.target.value })} value={letterForm.template_id}><option value="">{defaultTemplate ? `Default: ${defaultTemplate.name}` : "Use default template"}</option>{selectedTypeTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_default ? " (default)" : ""}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, document_type_id: e.target.value })} value={letterForm.document_type_id}><option value="">No document type</option>{documentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_required ? " (required)" : ""}</option>)}</select><div className="grid gap-3 sm:grid-cols-3"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, issue_date: e.target.value })} type="date" value={letterForm.issue_date} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, effective_date: e.target.value })} type="date" value={letterForm.effective_date} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, end_date: e.target.value })} type="date" value={letterForm.end_date} /></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setLetterForm({ ...letterForm, signer_email: e.target.value })} placeholder="Signer email" value={letterForm.signer_email} /><label className="flex items-center gap-3 text-sm font-bold text-[#374151]"><input checked={letterForm.signature_required} onChange={(e) => setLetterForm({ ...letterForm, signature_required: e.target.checked })} type="checkbox" /> Request digital signature</label><label className="flex items-center gap-3 text-sm font-bold text-[#374151]"><input checked={letterForm.link_document} onChange={(e) => setLetterForm({ ...letterForm, link_document: e.target.checked })} type="checkbox" /> Link PDF to employee documents</label><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!letterForm.employee_id} onClick={() => void generateLetter()} type="button">Generate Latest Letter</button></div></section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">Templates</h2><button className="text-xs font-black text-[#588368]" onClick={() => setTemplateForm(emptyTemplate(templateForm.letter_type))} type="button">New</button></div><div className="mt-4 flex flex-wrap gap-2">{templates.map((item) => <button className={`rounded-full px-3 py-1 text-xs font-black ${templateForm.id === item.id ? "bg-[#588368] text-white" : "bg-[#eef4f1] text-[#588368]"}`} key={item.id} onClick={() => editTemplate(item)} type="button">{item.name}</button>)}</div><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm(emptyTemplate(e.target.value as LetterType))} value={templateForm.letter_type}>{letterTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Template name" value={templateForm.name} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} placeholder="Subject" value={templateForm.subject} /><textarea className="min-h-[180px] rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })} value={templateForm.body_html} /><textarea className="min-h-[80px] rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(e) => setTemplateForm({ ...templateForm, footer_html: e.target.value })} value={templateForm.footer_html} /><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={templateForm.is_default} onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })} type="checkbox" /> Default for type</label><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void saveTemplate()} type="button">Save Template</button></div></section>
        </aside>
      </section>
    </main>
  );
}
