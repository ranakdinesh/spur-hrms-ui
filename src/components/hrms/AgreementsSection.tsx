"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { API_BASE_URL, apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";

type AgreementType = "sow" | "nda" | "retainer" | "freelance_contract" | "internship_letter" | "amendment";
type AgreementStatus = "Generated" | "Approved" | "Sent" | "Signed" | "Revoked";
type TabKey = "agreements" | "templates";

type AgreementTemplate = {
  id: string;
  agreement_type: AgreementType;
  name: string;
  description?: string | null;
  subject?: string | null;
  body_html: string;
  footer_html?: string | null;
  locale: string;
  is_default: boolean;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
};

type Agreement = {
  id: string;
  agreement_type: AgreementType;
  title: string;
  template_id?: string | null;
  template_name?: string | null;
  worker_profile_id?: string | null;
  worker_display_name?: string | null;
  worker_code?: string | null;
  engagement_id?: string | null;
  engagement_title?: string | null;
  engagement_code?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  subject?: string | null;
  rendered_html?: string | null;
  status: AgreementStatus;
  issue_date?: string | null;
  effective_date?: string | null;
  end_date?: string | null;
  pdf_path?: string | null;
  version: number;
  is_latest: boolean;
  signature_token?: string | null;
  signature_completed_at?: string | null;
  signer_name?: string | null;
  signer_email?: string | null;
  signature_hash?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AgreementEvent = { id: string; from_status?: string | null; to_status: string; action: string; remarks?: string | null; actor_email?: string | null; ip_address?: string | null; created_at: string };
type Worker = { id: string; display_name: string; worker_code?: string | null; email?: string | null };
type Engagement = { id: string; title: string; worker_display_name?: string; engagement_code?: string | null };
type Project = { id: string; name: string; project_code?: string | null };
type TenantSortKey = "name" | "status" | "plan" | "joined";

type TemplateForm = {
  id: string;
  agreement_type: AgreementType;
  name: string;
  description: string;
  subject: string;
  body_html: string;
  footer_html: string;
  locale: string;
  is_default: boolean;
  is_active: boolean;
  metadata: string;
};

type AgreementForm = {
  agreement_type: AgreementType;
  title: string;
  template_id: string;
  worker_profile_id: string;
  engagement_id: string;
  project_id: string;
  subject: string;
  rendered_html: string;
  issue_date: string;
  effective_date: string;
  end_date: string;
  signature_required: boolean;
  signer_email: string;
  metadata: string;
};

const agreementTypes: Array<{ value: AgreementType; label: string }> = [
  { value: "sow", label: "SOW" },
  { value: "nda", label: "NDA" },
  { value: "retainer", label: "Retainer" },
  { value: "freelance_contract", label: "Freelance" },
  { value: "internship_letter", label: "Internship" },
  { value: "amendment", label: "Amendment" },
];
const statuses: AgreementStatus[] = ["Generated", "Approved", "Sent", "Signed", "Revoked"];
const defaultBodies: Record<AgreementType, string> = {
  sow: "<p>This Statement of Work is issued for {{worker_name}} for {{project_name}} under {{engagement_title}}.</p><p>The effective period starts on {{effective_date}} and ends on {{end_date}}.</p>",
  nda: "<p>{{worker_name}} agrees to protect confidential information received during engagement {{engagement_code}}.</p>",
  retainer: "<p>{{worker_name}} is retained for services connected with {{project_name}} from {{effective_date}}.</p>",
  freelance_contract: "<p>This freelance agreement is between the company and {{worker_name}} for {{engagement_title}}.</p>",
  internship_letter: "<p>This internship letter confirms {{worker_name}} as an intern effective {{effective_date}}.</p>",
  amendment: "<p>This amendment modifies agreement terms for {{worker_name}} and {{project_name}} effective {{effective_date}}.</p>",
};

const emptyTemplate = (type: AgreementType): TemplateForm => ({
  id: "",
  agreement_type: type,
  name: `${typeLabel(type)} Template`,
  description: "",
  subject: `${typeLabel(type)} - {{worker_name}}`,
  body_html: defaultBodies[type],
  footer_html: "<p>Regards,<br/>Authorized Signatory</p>",
  locale: "en-IN",
  is_default: true,
  is_active: true,
  metadata: "{\n  \"source\": \"agreements\"\n}",
});

const emptyAgreement: AgreementForm = {
  agreement_type: "sow",
  title: "",
  template_id: "",
  worker_profile_id: "",
  engagement_id: "",
  project_id: "",
  subject: "",
  rendered_html: "",
  issue_date: "",
  effective_date: "",
  end_date: "",
  signature_required: true,
  signer_email: "",
  metadata: "{\n  \"source\": \"agreements\"\n}",
};

function typeLabel(value: string) {
  return agreementTypes.find((item) => item.value === value)?.label || value.replaceAll("_", " ");
}

function dateForInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function isoDate(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function parseJSONObject(value: string) {
  const parsed = value.trim() ? JSON.parse(value) : {};
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Metadata must be a JSON object.");
  return parsed as Record<string, unknown>;
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function prettyJSON(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  return JSON.stringify(value, null, 2);
}

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function templateToForm(item: AgreementTemplate): TemplateForm {
  return {
    id: item.id,
    agreement_type: item.agreement_type,
    name: item.name,
    description: item.description || "",
    subject: item.subject || "",
    body_html: item.body_html,
    footer_html: item.footer_html || "",
    locale: item.locale || "en-IN",
    is_default: item.is_default,
    is_active: item.is_active,
    metadata: prettyJSON(item.metadata, emptyTemplate(item.agreement_type).metadata),
  };
}

export function AgreementsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantSort, setTenantSort] = useState<TenantSortKey>("name");

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tenant) => tenant.kind !== "ops")
      .filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.subdomainUrl, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => tenantSortValue(a, tenantSort).localeCompare(tenantSortValue(b, tenantSort)));
  }, [tenantSearch, tenantSort, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8"><h1 className="text-4xl font-bold tracking-tight text-[#111827]">Agreements</h1></div>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
              <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}>
                <option value="name">Sort by name</option><option value="status">Sort by status</option><option value="plan">Sort by plan</option><option value="joined">Sort by joined</option>
              </select>
            </div>
          </div>
          {tenantsError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr> : filteredTenants.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No tenants match your search.</td></tr> : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} / {tenant.kind}</span></td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <AgreementsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function AgreementsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<AgreementEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("agreements");
  const [search, setSearch] = useState("");
  const [agreementType, setAgreementType] = useState("");
  const [status, setStatus] = useState("");
  const [templateModal, setTemplateModal] = useState<{ open: boolean; editing: AgreementTemplate | null }>({ open: false, editing: null });
  const [agreementModal, setAgreementModal] = useState(false);
  const [detail, setDetail] = useState<Agreement | null>(null);
  const [statusTarget, setStatusTarget] = useState<Agreement | null>(null);
  const [nextStatus, setNextStatus] = useState<AgreementStatus>("Approved");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate("sow"));
  const [agreementForm, setAgreementForm] = useState<AgreementForm>(emptyAgreement);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (agreementType) params.set("agreement_type", agreementType);
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const [agreementRows, templateRows, workerRows, engagementRows, projectRows] = await Promise.all([
        apiRequest<Agreement[]>(`${basePath}/agreements${suffix}`),
        apiRequest<AgreementTemplate[]>(`${basePath}/agreement-templates`),
        apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
        apiRequest<Engagement[]>(`${basePath}/engagements`).catch(() => []),
        apiRequest<Project[]>(`${basePath}/projects`).catch(() => []),
      ]);
      setAgreements(agreementRows);
      setTemplates(templateRows);
      setWorkers(workerRows);
      setEngagements(engagementRows);
      setProjects(projectRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load agreements.");
    } finally {
      setLoading(false);
    }
  }, [agreementType, basePath, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const summary = useMemo(() => ({
    total: agreements.length,
    sent: agreements.filter((item) => item.status === "Sent").length,
    signed: agreements.filter((item) => item.status === "Signed").length,
    templates: templates.length,
  }), [agreements, templates]);

  function openTemplateCreate(type: AgreementType = "sow") {
    setTemplateForm(emptyTemplate(type));
    setTemplateModal({ open: true, editing: null });
  }

  function openTemplateEdit(item: AgreementTemplate) {
    setTemplateForm(templateToForm(item));
    setTemplateModal({ open: true, editing: item });
  }

  function openAgreementCreate() {
    const type = (agreementType as AgreementType) || "sow";
    setAgreementForm({ ...emptyAgreement, agreement_type: type });
    setAgreementModal(true);
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!templateForm.name.trim()) throw new Error("Template name is required.");
      if (!templateForm.body_html.trim()) throw new Error("Template body is required.");
      const payload = {
        agreement_type: templateForm.agreement_type,
        name: templateForm.name.trim(),
        description: optionalString(templateForm.description),
        subject: optionalString(templateForm.subject),
        body_html: templateForm.body_html,
        footer_html: optionalString(templateForm.footer_html),
        locale: templateForm.locale || "en-IN",
        is_default: templateForm.is_default,
        is_active: templateForm.is_active,
        metadata: parseJSONObject(templateForm.metadata),
      };
      if (templateModal.editing) {
        await apiRequest<AgreementTemplate>(`${basePath}/agreement-templates/${templateModal.editing.id}`, { method: "PUT", body: payload });
        setMessage("Agreement template updated.");
      } else {
        await apiRequest<AgreementTemplate>(`${basePath}/agreement-templates`, { method: "POST", body: payload });
        setMessage("Agreement template created.");
      }
      setTemplateModal({ open: false, editing: null });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template.");
    } finally {
      setSaving(false);
    }
  }

  async function generateAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!agreementForm.title.trim()) throw new Error("Agreement title is required.");
      const payload = {
        agreement_type: agreementForm.agreement_type,
        title: agreementForm.title.trim(),
        template_id: optionalString(agreementForm.template_id),
        worker_profile_id: optionalString(agreementForm.worker_profile_id),
        engagement_id: optionalString(agreementForm.engagement_id),
        project_id: optionalString(agreementForm.project_id),
        subject: optionalString(agreementForm.subject),
        rendered_html: optionalString(agreementForm.rendered_html),
        issue_date: isoDate(agreementForm.issue_date),
        effective_date: isoDate(agreementForm.effective_date),
        end_date: isoDate(agreementForm.end_date),
        signature_required: agreementForm.signature_required,
        signer_email: optionalString(agreementForm.signer_email),
        metadata: parseJSONObject(agreementForm.metadata),
      };
      const created = await apiRequest<Agreement>(`${basePath}/agreements`, { method: "POST", body: payload });
      setMessage("Agreement generated.");
      setAgreementModal(false);
      setDetail(created);
      await loadData();
      await loadEvents(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate agreement.");
    } finally {
      setSaving(false);
    }
  }

  async function loadEvents(id: string) {
    setEvents(await apiRequest<AgreementEvent[]>(`${basePath}/agreements/${id}/events`).catch(() => []));
  }

  function openDetail(item: Agreement) {
    setDetail(item);
    void loadEvents(item.id);
  }

  function openStatus(item: Agreement, statusValue: AgreementStatus) {
    setStatusTarget(item);
    setNextStatus(statusValue);
    setStatusRemarks("");
  }

  async function saveStatus() {
    if (!statusTarget) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest<Agreement>(`${basePath}/agreements/${statusTarget.id}/status`, { method: "POST", body: { status: nextStatus, remarks: optionalString(statusRemarks) } });
      setMessage(`Agreement marked ${nextStatus}.`);
      setStatusTarget(null);
      setDetail(updated);
      await loadData();
      await loadEvents(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update agreement.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadAgreement(item: Agreement) {
    setError("");
    setMessage("");
    try {
      const { blob, filename } = await apiDownload(`${basePath}/agreements/${item.id}/download`);
      saveBlobDownload(blob, filename);
      setMessage("Agreement PDF downloaded.");
      await loadEvents(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download agreement.");
    }
  }

  async function deleteTemplate(item: AgreementTemplate) {
    if (!window.confirm(`Deactivate template ${item.name}?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<void>(`${basePath}/agreement-templates/${item.id}`, { method: "DELETE" });
      setMessage("Agreement template deactivated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete template.");
    } finally {
      setSaving(false);
    }
  }

  const selectedTypeTemplates = templates.filter((item) => item.agreement_type === agreementForm.agreement_type && item.is_active);
  const defaultTemplate = selectedTypeTemplates.find((item) => item.is_default);

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">Back to tenants</button> : null}
          <div className="flex items-center gap-2"><h1 className="text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Agreements` : "Agreements"}</h1><InfoButton text="Use templates for SOW, NDA, retainer, freelance, internship, and amendment documents. Lifecycle events keep a tenant-scoped audit trail." /></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151] hover:border-[#588368]" onClick={() => openTemplateCreate()} type="button">New Template</button>
          <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openAgreementCreate} type="button">Generate Agreement</button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Agreements" value={summary.total} />
        <SummaryCard label="Sent" value={summary.sent} />
        <SummaryCard label="Signed" value={summary.signed} />
        <SummaryCard label="Templates" value={summary.templates} />
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="border-b border-[#edf1ef] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2"><h2 className="text-lg font-black text-[#111827]">Agreement Lifecycle</h2><InfoButton text="Generated agreements can be approved, sent, signed, or revoked. PDF downloads render tenant-owned agreement artifacts." /></div>
            <div className="flex flex-wrap gap-2">
              <TabButton active={activeTab === "agreements"} onClick={() => setActiveTab("agreements")}>Agreements</TabButton>
              <TabButton active={activeTab === "templates"} onClick={() => setActiveTab("templates")}>Templates</TabButton>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search title, worker, project" value={search} />
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setAgreementType(event.target.value)} value={agreementType}>
              <option value="">All types</option>{agreementTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>

        {activeTab === "agreements" ? (
          <AgreementsTable agreements={agreements} loading={loading} onDownload={downloadAgreement} onOpen={openDetail} onStatus={openStatus} />
        ) : (
          <TemplatesTable loading={loading} onDelete={deleteTemplate} onEdit={openTemplateEdit} templates={templates} />
        )}
      </section>

      <HrmsModal onClose={() => setTemplateModal({ open: false, editing: null })} open={templateModal.open} title={templateModal.editing ? "Edit Agreement Template" : "New Agreement Template"}>
        <form className="grid gap-5" onSubmit={saveTemplate}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormSelect label="Type" onChange={(value) => setTemplateForm(emptyTemplate(value as AgreementType))} value={templateForm.agreement_type}>{agreementTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</FormSelect>
            <FormInput label="Template name" onChange={(value) => setTemplateForm((current) => ({ ...current, name: value }))} required value={templateForm.name} />
            <FormInput label="Subject" onChange={(value) => setTemplateForm((current) => ({ ...current, subject: value }))} value={templateForm.subject} />
            <FormInput label="Locale" onChange={(value) => setTemplateForm((current) => ({ ...current, locale: value }))} value={templateForm.locale} />
          </div>
          <Textarea label="Description" onChange={(value) => setTemplateForm((current) => ({ ...current, description: value }))} value={templateForm.description} />
          <Textarea help="Supported placeholders include worker, engagement, project, title, type, and date fields." label="Body HTML" mono onChange={(value) => setTemplateForm((current) => ({ ...current, body_html: value }))} value={templateForm.body_html} />
          <Textarea label="Footer HTML" mono onChange={(value) => setTemplateForm((current) => ({ ...current, footer_html: value }))} value={templateForm.footer_html} />
          <Textarea help="JSON object for searchable metadata such as template family, source, or legal owner." label="Metadata" mono onChange={(value) => setTemplateForm((current) => ({ ...current, metadata: value }))} value={templateForm.metadata} />
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={templateForm.is_default} onChange={(event) => setTemplateForm((current) => ({ ...current, is_default: event.target.checked }))} type="checkbox" /> Default for type</label>
            <label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={templateForm.is_active} onChange={(event) => setTemplateForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" /> Active</label>
          </div>
          <ModalActions saving={saving} onCancel={() => setTemplateModal({ open: false, editing: null })} submitLabel="Save Template" />
        </form>
      </HrmsModal>

      <HrmsModal onClose={() => setAgreementModal(false)} open={agreementModal} title="Generate Agreement">
        <form className="grid gap-5" onSubmit={generateAgreement}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormSelect label="Type" onChange={(value) => setAgreementForm((current) => ({ ...current, agreement_type: value as AgreementType, template_id: "" }))} value={agreementForm.agreement_type}>{agreementTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</FormSelect>
            <FormInput label="Title" onChange={(value) => setAgreementForm((current) => ({ ...current, title: value }))} required value={agreementForm.title} />
            <FormSelect label="Template" onChange={(value) => setAgreementForm((current) => ({ ...current, template_id: value }))} value={agreementForm.template_id}><option value="">{defaultTemplate ? `Default: ${defaultTemplate.name}` : "Use default template"}</option>{selectedTypeTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_default ? " (default)" : ""}</option>)}</FormSelect>
            <FormSelect label="Worker" onChange={(value) => setAgreementForm((current) => ({ ...current, worker_profile_id: value }))} value={agreementForm.worker_profile_id}><option value="">No worker</option>{workers.map((item) => <option key={item.id} value={item.id}>{item.display_name}{item.worker_code ? ` (${item.worker_code})` : ""}</option>)}</FormSelect>
            <FormSelect label="Engagement" onChange={(value) => setAgreementForm((current) => ({ ...current, engagement_id: value }))} value={agreementForm.engagement_id}><option value="">No engagement</option>{engagements.map((item) => <option key={item.id} value={item.id}>{item.title}{item.worker_display_name ? ` - ${item.worker_display_name}` : ""}</option>)}</FormSelect>
            <FormSelect label="Project" onChange={(value) => setAgreementForm((current) => ({ ...current, project_id: value }))} value={agreementForm.project_id}><option value="">No project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.project_code ? ` (${item.project_code})` : ""}</option>)}</FormSelect>
            <FormInput label="Issue date" onChange={(value) => setAgreementForm((current) => ({ ...current, issue_date: value }))} type="date" value={agreementForm.issue_date} />
            <FormInput label="Effective date" onChange={(value) => setAgreementForm((current) => ({ ...current, effective_date: value }))} type="date" value={agreementForm.effective_date} />
            <FormInput label="End date" onChange={(value) => setAgreementForm((current) => ({ ...current, end_date: value }))} type="date" value={agreementForm.end_date} />
            <FormInput label="Signer email" onChange={(value) => setAgreementForm((current) => ({ ...current, signer_email: value }))} value={agreementForm.signer_email} />
          </div>
          <FormInput label="Subject override" onChange={(value) => setAgreementForm((current) => ({ ...current, subject: value }))} value={agreementForm.subject} />
          <Textarea help="Use only when generating a custom body without a template." label="Rendered HTML override" mono onChange={(value) => setAgreementForm((current) => ({ ...current, rendered_html: value }))} value={agreementForm.rendered_html} />
          <Textarea help="JSON object for cost center, vendor reference, legal review state, or import source." label="Metadata" mono onChange={(value) => setAgreementForm((current) => ({ ...current, metadata: value }))} value={agreementForm.metadata} />
          <label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={agreementForm.signature_required} onChange={(event) => setAgreementForm((current) => ({ ...current, signature_required: event.target.checked }))} type="checkbox" /> Request signature token</label>
          <ModalActions saving={saving} onCancel={() => setAgreementModal(false)} submitLabel="Generate Agreement" />
        </form>
      </HrmsModal>

      <HrmsModal onClose={() => setStatusTarget(null)} open={Boolean(statusTarget)} title="Update Agreement Status">
        <div className="grid gap-5">
          <FormSelect label="Status" onChange={(value) => setNextStatus(value as AgreementStatus)} value={nextStatus}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</FormSelect>
          <Textarea label="Remarks" onChange={setStatusRemarks} value={statusRemarks} />
          <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
            <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setStatusTarget(null)} type="button">Cancel</button>
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveStatus} type="button">{saving ? "Saving..." : "Save Status"}</button>
          </div>
        </div>
      </HrmsModal>

      <HrmsModal onClose={() => setDetail(null)} open={Boolean(detail)} title={detail?.title || "Agreement"}>
        {detail ? <AgreementDetail agreement={detail} events={events} onDownload={() => void downloadAgreement(detail)} onStatus={(statusValue) => openStatus(detail, statusValue)} /> : null}
      </HrmsModal>
    </div>
  );
}

function AgreementsTable({ agreements, loading, onOpen, onDownload, onStatus }: { agreements: Agreement[]; loading: boolean; onOpen: (item: Agreement) => void; onDownload: (item: Agreement) => void; onStatus: (item: Agreement, status: AgreementStatus) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-left">
        <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Agreement</th><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Links</th><th className="px-5 py-4">Dates</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-[#edf1ef]">
          {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading agreements...</td></tr> : agreements.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No agreements found.</td></tr> : agreements.map((item) => (
            <tr className="hover:bg-[#f8faf9]" key={item.id}>
              <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.title}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{typeLabel(item.agreement_type)} / v{item.version}{item.is_latest ? " latest" : ""}</span></td>
              <td className="px-5 py-5"><span className="text-sm font-bold text-[#374151]">{item.worker_display_name || "No worker"}</span><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.worker_code || item.signer_email || "-"}</span></td>
              <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{item.engagement_title || item.project_name || "-"}<span className="mt-1 block text-xs text-[#6b7280]">{item.template_name || "No template"}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.effective_date)}<span className="block text-xs font-semibold text-[#6b7280]">Ends {formatDate(item.end_date)}</span></td>
              <td className="px-5 py-5"><StatusChip value={item.status} /></td>
              <td className="px-5 py-5 text-right"><div className="flex flex-wrap justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => onOpen(item)} type="button">Open</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => void onDownload(item)} type="button">PDF</button>{item.status !== "Signed" && item.status !== "Revoked" ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => onStatus(item, item.status === "Generated" ? "Approved" : item.status === "Approved" ? "Sent" : "Revoked")} type="button">Status</button> : null}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplatesTable({ templates, loading, onEdit, onDelete }: { templates: AgreementTemplate[]; loading: boolean; onEdit: (item: AgreementTemplate) => void; onDelete: (item: AgreementTemplate) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-left">
        <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Template</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Subject</th><th className="px-5 py-4">State</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-[#edf1ef]">
          {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading templates...</td></tr> : templates.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No templates found.</td></tr> : templates.map((item) => (
            <tr className="hover:bg-[#f8faf9]" key={item.id}>
              <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.description || "No description"}</span></td>
              <td className="px-5 py-5 text-sm font-bold text-[#374151]">{typeLabel(item.agreement_type)}</td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{item.subject || "-"}</td>
              <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-black text-[#588368]">{item.is_default ? "Default" : "Custom"}</span><span className="ml-2 rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-black text-[#4b5563]">{item.is_active ? "Active" : "Inactive"}</span></td>
              <td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => onEdit(item)} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-700" onClick={() => void onDelete(item)} type="button">Delete</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgreementDetail({ agreement, events, onDownload, onStatus }: { agreement: Agreement; events: AgreementEvent[]; onDownload: () => void; onStatus: (status: AgreementStatus) => void }) {
  const signatureURL = agreement.signature_token ? `${API_BASE_URL}/hrms/agreements/sign/${agreement.signature_token}` : "";
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-sm font-bold text-[#588368]">{typeLabel(agreement.agreement_type)} / {agreement.status}</p><h3 className="mt-1 text-2xl font-black text-[#111827]">{agreement.title}</h3><p className="mt-1 text-sm font-semibold text-[#6b7280]">{agreement.worker_display_name || "No worker"} / {agreement.project_name || agreement.engagement_title || "No project"}</p></div>
        <div className="flex flex-wrap gap-2"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onDownload} type="button">Download PDF</button>{statuses.filter((item) => item !== agreement.status && agreement.status !== "Signed" && agreement.status !== "Revoked").map((item) => <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" key={item} onClick={() => onStatus(item)} type="button">{item}</button>)}</div>
      </div>
      {signatureURL ? <div className="rounded-xl bg-[#f8faf9] p-3 text-xs font-bold text-[#374151]">Signature link: <span className="break-all text-[#2563eb]">{signatureURL}</span></div> : null}
      {agreement.signature_hash ? <div className="rounded-xl bg-[#f0fdf4] p-3 text-xs font-bold text-[#166534]">Signed by {agreement.signer_name || agreement.signer_email || "signer"} on {formatDate(agreement.signature_completed_at)}. Hash {agreement.signature_hash}</div> : null}
      <div className="prose prose-sm max-w-none rounded-xl border border-[#edf1ef] p-4" dangerouslySetInnerHTML={{ __html: agreement.rendered_html || "" }} />
      <section>
        <h3 className="text-sm font-black uppercase tracking-wide text-[#6b7280]">Audit trail</h3>
        <div className="mt-3 divide-y divide-[#edf1ef] rounded-xl border border-[#edf1ef]">
          {events.length === 0 ? <p className="p-4 text-sm font-semibold text-[#6b7280]">No events recorded.</p> : events.map((event) => <div className="p-4" key={event.id}><div className="flex items-center justify-between gap-4"><strong className="text-sm text-[#111827]">{event.action}</strong><span className="text-xs font-bold text-[#6b7280]">{formatDate(event.created_at)}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.from_status || "-"} to {event.to_status}{event.ip_address ? ` / ${event.ip_address}` : ""}</p>{event.remarks ? <p className="mt-1 text-xs font-bold text-[#92400e]">{event.remarks}</p> : null}</div>)}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-3 block text-2xl font-black text-[#111827]">{value}</strong></div>;
}

function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button className={`rounded-xl px-4 py-2 text-sm font-black ${active ? "bg-[#588368] text-white" : "border border-[#dbe0e5] text-[#374151]"}`} onClick={onClick} type="button">{children}</button>;
}

function StatusChip({ value }: { value: string }) {
  const tone = value === "Signed" || value === "Approved" ? "bg-[#e7f6ed] text-[#237a45]" : value === "Revoked" ? "bg-[#fee2e2] text-[#b91c1c]" : value === "Sent" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#e0f2fe] text-[#0369a1]";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{value}</span>;
}

function InfoButton({ text }: { text: string }) {
  return <span className="group relative inline-flex"><button aria-label={text} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" type="button">i</button><span className="pointer-events-none absolute left-0 top-7 z-20 hidden w-72 rounded-xl border border-[#edf1ef] bg-white p-3 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span></span>;
}

function FormInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{label}<input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} /></label>;
}

function FormSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{label}<select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function Textarea({ label, value, onChange, help, mono = false }: { label: string; value: string; onChange: (value: string) => void; help?: string; mono?: boolean }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]"><span className="flex items-center gap-2">{label}{help ? <InfoButton text={help} /> : null}</span><textarea className={`min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368] ${mono ? "font-mono text-xs" : "font-medium"}`} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function ModalActions({ saving, onCancel, submitLabel }: { saving: boolean; onCancel: () => void; submitLabel: string }) {
  return <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5"><button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : submitLabel}</button></div>;
}
