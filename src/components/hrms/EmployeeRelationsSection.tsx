"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type ERCategory = { id: string; code: string; name: string; case_family: string; default_severity: string; default_owner_role?: string; is_active: boolean };
type ERCase = { id: string; case_number: string; category_id?: string; category_name?: string; title: string; intake_summary: string; case_family: string; severity: string; status: string; confidentiality_level: string; legal_hold: boolean; legal_hold_reason?: string; due_at?: string; created_at: string; allegation_count?: number; evidence_count?: number; open_action_count?: number };
type ERPage = { items: ERCase[]; total: number; summary?: Array<{ status: string; severity: string; case_count: number; legal_hold_count: number; overdue_count: number }>; categories?: ERCategory[] };
type ERWorkspace = { case: ERCase; parties: ERParty[]; allegations: ERAllegation[]; steps: ERStep[]; witnesses: ERWitness[]; evidence: EREvidence[]; findings: ERFinding[]; actions: ERAction[]; events: EREvent[] };
type ERParty = { id: string; party_role: string; party_name?: string; party_user_id?: string; created_at: string };
type ERAllegation = { id: string; allegation_type: string; description: string; status: string; incident_date?: string; incident_location?: string };
type ERStep = { id: string; title: string; step_type: string; status: string; due_at?: string; outcome_notes?: string };
type ERWitness = { id: string; witness_name?: string; witness_user_id?: string; statement_summary: string; confidentiality_level: string; created_at: string };
type EREvidence = { id: string; file_name: string; evidence_type: string; legal_hold: boolean; created_at: string };
type ERFinding = { id: string; finding: string; rationale: string; recommended_action?: string; created_at: string };
type ERAction = { id: string; action_type: string; description: string; status: string; due_at?: string; follow_up_notes?: string };
type EREvent = { id: string; event_type: string; from_status?: string; to_status?: string; comment?: string; created_at: string };

type ModalKind = "" | "case" | "category" | "status" | "legal" | "party" | "allegation" | "step" | "witness" | "evidence" | "finding" | "action";
const inputClass = "h-11 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]";
const areaClass = "min-h-24 rounded-lg border border-[#dbe0e5] bg-white px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]";
const primaryButton = "inline-flex h-10 items-center justify-center rounded-lg bg-[#588368] px-4 text-sm font-black text-white";
const secondaryButton = "inline-flex h-10 items-center justify-center rounded-lg border border-[#dbe0e5] bg-white px-4 text-sm font-black text-[#374151]";
const emptyCase = { source_hr_case_id: "", category_id: "", title: "", intake_summary: "", case_family: "grievance", severity: "medium", status: "intake", confidentiality_level: "restricted", complainant_user_id: "", subject_employee_user_id: "", owner_user_id: "", owner_role: "HR", investigation_lead_user_id: "", due_at: "", privacy_notes: "" };
const emptyCategory = { code: "", name: "", case_family: "grievance", description: "", default_severity: "medium", default_owner_role: "HR", is_active: true };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

export function EmployeeRelationsSection({ isSuperAdmin, tenants, tenantsError, tenantsLoading }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [tab, setTab] = useState<"cases" | "categories" | "investigation" | "audit">("cases");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<ERPage>({ items: [], total: 0, categories: [] });
  const [categories, setCategories] = useState<ERCategory[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [workspace, setWorkspace] = useState<ERWorkspace | null>(null);
  const [modal, setModal] = useState<ModalKind>("");
  const [caseForm, setCaseForm] = useState(emptyCase);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [statusForm, setStatusForm] = useState({ status: "triage", resolution_summary: "", comment: "" });
  const [legalForm, setLegalForm] = useState({ enabled: true, reason: "" });
  const [partyForm, setPartyForm] = useState({ party_role: "complainant", party_name: "", party_user_id: "", representation_notes: "", contact_notes: "" });
  const [allegationForm, setAllegationForm] = useState({ allegation_type: "", incident_date: "", incident_location: "", description: "", policy_reference: "", status: "open" });
  const [stepForm, setStepForm] = useState({ step_type: "interview", title: "", description: "", owner_user_id: "", due_at: "", status: "pending", outcome_notes: "" });
  const [witnessForm, setWitnessForm] = useState({ witness_name: "", witness_user_id: "", interview_at: "", interviewer_user_id: "", statement_summary: "", confidentiality_level: "restricted" });
  const [evidenceForm, setEvidenceForm] = useState({ allegation_id: "", file_name: "", content_type: "application/octet-stream", file_content_base64: "", evidence_type: "document", description: "", legal_hold: false });
  const [findingForm, setFindingForm] = useState({ allegation_id: "", finding: "substantiated", rationale: "", recommended_action: "" });
  const [actionForm, setActionForm] = useState({ action_type: "corrective_action", description: "", assigned_to_user_id: "", due_at: "", status: "pending", follow_up_notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);
  const selectedCase = workspace?.case || page.items.find((item) => item.id === selectedID) || page.items[0];
  const summary = useMemo(() => {
    const rows = page.summary || [];
    return {
      active: page.items.filter((item) => !["closed", "cancelled"].includes(item.status)).length,
      legal: rows.reduce((sum, item) => sum + (item.legal_hold_count || 0), 0),
      overdue: rows.reduce((sum, item) => sum + (item.overdue_count || 0), 0),
      critical: page.items.filter((item) => item.severity === "critical").length,
    };
  }, [page.items, page.summary]);

  const load = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (severity) params.set("severity", severity);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "150");
      const [casePage, categoryRows] = await Promise.all([
        apiRequest<ERPage>(`${basePath}/er-cases?${params.toString()}`),
        apiRequest<ERCategory[]>(`${basePath}/er-case-categories`),
      ]);
      const normalized = { ...casePage, items: Array.isArray(casePage.items) ? casePage.items : [], categories: Array.isArray(casePage.categories) ? casePage.categories : categoryRows };
      setPage(normalized);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
      setSelectedID((current) => current && normalized.items.some((item) => item.id === current) ? current : normalized.items[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Employee Relations.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, search, severity, status]);

  const loadWorkspace = useCallback(async (caseID: string) => {
    if (!canLoad || !caseID) {
      setWorkspace(null);
      return;
    }
    try {
      setWorkspace(await apiRequest<ERWorkspace>(`${basePath}/er-cases/${caseID}`));
    } catch {
      setWorkspace(null);
    }
  }, [basePath, canLoad]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(selectedID), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace, selectedID]);

  function closeModal() {
    setModal("");
  }

  async function saveCase(event: FormEvent) {
    event.preventDefault();
    const editing = Boolean(selectedCase && caseForm.title === selectedCase.title);
    await apiRequest<ERCase>(editing && selectedCase ? `${basePath}/er-cases/${selectedCase.id}` : `${basePath}/er-cases`, { method: editing && selectedCase ? "PUT" : "POST", body: cleanPayload(caseForm) });
    closeModal();
    await load();
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    await apiRequest<ERCategory>(`${basePath}/er-case-categories`, { method: "POST", body: cleanPayload(categoryForm) });
    closeModal();
    await load();
  }

  async function updateStatus(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;
    await apiRequest<ERCase>(`${basePath}/er-cases/${selectedCase.id}/status`, { method: "POST", body: cleanPayload(statusForm) });
    closeModal();
    await load();
    await loadWorkspace(selectedCase.id);
  }

  async function updateLegalHold(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;
    await apiRequest<ERCase>(`${basePath}/er-cases/${selectedCase.id}/legal-hold`, { method: "POST", body: { enabled: legalForm.enabled, reason: legalForm.reason || undefined } });
    closeModal();
    await load();
    await loadWorkspace(selectedCase.id);
  }

  async function createChild(event: FormEvent, endpoint: string, body: Record<string, unknown>) {
    event.preventDefault();
    if (!selectedCase) return;
    await apiRequest(`${basePath}/er-cases/${selectedCase.id}/${endpoint}`, { method: "POST", body: cleanPayload(body) });
    closeModal();
    await loadWorkspace(selectedCase.id);
    await load();
  }

  async function attachFile(file: File | null) {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    setEvidenceForm((current) => ({ ...current, file_name: file.name, content_type: file.type || "application/octet-stream", file_content_base64: window.btoa(binary) }));
  }

  const actionButtons = <div className="flex flex-wrap gap-2"><button className={primaryButton} onClick={() => { setCaseForm(emptyCase); setModal("case"); }} type="button">New ER Case</button><button className={secondaryButton} onClick={() => setModal("category")} type="button">Category</button></div>;

  return <section className="space-y-5">
    <Header action={actionButtons} showInfo={showInfo} setShowInfo={setShowInfo} />
    {isSuperAdmin ? <TenantPicker error={tenantsError} loading={tenantsLoading} onChange={setSelectedTenantID} selectedTenantID={selectedTenantID} tenants={sortedTenants} /> : null}
    {!canLoad ? <EmptyState text="Select a tenant to view confidential ER work." /> : <>
      {error ? <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
      <div className="grid gap-3 md:grid-cols-4"><Metric label="Active" value={summary.active} /><Metric label="Legal Hold" value={summary.legal} /><Metric label="Overdue" value={summary.overdue} /><Metric label="Critical" value={summary.critical} /></div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-[#e5e7eb] bg-white p-3"><select className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All status</option>{["intake", "triage", "investigation", "findings", "action_plan", "monitoring", "closed", "cancelled"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select className={inputClass} onChange={(event) => setSeverity(event.target.value)} value={severity}><option value="">All severity</option>{["low", "medium", "high", "critical"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input className={`${inputClass} min-w-64 flex-1`} onChange={(event) => setSearch(event.target.value)} placeholder="Search case number, title, summary" value={search} /><button className={secondaryButton} disabled={loading} onClick={() => void load()} type="button">{loading ? "Loading" : "Refresh"}</button></div>
      <div className="flex flex-wrap gap-2">{(["cases", "categories", "investigation", "audit"] as const).map((item) => <button className={tab === item ? primaryButton : secondaryButton} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</div>
      {tab === "categories" ? <CategoryTable categories={categories} /> : <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr]"><CaseList items={page.items} onSelect={setSelectedID} selectedID={selectedID} /><CaseWorkspaceView caseItem={selectedCase} onAction={setModal} workspace={workspace} tab={tab} /></div>}
    </>}
    <HrmsModal onClose={closeModal} open={modal === "case"} title="Employee Relations Case"><CaseForm categories={categories} form={caseForm} onChange={setCaseForm} onSubmit={saveCase} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "category"} title="ER Category"><CategoryForm form={categoryForm} onChange={setCategoryForm} onSubmit={saveCategory} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "status"} title="Move Case"><StatusForm form={statusForm} onChange={setStatusForm} onSubmit={updateStatus} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "legal"} title="Legal Hold"><LegalForm form={legalForm} onChange={setLegalForm} onSubmit={updateLegalHold} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "party"} title="Add Party"><PartyForm form={partyForm} onChange={setPartyForm} onSubmit={(event) => createChild(event, "parties", partyForm)} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "allegation"} title="Add Allegation"><AllegationForm form={allegationForm} onChange={setAllegationForm} onSubmit={(event) => createChild(event, "allegations", allegationForm)} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "step"} title="Investigation Step"><StepForm form={stepForm} onChange={setStepForm} onSubmit={(event) => createChild(event, "steps", stepForm)} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "witness"} title="Witness Note"><WitnessForm form={witnessForm} onChange={setWitnessForm} onSubmit={(event) => createChild(event, "witness-notes", witnessForm)} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "evidence"} title="Evidence"><EvidenceForm form={evidenceForm} onChange={setEvidenceForm} onFile={attachFile} onSubmit={(event) => createChild(event, "evidence", evidenceForm)} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "finding"} title="Finding"><FindingForm allegations={workspace?.allegations || []} form={findingForm} onChange={setFindingForm} onSubmit={(event) => createChild(event, "findings", findingForm)} /></HrmsModal>
    <HrmsModal onClose={closeModal} open={modal === "action"} title="Action Plan"><ActionForm form={actionForm} onChange={setActionForm} onSubmit={(event) => createChild(event, "action-plans", actionForm)} /></HrmsModal>
  </section>;
}

function Header({ action, showInfo, setShowInfo }: { action: ReactNode; showInfo: boolean; setShowInfo: (value: boolean) => void }) {
  return <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Confidential HR</p><button className="grid size-7 place-items-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" onClick={() => setShowInfo(!showInfo)} type="button">i</button></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">Employee Relations</h1>{showInfo ? <p className="mt-2 max-w-3xl rounded-lg border border-[#dfe6e2] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#6b7280]">Research outcome: ER tools separate confidential investigations from helpdesk queues, keep evidence and witness notes restricted, preserve audit trails, and support legal holds. This workspace keeps those operations in focused modals.</p> : null}</div>{action}</header>;
}

function TenantPicker({ tenants, selectedTenantID, onChange, loading, error }: { tenants: BranchTenantOption[]; selectedTenantID: string; onChange: (value: string) => void; loading: boolean; error: string }) {
  return <div className="rounded-lg border border-[#e5e7eb] bg-white p-3"><select className={`${inputClass} w-full`} disabled={loading} onChange={(event) => onChange(event.target.value)} value={selectedTenantID}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name || tenant.code || tenant.id}</option>)}</select>{error ? <p className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}</div>;
}

function Metric({ label: text, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-[#e5e7eb] bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#6b7280]">{text}</p><p className="mt-2 text-2xl font-black text-[#111827]">{value}</p></div>;
}

function CaseList({ items, selectedID, onSelect }: { items: ERCase[]; selectedID: string; onSelect: (id: string) => void }) {
  return <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white"><div className="border-b border-[#eef0f2] px-4 py-3 text-sm font-black text-[#111827]">Case Queue</div><div className="max-h-[680px] overflow-auto">{items.map((item) => <button className={`w-full border-b border-[#f0f2f4] px-4 py-3 text-left ${selectedID === item.id ? "bg-[#eef4f1]" : "bg-white"}`} key={item.id} onClick={() => onSelect(item.id)} type="button"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-[#111827]">{item.case_number}</p><Badge tone={item.severity}>{label(item.severity)}</Badge></div><p className="mt-1 line-clamp-1 text-sm font-bold text-[#374151]">{item.title}</p><p className="mt-1 text-xs font-bold text-[#6b7280]">{label(item.status)} · {label(item.case_family)}{item.legal_hold ? " · Legal hold" : ""}</p></button>)}{items.length === 0 ? <EmptyState text="No ER cases found." /> : null}</div></div>;
}

function CaseWorkspaceView({ caseItem, workspace, tab, onAction }: { caseItem?: ERCase; workspace: ERWorkspace | null; tab: string; onAction: (modal: ModalKind) => void }) {
  if (!caseItem) return <EmptyState text="Select or create an ER case." />;
  const data = workspace;
  return <div className="rounded-lg border border-[#e5e7eb] bg-white"><div className="border-b border-[#eef0f2] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#6b7280]">{caseItem.case_number}</p><h2 className="mt-1 text-xl font-black text-[#111827]">{caseItem.title}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{caseItem.intake_summary}</p></div><div className="flex flex-wrap gap-2"><button className={secondaryButton} onClick={() => onAction("status")} type="button">Move</button><button className={secondaryButton} onClick={() => onAction("legal")} type="button">Legal Hold</button><button className={primaryButton} onClick={() => onAction("allegation")} type="button">Allegation</button></div></div></div><div className="grid gap-3 p-4 sm:grid-cols-4"><Metric label="Allegations" value={caseItem.allegation_count || data?.allegations.length || 0} /><Metric label="Evidence" value={caseItem.evidence_count || data?.evidence.length || 0} /><Metric label="Actions" value={caseItem.open_action_count || data?.actions.length || 0} /><Metric label="Events" value={data?.events.length || 0} /></div><div className="flex flex-wrap gap-2 border-y border-[#eef0f2] p-4">{["party", "step", "witness", "evidence", "finding", "action"].map((item) => <button className={secondaryButton} key={item} onClick={() => onAction(item as ModalKind)} type="button">{label(item)}</button>)}</div>{tab === "audit" ? <Timeline events={data?.events || []} /> : <InvestigationTables workspace={data} />}</div>;
}

function InvestigationTables({ workspace }: { workspace: ERWorkspace | null }) {
  return <div className="grid gap-4 p-4 lg:grid-cols-2"><MiniTable title="Parties" rows={(workspace?.parties || []).map((item) => [label(item.party_role), item.party_name || item.party_user_id || "-"])} /><MiniTable title="Allegations" rows={(workspace?.allegations || []).map((item) => [item.allegation_type || "General", label(item.status)])} /><MiniTable title="Steps" rows={(workspace?.steps || []).map((item) => [item.title, label(item.status)])} /><MiniTable title="Witness Notes" rows={(workspace?.witnesses || []).map((item) => [item.witness_name || item.witness_user_id || "Witness", item.statement_summary])} /><MiniTable title="Evidence" rows={(workspace?.evidence || []).map((item) => [item.file_name, item.legal_hold ? "Legal hold" : label(item.evidence_type)])} /><MiniTable title="Findings & Actions" rows={[...(workspace?.findings || []).map((item) => [label(item.finding), item.rationale]), ...(workspace?.actions || []).map((item) => [item.description, label(item.status)])]} /></div>;
}

function MiniTable({ title, rows }: { title: string; rows: string[][] }) {
  return <div className="rounded-lg border border-[#eef0f2]"><p className="border-b border-[#eef0f2] px-3 py-2 text-sm font-black text-[#111827]">{title}</p><div>{rows.map((row, index) => <div className="grid grid-cols-[0.8fr_1.2fr] gap-3 border-b border-[#f5f6f7] px-3 py-2 text-sm font-semibold text-[#374151]" key={`${title}-${index}`}><span className="truncate font-black">{row[0]}</span><span className="line-clamp-2 text-[#6b7280]">{row[1]}</span></div>)}{rows.length === 0 ? <p className="px-3 py-4 text-sm font-bold text-[#6b7280]">No records.</p> : null}</div></div>;
}

function Timeline({ events }: { events: EREvent[] }) {
  return <div className="space-y-3 p-4">{events.map((event) => <div className="rounded-lg border border-[#eef0f2] px-3 py-2" key={event.id}><p className="text-sm font-black text-[#111827]">{label(event.event_type)}</p><p className="text-xs font-bold text-[#6b7280]">{formatDate(event.created_at)}{event.to_status ? ` · ${label(event.to_status)}` : ""}</p>{event.comment ? <p className="mt-1 text-sm font-semibold text-[#374151]">{event.comment}</p> : null}</div>)}{events.length === 0 ? <EmptyState text="No audit events." /> : null}</div>;
}

function CategoryTable({ categories }: { categories: ERCategory[] }) {
  return <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">{categories.map((item) => <div className="grid gap-2 border-b border-[#eef0f2] px-4 py-3 sm:grid-cols-4" key={item.id}><p className="text-sm font-black text-[#111827]">{item.code}</p><p className="text-sm font-semibold text-[#374151]">{item.name}</p><p className="text-sm font-semibold text-[#6b7280]">{label(item.case_family)}</p><Badge tone={item.default_severity}>{label(item.default_severity)}</Badge></div>)}{categories.length === 0 ? <EmptyState text="No ER categories." /> : null}</div>;
}

function CaseForm({ form, categories, onChange, onSubmit }: { form: typeof emptyCase; categories: ERCategory[]; onChange: (value: typeof emptyCase) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, category_id: event.target.value })} value={form.category_id}><option value="">No category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input className={inputClass} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="Case title" required value={form.title} /><textarea className={areaClass} onChange={(event) => onChange({ ...form, intake_summary: event.target.value })} placeholder="Private intake summary" required value={form.intake_summary} /><div className="grid gap-3 sm:grid-cols-3"><select className={inputClass} onChange={(event) => onChange({ ...form, case_family: event.target.value })} value={form.case_family}>{["grievance", "disciplinary", "harassment", "ethics", "workplace_conflict", "policy_violation", "other"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select className={inputClass} onChange={(event) => onChange({ ...form, severity: event.target.value })} value={form.severity}>{["low", "medium", "high", "critical"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input className={inputClass} onChange={(event) => onChange({ ...form, due_at: event.target.value })} placeholder="Due date" type="date" value={form.due_at} /></div><button className={primaryButton} type="submit">Save Case</button></form>;
}

function CategoryForm({ form, onChange, onSubmit }: { form: typeof emptyCategory; onChange: (value: typeof emptyCategory) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} onChange={(event) => onChange({ ...form, code: event.target.value })} placeholder="Code" required value={form.code} /><input className={inputClass} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="Name" required value={form.name} /></div><div className="grid gap-3 sm:grid-cols-2"><select className={inputClass} onChange={(event) => onChange({ ...form, case_family: event.target.value })} value={form.case_family}>{["grievance", "disciplinary", "harassment", "ethics", "workplace_conflict", "policy_violation", "other"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select className={inputClass} onChange={(event) => onChange({ ...form, default_severity: event.target.value })} value={form.default_severity}>{["low", "medium", "high", "critical"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></div><input className={inputClass} onChange={(event) => onChange({ ...form, default_owner_role: event.target.value })} placeholder="Default owner role" value={form.default_owner_role} /><button className={primaryButton} type="submit">Save Category</button></form>;
}

function StatusForm({ form, onChange, onSubmit }: { form: typeof statusFormShape; onChange: (value: typeof statusFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, status: event.target.value })} value={form.status}>{["triage", "investigation", "findings", "action_plan", "monitoring", "closed", "cancelled"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><textarea className={areaClass} onChange={(event) => onChange({ ...form, comment: event.target.value, resolution_summary: event.target.value })} placeholder="Status note" value={form.comment} /><button className={primaryButton} type="submit">Move Case</button></form>;
}
const statusFormShape = { status: "triage", resolution_summary: "", comment: "" };

function LegalForm({ form, onChange, onSubmit }: { form: typeof legalFormShape; onChange: (value: typeof legalFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={form.enabled} onChange={(event) => onChange({ ...form, enabled: event.target.checked })} type="checkbox" /> Legal hold enabled</label><textarea className={areaClass} onChange={(event) => onChange({ ...form, reason: event.target.value })} placeholder="Reason" required={form.enabled} value={form.reason} /><button className={primaryButton} type="submit">Save Legal Hold</button></form>;
}
const legalFormShape = { enabled: true, reason: "" };

function PartyForm({ form, onChange, onSubmit }: { form: typeof partyFormShape; onChange: (value: typeof partyFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, party_role: event.target.value })} value={form.party_role}>{["complainant", "respondent", "witness", "investigator", "hr_partner", "legal", "manager", "other"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input className={inputClass} onChange={(event) => onChange({ ...form, party_name: event.target.value })} placeholder="Name" value={form.party_name} /><input className={inputClass} onChange={(event) => onChange({ ...form, party_user_id: event.target.value })} placeholder="User ID" value={form.party_user_id} /><button className={primaryButton} type="submit">Add Party</button></form>;
}
const partyFormShape = { party_role: "complainant", party_name: "", party_user_id: "", representation_notes: "", contact_notes: "" };

function AllegationForm({ form, onChange, onSubmit }: { form: typeof allegationFormShape; onChange: (value: typeof allegationFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><input className={inputClass} onChange={(event) => onChange({ ...form, allegation_type: event.target.value })} placeholder="Allegation type" value={form.allegation_type} /><input className={inputClass} onChange={(event) => onChange({ ...form, incident_date: event.target.value })} type="date" value={form.incident_date} /><textarea className={areaClass} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Description" required value={form.description} /><button className={primaryButton} type="submit">Add Allegation</button></form>;
}
const allegationFormShape = { allegation_type: "", incident_date: "", incident_location: "", description: "", policy_reference: "", status: "open" };

function StepForm({ form, onChange, onSubmit }: { form: typeof stepFormShape; onChange: (value: typeof stepFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><input className={inputClass} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="Step title" required value={form.title} /><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} onChange={(event) => onChange({ ...form, step_type: event.target.value })} placeholder="Step type" value={form.step_type} /><input className={inputClass} onChange={(event) => onChange({ ...form, due_at: event.target.value })} type="date" value={form.due_at} /></div><textarea className={areaClass} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Description" value={form.description} /><button className={primaryButton} type="submit">Add Step</button></form>;
}
const stepFormShape = { step_type: "interview", title: "", description: "", owner_user_id: "", due_at: "", status: "pending", outcome_notes: "" };

function WitnessForm({ form, onChange, onSubmit }: { form: typeof witnessFormShape; onChange: (value: typeof witnessFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><input className={inputClass} onChange={(event) => onChange({ ...form, witness_name: event.target.value })} placeholder="Witness name" value={form.witness_name} /><textarea className={areaClass} onChange={(event) => onChange({ ...form, statement_summary: event.target.value })} placeholder="Statement summary" required value={form.statement_summary} /><button className={primaryButton} type="submit">Add Note</button></form>;
}
const witnessFormShape = { witness_name: "", witness_user_id: "", interview_at: "", interviewer_user_id: "", statement_summary: "", confidentiality_level: "restricted" };

function EvidenceForm({ form, onChange, onFile, onSubmit }: { form: typeof evidenceFormShape; onChange: (value: typeof evidenceFormShape) => void; onFile: (file: File | null) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><input className={inputClass} onChange={(event) => onFile(event.target.files?.[0] || null)} required type="file" /><input className={inputClass} onChange={(event) => onChange({ ...form, evidence_type: event.target.value })} placeholder="Evidence type" value={form.evidence_type} /><textarea className={areaClass} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Description" value={form.description} /><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={form.legal_hold} onChange={(event) => onChange({ ...form, legal_hold: event.target.checked })} type="checkbox" /> Mark evidence under legal hold</label><button className={primaryButton} type="submit">Upload Evidence</button></form>;
}
const evidenceFormShape = { allegation_id: "", file_name: "", content_type: "application/octet-stream", file_content_base64: "", evidence_type: "document", description: "", legal_hold: false };

function FindingForm({ form, allegations, onChange, onSubmit }: { form: typeof findingFormShape; allegations: ERAllegation[]; onChange: (value: typeof findingFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, allegation_id: event.target.value })} value={form.allegation_id}><option value="">General finding</option>{allegations.map((item) => <option key={item.id} value={item.id}>{item.allegation_type || item.description}</option>)}</select><select className={inputClass} onChange={(event) => onChange({ ...form, finding: event.target.value })} value={form.finding}>{["substantiated", "unsubstantiated", "inconclusive", "partially_substantiated", "withdrawn"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><textarea className={areaClass} onChange={(event) => onChange({ ...form, rationale: event.target.value })} placeholder="Rationale" required value={form.rationale} /><button className={primaryButton} type="submit">Save Finding</button></form>;
}
const findingFormShape = { allegation_id: "", finding: "substantiated", rationale: "", recommended_action: "" };

function ActionForm({ form, onChange, onSubmit }: { form: typeof actionFormShape; onChange: (value: typeof actionFormShape) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><input className={inputClass} onChange={(event) => onChange({ ...form, action_type: event.target.value })} placeholder="Action type" value={form.action_type} /><textarea className={areaClass} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Action description" required value={form.description} /><input className={inputClass} onChange={(event) => onChange({ ...form, due_at: event.target.value })} type="date" value={form.due_at} /><button className={primaryButton} type="submit">Add Action</button></form>;
}
const actionFormShape = { action_type: "corrective_action", description: "", assigned_to_user_id: "", due_at: "", status: "pending", follow_up_notes: "" };

function Badge({ children, tone }: { children: ReactNode; tone: string }) {
  const cls = tone === "critical" || tone === "high" || tone === "legal_hold" ? "bg-red-50 text-red-700" : tone === "medium" || tone === "triage" ? "bg-amber-50 text-amber-700" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-black ${cls}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#dbe0e5] bg-white px-4 py-8 text-center text-sm font-bold text-[#6b7280]">{text}</div>;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function cleanPayload<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined && item !== null));
}
