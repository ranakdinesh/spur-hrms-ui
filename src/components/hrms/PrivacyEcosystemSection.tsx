"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Consent = { id: string; consent_key: string; consent_area: string; status: string; lawful_basis: string; channel: string; source: string; purpose: string; updated_at: string };
type Erasure = { id: string; request_key: string; request_type: string; status: string; priority: string; reason: string; due_at?: string | null; retained_reason?: string | null };
type Hook = { id: string; hook_key: string; provider: string; channel: string; direction: string; status: string; display_name: string; event_types: string[]; consent_required: boolean; mobile_safe: boolean };
type MobileConstraint = { id: string; constraint_key: string; workflow: string; min_android_version?: string | null; min_ios_version?: string | null; offline_supported: boolean; low_bandwidth_mode: boolean; requires_location: boolean; requires_device_binding: boolean; max_payload_kb: number; status: string };
type Workspace = { consents: Consent[]; erasure_requests: Erasure[]; integrations: Hook[]; mobile_constraints: MobileConstraint[]; summary: Record<string, number> };
type Tab = "consents" | "erasure" | "integrations" | "mobile";

const inputClass = "h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]";
const statuses = ["draft", "granted", "revoked", "expired"];
const erasureStatuses = ["intake", "validating", "blocked_legal_hold", "approved", "processing", "completed", "rejected", "cancelled"];
const channels = ["whatsapp", "slack", "email", "git", "webhook", "mobile", "api"];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

export function PrivacyEcosystemSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);
  const [tab, setTab] = useState<Tab>("consents");
  const [data, setData] = useState<Workspace>({ consents: [], erasure_requests: [], integrations: [], mobile_constraints: [], summary: {} });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const [erasureOpen, setErasureOpen] = useState(false);
  const [hookOpen, setHookOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<Erasure | null>(null);
  const [consentForm, setConsentForm] = useState({ consent_key: "", consent_area: "employee_data", status: "granted", lawful_basis: "consent", channel: "web", source: "hrms", purpose: "" });
  const [erasureForm, setErasureForm] = useState({ request_key: "", request_type: "erasure", status: "intake", priority: "normal", reason: "", due_at: "" });
  const [hookForm, setHookForm] = useState({ hook_key: "", provider: "", channel: "webhook", direction: "outbound", status: "draft", display_name: "", endpoint_url: "", event_types: "", consent_required: true, mobile_safe: false });
  const [mobileForm, setMobileForm] = useState({ constraint_key: "", workflow: "attendance", min_android_version: "", min_ios_version: "", offline_supported: false, low_bandwidth_mode: true, requires_location: false, requires_device_binding: false, max_payload_kb: "256", status: "active" });
  const [statusForm, setStatusForm] = useState({ status: "validating", retained_reason: "" });

  const load = useCallback(async () => {
    if (!canLoad) return;
    setError("");
    try {
      setData(await apiRequest<Workspace>(`${basePath}/privacy-ecosystem`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load privacy ecosystem.");
    }
  }, [basePath, canLoad]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveConsent() {
    await apiRequest(`${basePath}/privacy/consents`, { method: "POST", body: { ...consentForm, evidence: {}, metadata: {} } });
    setConsentOpen(false);
    setMessage("Consent saved.");
    await load();
  }

  async function saveErasure() {
    await apiRequest(`${basePath}/privacy/erasure-requests`, { method: "POST", body: { ...erasureForm, scope: {}, audit_summary: {}, due_at: erasureForm.due_at || undefined } });
    setErasureOpen(false);
    setMessage("Erasure workflow created.");
    await load();
  }

  async function updateErasureStatus() {
    if (!statusModal) return;
    await apiRequest(`${basePath}/privacy/erasure-requests/${statusModal.id}/status`, { method: "POST", body: { status: statusForm.status, retained_reason: statusForm.retained_reason || undefined, audit_summary: { source: "privacy_workspace" } } });
    setStatusModal(null);
    setMessage("Erasure status updated.");
    await load();
  }

  async function saveHook() {
    await apiRequest(`${basePath}/integrations/hooks`, { method: "POST", body: { ...hookForm, endpoint_url: hookForm.endpoint_url || null, event_types: hookForm.event_types.split(",").map((item) => item.trim()).filter(Boolean), config: {} } });
    setHookOpen(false);
    setMessage("Integration hook saved.");
    await load();
  }

  async function saveMobile() {
    await apiRequest(`${basePath}/mobile/api-constraints`, { method: "POST", body: { ...mobileForm, min_android_version: mobileForm.min_android_version || null, min_ios_version: mobileForm.min_ios_version || null, max_payload_kb: Number(mobileForm.max_payload_kb || 256), config: {} } });
    setMobileOpen(false);
    setMessage("Mobile constraint saved.");
    await load();
  }

  if (isSuperAdmin && !selectedTenantID) {
    return <main className="space-y-6 p-6 lg:p-10"><Header title="Privacy & Ecosystem" subtitle="Select a tenant to manage consent, erasure workflows, integrations, and mobile API constraints." />{tenantsError ? <Alert tone="danger" text={tenantsError} /> : null}<select className={inputClass} disabled={tenantsLoading} onChange={(event) => setSelectedTenantID(event.target.value)} value={selectedTenantID}><option value="">Select tenant</option>{sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}</select></main>;
  }

  return <main className="space-y-6 p-6 lg:p-10"><Header action={<InfoButton text="DPDPA-style controls need clear consent state, erasure/export workflow tracking, integration auditability, and mobile-safe constraints for older devices." />} title="Privacy & Ecosystem" subtitle="Tenant-level privacy controls, data subject workflows, integration hooks, and mobile-first API constraints." />{message ? <Alert tone="success" text={message} /> : null}{error ? <Alert tone="danger" text={error} /> : null}<div className="grid gap-3 md:grid-cols-4"><Metric label="Consents" value={data.summary?.consents || 0} /><Metric label="Open Erasure" value={data.summary?.erasure_open || 0} /><Metric label="Active Hooks" value={data.summary?.integrations_active || 0} /><Metric label="Mobile Rules" value={data.summary?.mobile_constraints || 0} /></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(["consents", "erasure", "integrations", "mobile"] as Tab[]).map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</div><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => tab === "consents" ? setConsentOpen(true) : tab === "erasure" ? setErasureOpen(true) : tab === "integrations" ? setHookOpen(true) : setMobileOpen(true)} type="button">Add</button></div>{tab === "consents" ? <Table headers={["Key", "Area", "Status", "Basis", "Purpose"]}>{data.consents.map((row) => <tr key={row.id}><Cell strong>{row.consent_key}</Cell><Cell>{label(row.consent_area)}</Cell><Cell><Badge text={label(row.status)} /></Cell><Cell>{label(row.lawful_basis)}</Cell><Cell>{row.purpose}</Cell></tr>)}</Table> : null}{tab === "erasure" ? <Table headers={["Request", "Type", "Status", "Priority", "Action"]}>{data.erasure_requests.map((row) => <tr key={row.id}><Cell strong>{row.request_key}</Cell><Cell>{label(row.request_type)}</Cell><Cell><Badge text={label(row.status)} /></Cell><Cell>{label(row.priority)}</Cell><Cell><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => { setStatusModal(row); setStatusForm({ status: row.status, retained_reason: row.retained_reason || "" }); }} type="button">Status</button></Cell></tr>)}</Table> : null}{tab === "integrations" ? <Table headers={["Hook", "Provider", "Channel", "Status", "Controls"]}>{data.integrations.map((row) => <tr key={row.id}><Cell strong>{row.display_name}</Cell><Cell>{row.provider}</Cell><Cell>{label(row.channel)}</Cell><Cell><Badge text={label(row.status)} /></Cell><Cell>{row.consent_required ? "Consent required" : "No consent"}{row.mobile_safe ? " / Mobile safe" : ""}</Cell></tr>)}</Table> : null}{tab === "mobile" ? <Table headers={["Workflow", "Key", "Offline", "Low Bandwidth", "Location"]}>{data.mobile_constraints.map((row) => <tr key={row.id}><Cell strong>{label(row.workflow)}</Cell><Cell>{row.constraint_key}</Cell><Cell>{row.offline_supported ? "Yes" : "No"}</Cell><Cell>{row.low_bandwidth_mode ? "Yes" : "No"}</Cell><Cell>{row.requires_location ? "Required" : "Optional"}</Cell></tr>)}</Table> : null}<ConsentModal form={consentForm} onChange={setConsentForm} onClose={() => setConsentOpen(false)} onSubmit={() => void saveConsent()} open={consentOpen} /><ErasureModal form={erasureForm} onChange={setErasureForm} onClose={() => setErasureOpen(false)} onSubmit={() => void saveErasure()} open={erasureOpen} /><HookModal form={hookForm} onChange={setHookForm} onClose={() => setHookOpen(false)} onSubmit={() => void saveHook()} open={hookOpen} /><MobileModal form={mobileForm} onChange={setMobileForm} onClose={() => setMobileOpen(false)} onSubmit={() => void saveMobile()} open={mobileOpen} /><StatusModal form={statusForm} onChange={setStatusForm} onClose={() => setStatusModal(null)} onSubmit={() => void updateErasureStatus()} open={Boolean(statusModal)} /></main>;
}

function ConsentModal({ form, onChange, onClose, onSubmit, open }: { form: typeof defaultConsent; onChange: (form: typeof defaultConsent) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Privacy Consent"><FormGrid><Field label="Key"><input className={inputClass} value={form.consent_key} onChange={(event) => onChange({ ...form, consent_key: event.target.value })} /></Field><Field label="Area"><input className={inputClass} value={form.consent_area} onChange={(event) => onChange({ ...form, consent_area: event.target.value })} /></Field><Field label="Status"><Select value={form.status} values={statuses} onChange={(status) => onChange({ ...form, status })} /></Field><Field label="Purpose"><input className={inputClass} value={form.purpose} onChange={(event) => onChange({ ...form, purpose: event.target.value })} /></Field><Actions onCancel={onClose} onSubmit={onSubmit} /></FormGrid></HrmsModal>;
}

const defaultConsent = { consent_key: "", consent_area: "employee_data", status: "granted", lawful_basis: "consent", channel: "web", source: "hrms", purpose: "" };

function ErasureModal({ form, onChange, onClose, onSubmit, open }: { form: typeof defaultErasure; onChange: (form: typeof defaultErasure) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Erasure Workflow"><FormGrid><Field label="Request Key"><input className={inputClass} value={form.request_key} onChange={(event) => onChange({ ...form, request_key: event.target.value })} /></Field><Field label="Priority"><Select value={form.priority} values={["low", "normal", "high", "urgent"]} onChange={(priority) => onChange({ ...form, priority })} /></Field><Field label="Due At"><input className={inputClass} type="date" value={form.due_at} onChange={(event) => onChange({ ...form, due_at: event.target.value })} /></Field><Field label="Reason"><textarea className="min-h-24 rounded-xl border border-[#dbe8e1] p-3 text-sm outline-none focus:border-[#588368]" value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} /></Field><Actions onCancel={onClose} onSubmit={onSubmit} /></FormGrid></HrmsModal>;
}

const defaultErasure = { request_key: "", request_type: "erasure", status: "intake", priority: "normal", reason: "", due_at: "" };

function HookModal({ form, onChange, onClose, onSubmit, open }: { form: typeof defaultHook; onChange: (form: typeof defaultHook) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Integration Hook"><FormGrid><Field label="Hook Key"><input className={inputClass} value={form.hook_key} onChange={(event) => onChange({ ...form, hook_key: event.target.value })} /></Field><Field label="Name"><input className={inputClass} value={form.display_name} onChange={(event) => onChange({ ...form, display_name: event.target.value })} /></Field><Field label="Provider"><input className={inputClass} value={form.provider} onChange={(event) => onChange({ ...form, provider: event.target.value })} /></Field><Field label="Channel"><Select value={form.channel} values={channels} onChange={(channel) => onChange({ ...form, channel })} /></Field><Field label="Events"><input className={inputClass} value={form.event_types} onChange={(event) => onChange({ ...form, event_types: event.target.value })} /></Field><Toggle checked={form.consent_required} label="Consent required" onChange={(consent_required) => onChange({ ...form, consent_required })} /><Toggle checked={form.mobile_safe} label="Mobile safe" onChange={(mobile_safe) => onChange({ ...form, mobile_safe })} /><Actions onCancel={onClose} onSubmit={onSubmit} /></FormGrid></HrmsModal>;
}

const defaultHook = { hook_key: "", provider: "", channel: "webhook", direction: "outbound", status: "draft", display_name: "", endpoint_url: "", event_types: "", consent_required: true, mobile_safe: false };

function MobileModal({ form, onChange, onClose, onSubmit, open }: { form: typeof defaultMobile; onChange: (form: typeof defaultMobile) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Mobile Constraint"><FormGrid><Field label="Key"><input className={inputClass} value={form.constraint_key} onChange={(event) => onChange({ ...form, constraint_key: event.target.value })} /></Field><Field label="Workflow"><input className={inputClass} value={form.workflow} onChange={(event) => onChange({ ...form, workflow: event.target.value })} /></Field><Field label="Android Min"><input className={inputClass} value={form.min_android_version} onChange={(event) => onChange({ ...form, min_android_version: event.target.value })} /></Field><Field label="iOS Min"><input className={inputClass} value={form.min_ios_version} onChange={(event) => onChange({ ...form, min_ios_version: event.target.value })} /></Field><Toggle checked={form.offline_supported} label="Offline supported" onChange={(offline_supported) => onChange({ ...form, offline_supported })} /><Toggle checked={form.low_bandwidth_mode} label="Low bandwidth" onChange={(low_bandwidth_mode) => onChange({ ...form, low_bandwidth_mode })} /><Toggle checked={form.requires_location} label="Location required" onChange={(requires_location) => onChange({ ...form, requires_location })} /><Actions onCancel={onClose} onSubmit={onSubmit} /></FormGrid></HrmsModal>;
}

const defaultMobile = { constraint_key: "", workflow: "attendance", min_android_version: "", min_ios_version: "", offline_supported: false, low_bandwidth_mode: true, requires_location: false, requires_device_binding: false, max_payload_kb: "256", status: "active" };

function StatusModal({ form, onChange, onClose, onSubmit, open }: { form: { status: string; retained_reason: string }; onChange: (form: { status: string; retained_reason: string }) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Erasure Status"><FormGrid><Field label="Status"><Select value={form.status} values={erasureStatuses} onChange={(status) => onChange({ ...form, status })} /></Field><Field label="Retention / Review Note"><textarea className="min-h-24 rounded-xl border border-[#dbe8e1] p-3 text-sm outline-none focus:border-[#588368]" value={form.retained_reason} onChange={(event) => onChange({ ...form, retained_reason: event.target.value })} /></Field><Actions onCancel={onClose} onSubmit={onSubmit} /></FormGrid></HrmsModal>;
}

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Privacy</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">{subtitle}</p></div>{action}</div>;
}

function Table({ children, headers }: { children: ReactNode; headers: string[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((header) => <th className="px-5 py-4" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{children}</tbody></table></div></section>;
}

function Cell({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <td className={`px-5 py-4 text-sm ${strong ? "font-black text-[#111827]" : "font-semibold text-[#4b5563]"}`}>{children}</td>;
}

function Metric({ label: labelText, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">{labelText}</p><p className="mt-2 text-3xl font-black text-[#111827]">{value}</p></div>;
}

function Field({ children, label: labelText }: { children: ReactNode; label: string }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{labelText}{children}</label>;
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}

function Select({ onChange, value, values }: { onChange: (value: string) => void; value: string; values: string[] }) {
  return <select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>{values.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>;
}

function Toggle({ checked, label: labelText, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-3 text-sm font-bold text-[#374151]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{labelText}</label>;
}

function Actions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-2 border-t border-[#edf1ef] pt-4"><button className="rounded-xl border border-[#dbe8e1] px-4 py-2 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function Badge({ text }: { text: string }) {
  return <span className="inline-flex rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black uppercase text-[#588368]">{text}</span>;
}

function Alert({ text, tone }: { text: string; tone: "success" | "danger" }) {
  return <p className={`rounded-xl px-4 py-3 text-sm font-bold ${tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{text}</p>;
}

function InfoButton({ text }: { text: string }) {
  return <span className="group relative inline-flex"><button aria-label={text} className="grid h-8 w-8 place-items-center rounded-full border border-[#cfd8d3] text-xs font-black text-[#588368]" type="button">i</button><span className="pointer-events-none absolute right-0 top-10 z-20 hidden w-80 rounded-2xl border border-[#dbe0e5] bg-white p-4 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span></span>;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
