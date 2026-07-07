"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type HRCaseCategory = {
  id: string;
  code: string;
  name: string;
  description?: string;
  confidentiality_default: string;
  default_owner_role?: string;
  is_active: boolean;
};

type HRCaseSLAPolicy = {
  id: string;
  category_id?: string;
  category_name?: string;
  priority: string;
  response_hours: number;
  resolution_hours: number;
  escalation_hours: number;
  is_active: boolean;
};

type HRCase = {
  id: string;
  case_number: string;
  category_id?: string;
  category_name?: string;
  case_type: string;
  title: string;
  description: string;
  confidentiality_level: string;
  requester_user_id?: string;
  subject_employee_user_id?: string;
  owner_user_id?: string;
  owner_role?: string;
  status: string;
  priority: string;
  source_channel: string;
  first_response_due_at?: string;
  due_at?: string;
  resolution_summary?: string;
  created_at: string;
  updated_at: string;
  comment_count?: number;
  attachment_count?: number;
};

type HRCaseComment = {
  id: string;
  visibility: string;
  body: string;
  author_user_id?: string;
  created_at: string;
};

type HRCaseAttachment = {
  id: string;
  file_name: string;
  content_type: string;
  object_key: string;
  visibility: string;
  uploaded_by?: string;
  created_at: string;
};

type HRCaseEvent = {
  id: string;
  event_type: string;
  from_status?: string;
  to_status?: string;
  comment?: string;
  created_at: string;
};

type HRCasePage = {
  items: HRCase[];
  total: number;
  summary?: Array<{ status: string; priority: string; case_count: number; overdue_count: number; escalated_count: number; restricted_count: number }>;
  categories?: HRCaseCategory[];
};

type HRCaseWorkspace = {
  case: HRCase;
  comments: HRCaseComment[];
  attachments: HRCaseAttachment[];
  events: HRCaseEvent[];
};

type ModalKind = "case" | "category" | "sla" | "status" | "assign" | "comment" | "attachment" | "";

const emptyCase = { category_id: "", case_type: "general", title: "", description: "", confidentiality_level: "normal", requester_user_id: "", subject_employee_user_id: "", owner_user_id: "", owner_role: "", status: "new", priority: "normal", source_channel: "web" };
const emptyCategory = { code: "", name: "", description: "", confidentiality_default: "normal", default_owner_role: "HR", is_active: true };
const emptySLA = { category_id: "", priority: "normal", response_hours: "8", resolution_hours: "48", escalation_hours: "24", is_active: true };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

export function HRCaseManagementSection({ isSuperAdmin, tenants, tenantsError, tenantsLoading }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [tab, setTab] = useState<"cases" | "categories" | "sla">("cases");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<HRCasePage>({ items: [], total: 0, categories: [] });
  const [categories, setCategories] = useState<HRCaseCategory[]>([]);
  const [slaPolicies, setSLAPolicies] = useState<HRCaseSLAPolicy[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [workspace, setWorkspace] = useState<HRCaseWorkspace | null>(null);
  const [modal, setModal] = useState<ModalKind>("");
  const [caseForm, setCaseForm] = useState(emptyCase);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [slaForm, setSLAForm] = useState(emptySLA);
  const [statusForm, setStatusForm] = useState({ status: "in_progress", resolution_summary: "", comment: "" });
  const [assignForm, setAssignForm] = useState({ owner_user_id: "", owner_role: "HR", comment: "" });
  const [commentForm, setCommentForm] = useState({ visibility: "public", body: "" });
  const [attachmentForm, setAttachmentForm] = useState({ visibility: "public", file_name: "", content_type: "application/octet-stream", file_content_base64: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);
  const selectedCase = workspace?.case || page.items.find((item) => item.id === selectedID) || page.items[0];

  const load = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "150");
      const [casePage, categoryRows, slaRows] = await Promise.all([
        apiRequest<HRCasePage>(`${basePath}/hr-cases?${params.toString()}`),
        apiRequest<HRCaseCategory[]>(`${basePath}/hr-case-categories`),
        apiRequest<HRCaseSLAPolicy[]>(`${basePath}/hr-case-sla-policies`),
      ]);
      const normalized = { ...casePage, items: Array.isArray(casePage.items) ? casePage.items : [], categories: Array.isArray(casePage.categories) ? casePage.categories : categoryRows };
      setPage(normalized);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
      setSLAPolicies(Array.isArray(slaRows) ? slaRows : []);
      setSelectedID((current) => current && normalized.items.some((item) => item.id === current) ? current : normalized.items[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load HR helpdesk.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, priority, search, status]);

  const loadWorkspace = useCallback(async (caseID: string) => {
    if (!canLoad || !caseID) {
      setWorkspace(null);
      return;
    }
    try {
      const response = await apiRequest<HRCaseWorkspace>(`${basePath}/hr-cases/${caseID}?include_internal=true`);
      setWorkspace(response);
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
    const editing = Boolean(caseForm.title && selectedCase && modal === "case" && caseForm.title === selectedCase.title);
    const payload = cleanPayload({ ...caseForm, requester_user_id: caseForm.requester_user_id || undefined, subject_employee_user_id: caseForm.subject_employee_user_id || undefined, owner_user_id: caseForm.owner_user_id || undefined, owner_role: caseForm.owner_role || undefined, category_id: caseForm.category_id || undefined });
    await apiRequest<HRCase>(editing && selectedCase ? `${basePath}/hr-cases/${selectedCase.id}` : `${basePath}/hr-cases`, { method: editing && selectedCase ? "PUT" : "POST", body: JSON.stringify(payload) });
    closeModal();
    await load();
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    await apiRequest<HRCaseCategory>(`${basePath}/hr-case-categories`, { method: "POST", body: JSON.stringify(cleanPayload(categoryForm)) });
    closeModal();
    await load();
  }

  async function saveSLA(event: FormEvent) {
    event.preventDefault();
    const payload = { ...slaForm, category_id: slaForm.category_id || undefined, response_hours: Number(slaForm.response_hours), resolution_hours: Number(slaForm.resolution_hours), escalation_hours: Number(slaForm.escalation_hours) };
    await apiRequest<HRCaseSLAPolicy>(`${basePath}/hr-case-sla-policies`, { method: "POST", body: JSON.stringify(payload) });
    closeModal();
    await load();
  }

  async function updateStatus(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;
    await apiRequest<HRCase>(`${basePath}/hr-cases/${selectedCase.id}/status`, { method: "POST", body: JSON.stringify(cleanPayload(statusForm)) });
    closeModal();
    await loadWorkspace(selectedCase.id);
    await load();
  }

  async function assignCase(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;
    await apiRequest<HRCase>(`${basePath}/hr-cases/${selectedCase.id}/assign`, { method: "POST", body: JSON.stringify(cleanPayload(assignForm)) });
    closeModal();
    await loadWorkspace(selectedCase.id);
    await load();
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;
    await apiRequest<HRCaseComment>(`${basePath}/hr-cases/${selectedCase.id}/comments`, { method: "POST", body: JSON.stringify(commentForm) });
    setCommentForm({ visibility: "public", body: "" });
    closeModal();
    await loadWorkspace(selectedCase.id);
  }

  async function addAttachment(event: FormEvent) {
    event.preventDefault();
    if (!selectedCase) return;
    await apiRequest<HRCaseAttachment>(`${basePath}/hr-cases/${selectedCase.id}/attachments`, { method: "POST", body: JSON.stringify(attachmentForm) });
    setAttachmentForm({ visibility: "public", file_name: "", content_type: "application/octet-stream", file_content_base64: "" });
    closeModal();
    await loadWorkspace(selectedCase.id);
  }

  async function onFile(file?: File) {
    if (!file) return;
    const content = await fileToBase64(file);
    setAttachmentForm({ ...attachmentForm, file_name: file.name, content_type: file.type || "application/octet-stream", file_content_base64: content });
  }

  if (isSuperAdmin && !selectedTenantID) {
    return <main className="space-y-5 p-6 lg:p-10"><Header showInfo={showInfo} setShowInfo={setShowInfo} /><TenantPicker disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /></main>;
  }

  return (
    <main className="space-y-5 p-6 lg:p-10">
      <Header action={<button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => { setCaseForm(emptyCase); setModal("case"); }} type="button">New Case</button>} showInfo={showInfo} setShowInfo={setShowInfo} />
      {isSuperAdmin ? <TenantPicker compact disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Open Cases" value={page.total} />
        <Metric label="Escalated" value={summaryValue(page, "escalated_count")} tone="danger" />
        <Metric label="Overdue" value={summaryValue(page, "overdue_count")} tone="warning" />
        <Metric label="Sensitive" value={summaryValue(page, "restricted_count")} tone="danger" />
      </section>
      <section className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">{["cases", "categories", "sla"].map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item as typeof tab)} type="button">{label(item)}</button>)}</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {tab === "cases" ? <><select className="h-10 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All status</option>{["new", "open", "in_progress", "waiting_on_employee", "waiting_on_hr", "escalated", "resolved", "closed", "cancelled"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select className="h-10 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold" onChange={(event) => setPriority(event.target.value)} value={priority}><option value="">All priority</option>{["low", "normal", "high", "urgent"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input className="h-10 rounded-lg border border-[#dbe0e5] px-3 text-sm font-semibold outline-none focus:border-[#588368] sm:w-64" onChange={(event) => setSearch(event.target.value)} placeholder="Search cases" value={search} /></> : null}
            {tab === "categories" ? <button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => { setCategoryForm(emptyCategory); setModal("category"); }} type="button">New Category</button> : null}
            {tab === "sla" ? <button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => { setSLAForm(emptySLA); setModal("sla"); }} type="button">New SLA</button> : null}
          </div>
        </div>
      </section>
      {tab === "cases" ? <CaseWorkspace cases={page.items} loading={loading} onAction={setModal} onSelect={setSelectedID} selected={selectedCase} workspace={workspace} /> : null}
      {tab === "categories" ? <ConfigTable empty="No helpdesk categories configured." headers={["Code", "Name", "Default Confidentiality", "Owner Role", "Active"]} rows={categories.map((item) => [item.code, item.name, label(item.confidentiality_default), item.default_owner_role || "-", item.is_active ? "Yes" : "No"])} /> : null}
      {tab === "sla" ? <ConfigTable empty="No SLA policies configured." headers={["Category", "Priority", "First Response", "Resolution", "Escalation", "Active"]} rows={slaPolicies.map((item) => [item.category_name || "All categories", label(item.priority), `${item.response_hours}h`, `${item.resolution_hours}h`, `${item.escalation_hours}h`, item.is_active ? "Yes" : "No"])} /> : null}
      <HrmsModal onClose={closeModal} open={modal === "case"} title="New HR Case"><CaseForm categories={categories} form={caseForm} onChange={setCaseForm} onSubmit={saveCase} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "category"} title="New Helpdesk Category"><CategoryForm form={categoryForm} onChange={setCategoryForm} onSubmit={saveCategory} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "sla"} title="New SLA Policy"><SLAForm categories={categories} form={slaForm} onChange={setSLAForm} onSubmit={saveSLA} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "status"} title="Change Case Status"><StatusForm form={statusForm} onChange={setStatusForm} onSubmit={updateStatus} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "assign"} title="Assign Case"><AssignForm form={assignForm} onChange={setAssignForm} onSubmit={assignCase} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "comment"} title="Add Comment"><CommentForm form={commentForm} onChange={setCommentForm} onSubmit={addComment} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "attachment"} title="Attach File"><AttachmentForm form={attachmentForm} onChange={setAttachmentForm} onFile={onFile} onSubmit={addAttachment} /></HrmsModal>
    </main>
  );
}

function Header({ action, showInfo, setShowInfo }: { action?: ReactNode; showInfo: boolean; setShowInfo: (value: boolean) => void }) {
  return <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employee Service</p><button className="grid size-7 place-items-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" onClick={() => setShowInfo(!showInfo)} type="button">i</button></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">HR Helpdesk</h1>{showInfo ? <p className="mt-2 max-w-3xl rounded-lg border border-[#dfe6e2] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#6b7280]">Cases capture employee HR requests, sensitive grievances, internal comments, tenant-specific categories, and SLA clocks. Operational actions stay in modal dialogs to keep the workspace focused.</p> : null}</div>{action}</header>;
}

function TenantPicker({ compact, disabled, error, onChange, tenants, value }: { compact?: boolean; disabled: boolean; error: string; onChange: (value: string) => void; tenants: BranchTenantOption[]; value: string }) {
  return <section className={compact ? "" : "rounded-lg border border-[#dfe6e2] bg-white p-5 shadow-sm"}>{error ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}<select className="h-11 w-full rounded-lg border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}</select></section>;
}

function CaseWorkspace({ cases, loading, onAction, onSelect, selected, workspace }: { cases: HRCase[]; loading: boolean; onAction: (modal: ModalKind) => void; onSelect: (id: string) => void; selected?: HRCase; workspace: HRCaseWorkspace | null }) {
  return <section className="grid min-h-[560px] gap-4 xl:grid-cols-[0.95fr_1.35fr]"><div className="rounded-lg border border-[#dfe6e2] bg-white shadow-sm"><div className="border-b border-[#edf1ef] px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">Case Queue</p></div><div className="max-h-[680px] overflow-y-auto p-2">{loading && !cases.length ? <p className="p-6 text-sm font-bold text-[#6b7280]">Loading cases...</p> : null}{!loading && !cases.length ? <p className="p-6 text-sm font-bold text-[#6b7280]">No cases found.</p> : null}{cases.map((item) => <button className={`mb-2 w-full rounded-lg border p-4 text-left transition ${selected?.id === item.id ? "border-[#588368] bg-[#f4f8f5]" : "border-[#edf1ef] bg-white hover:bg-[#f8faf9]"}`} key={item.id} onClick={() => onSelect(item.id)} type="button"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#111827]">{item.case_number}</p><p className="mt-1 text-sm font-bold text-[#111827]">{item.title}</p><p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#6b7280]">{item.description}</p></div><Badge text={label(item.priority)} tone={item.priority} /></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#6b7280]"><span>{label(item.status)}</span><span>·</span><span>{item.category_name || label(item.case_type)}</span>{item.due_at ? <><span>·</span><span>Due {fmtDate(item.due_at)}</span></> : null}</div></button>)}</div></div><div className="rounded-lg border border-[#dfe6e2] bg-white shadow-sm">{selected ? <><div className="border-b border-[#edf1ef] p-5"><div className="flex flex-wrap gap-2"><Badge text={label(selected.status)} /><Badge text={label(selected.confidentiality_level)} tone={selected.confidentiality_level} /><Badge text={label(selected.priority)} tone={selected.priority} /></div><h2 className="mt-4 text-2xl font-black text-[#111827]">{selected.title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-[#6b7280]">{selected.description}</p></div><div className="grid gap-4 p-5 md:grid-cols-2"><Fact label="Category" value={selected.category_name || label(selected.case_type)} /><Fact label="Owner" value={selected.owner_role || selected.owner_user_id || "Unassigned"} /><Fact label="First Response" value={selected.first_response_due_at ? fmtDate(selected.first_response_due_at) : "-"} /><Fact label="Due" value={selected.due_at ? fmtDate(selected.due_at) : "-"} /></div><div className="flex flex-wrap gap-3 border-t border-[#edf1ef] p-5"><button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => onAction("status")} type="button">Status</button><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => onAction("assign")} type="button">Assign</button><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => onAction("comment")} type="button">Comment</button><button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => onAction("attachment")} type="button">Attach</button></div><Timeline workspace={workspace} /></> : <p className="p-8 text-sm font-bold text-[#6b7280]">Select a case to view details.</p>}</div></section>;
}

function Timeline({ workspace }: { workspace: HRCaseWorkspace | null }) {
  const comments = workspace?.comments || [];
  const events = workspace?.events || [];
  const attachments = workspace?.attachments || [];
  return <div className="grid gap-4 border-t border-[#edf1ef] p-5 lg:grid-cols-3"><section className="lg:col-span-2"><h3 className="text-sm font-black text-[#111827]">Comments</h3><div className="mt-3 space-y-3">{comments.length ? comments.map((item) => <div className="rounded-lg bg-[#f8faf9] p-4" key={item.id}><div className="flex justify-between gap-3 text-xs font-black text-[#6b7280]"><span>{label(item.visibility)}</span><span>{fmtDate(item.created_at)}</span></div><p className="mt-2 text-sm font-semibold leading-6 text-[#374151]">{item.body}</p></div>) : <p className="text-sm font-bold text-[#6b7280]">No comments yet.</p>}</div></section><section><h3 className="text-sm font-black text-[#111827]">Files</h3><div className="mt-3 space-y-2">{attachments.length ? attachments.map((item) => <div className="rounded-lg bg-[#f8faf9] p-3" key={item.id}><p className="text-sm font-black text-[#111827]">{item.file_name}</p><p className="mt-1 text-xs font-bold text-[#6b7280]">{label(item.visibility)} · {item.content_type}</p></div>) : <p className="text-sm font-bold text-[#6b7280]">No attachments.</p>}</div><h3 className="mt-5 text-sm font-black text-[#111827]">Events</h3><div className="mt-3 space-y-2">{events.slice(0, 8).map((item) => <div className="rounded-lg bg-[#f8faf9] p-3" key={item.id}><p className="text-sm font-black text-[#111827]">{label(item.event_type)}</p><p className="mt-1 text-xs font-bold text-[#6b7280]">{fmtDate(item.created_at)}</p></div>)}</div></section></div>;
}

function CaseForm({ categories, form, onChange, onSubmit }: { categories: HRCaseCategory[]; form: typeof emptyCase; onChange: (form: typeof emptyCase) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, category_id: event.target.value })} value={form.category_id}><option value="">No category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="Case title" required value={form.title} /><input className={inputClass} onChange={(event) => onChange({ ...form, case_type: event.target.value })} placeholder="Case type" value={form.case_type} /></div><textarea className={areaClass} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Describe the request" required value={form.description} /><div className="grid gap-3 sm:grid-cols-3"><select className={inputClass} onChange={(event) => onChange({ ...form, priority: event.target.value })} value={form.priority}>{["low", "normal", "high", "urgent"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select className={inputClass} onChange={(event) => onChange({ ...form, confidentiality_level: event.target.value })} value={form.confidentiality_level}>{["normal", "restricted", "sensitive", "grievance"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input className={inputClass} onChange={(event) => onChange({ ...form, owner_role: event.target.value })} placeholder="Owner role" value={form.owner_role} /></div><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} onChange={(event) => onChange({ ...form, requester_user_id: event.target.value })} placeholder="Requester user ID" value={form.requester_user_id} /><input className={inputClass} onChange={(event) => onChange({ ...form, subject_employee_user_id: event.target.value })} placeholder="Subject employee user ID" value={form.subject_employee_user_id} /></div><button className={primaryButton} type="submit">Save Case</button></form>;
}

function CategoryForm({ form, onChange, onSubmit }: { form: typeof emptyCategory; onChange: (form: typeof emptyCategory) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} onChange={(event) => onChange({ ...form, code: event.target.value })} placeholder="Code" required value={form.code} /><input className={inputClass} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="Name" required value={form.name} /></div><textarea className={areaClass} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Description" value={form.description} /><div className="grid gap-3 sm:grid-cols-2"><select className={inputClass} onChange={(event) => onChange({ ...form, confidentiality_default: event.target.value })} value={form.confidentiality_default}>{["normal", "restricted", "sensitive", "grievance"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input className={inputClass} onChange={(event) => onChange({ ...form, default_owner_role: event.target.value })} placeholder="Default owner role" value={form.default_owner_role} /></div><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={form.is_active} onChange={(event) => onChange({ ...form, is_active: event.target.checked })} type="checkbox" /> Active</label><button className={primaryButton} type="submit">Save Category</button></form>;
}

function SLAForm({ categories, form, onChange, onSubmit }: { categories: HRCaseCategory[]; form: typeof emptySLA; onChange: (form: typeof emptySLA) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, category_id: event.target.value })} value={form.category_id}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className={inputClass} onChange={(event) => onChange({ ...form, priority: event.target.value })} value={form.priority}>{["low", "normal", "high", "urgent"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><div className="grid gap-3 sm:grid-cols-3"><input className={inputClass} min="0" onChange={(event) => onChange({ ...form, response_hours: event.target.value })} placeholder="Response hours" type="number" value={form.response_hours} /><input className={inputClass} min="1" onChange={(event) => onChange({ ...form, resolution_hours: event.target.value })} placeholder="Resolution hours" type="number" value={form.resolution_hours} /><input className={inputClass} min="1" onChange={(event) => onChange({ ...form, escalation_hours: event.target.value })} placeholder="Escalation hours" type="number" value={form.escalation_hours} /></div><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={form.is_active} onChange={(event) => onChange({ ...form, is_active: event.target.checked })} type="checkbox" /> Active</label><button className={primaryButton} type="submit">Save SLA</button></form>;
}

function StatusForm({ form, onChange, onSubmit }: { form: typeof statusFormDefault; onChange: (form: typeof statusFormDefault) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, status: event.target.value })} value={form.status}>{["new", "open", "in_progress", "waiting_on_employee", "waiting_on_hr", "escalated", "resolved", "closed", "cancelled"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><textarea className={areaClass} onChange={(event) => onChange({ ...form, resolution_summary: event.target.value })} placeholder="Resolution summary" value={form.resolution_summary} /><textarea className={areaClass} onChange={(event) => onChange({ ...form, comment: event.target.value })} placeholder="Internal comment" value={form.comment} /><button className={primaryButton} type="submit">Update Status</button></form>;
}

const statusFormDefault = { status: "in_progress", resolution_summary: "", comment: "" };

function AssignForm({ form, onChange, onSubmit }: { form: typeof assignFormDefault; onChange: (form: typeof assignFormDefault) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><input className={inputClass} onChange={(event) => onChange({ ...form, owner_user_id: event.target.value })} placeholder="Owner user ID" value={form.owner_user_id} /><input className={inputClass} onChange={(event) => onChange({ ...form, owner_role: event.target.value })} placeholder="Owner role" value={form.owner_role} /><textarea className={areaClass} onChange={(event) => onChange({ ...form, comment: event.target.value })} placeholder="Internal note" value={form.comment} /><button className={primaryButton} type="submit">Assign Case</button></form>;
}

const assignFormDefault = { owner_user_id: "", owner_role: "HR", comment: "" };

function CommentForm({ form, onChange, onSubmit }: { form: typeof commentFormDefault; onChange: (form: typeof commentFormDefault) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><select className={inputClass} onChange={(event) => onChange({ ...form, visibility: event.target.value })} value={form.visibility}><option value="public">Public</option><option value="internal">Internal</option></select><textarea className={areaClass} onChange={(event) => onChange({ ...form, body: event.target.value })} placeholder="Comment" required value={form.body} /><button className={primaryButton} type="submit">Add Comment</button></form>;
}

const commentFormDefault = { visibility: "public", body: "" };

function AttachmentForm({ form, onChange, onFile, onSubmit }: { form: typeof attachmentFormDefault; onChange: (form: typeof attachmentFormDefault) => void; onFile: (file?: File) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="grid gap-3" onSubmit={onSubmit}><input className={inputClass} onChange={(event) => void onFile(event.target.files?.[0])} type="file" /><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} onChange={(event) => onChange({ ...form, file_name: event.target.value })} placeholder="File name" required value={form.file_name} /><input className={inputClass} onChange={(event) => onChange({ ...form, content_type: event.target.value })} placeholder="Content type" value={form.content_type} /></div><select className={inputClass} onChange={(event) => onChange({ ...form, visibility: event.target.value })} value={form.visibility}><option value="public">Public</option><option value="internal">Internal</option></select><button className={primaryButton} disabled={!form.file_content_base64 || !form.file_name} type="submit">Attach File</button></form>;
}

const attachmentFormDefault = { visibility: "public", file_name: "", content_type: "application/octet-stream", file_content_base64: "" };

function ConfigTable({ empty, headers, rows }: { empty: string; headers: string[]; rows: string[][] }) {
  return <section className="overflow-hidden rounded-lg border border-[#dfe6e2] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((item) => <th className="px-5 py-4" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.length ? rows.map((row, index) => <tr className="hover:bg-[#f8faf9]" key={index}>{row.map((cell, cellIndex) => <td className="px-5 py-4 text-sm font-bold text-[#374151]" key={cellIndex}>{cell}</td>)}</tr>) : <tr><td className="px-5 py-10 text-center text-sm font-bold text-[#6b7280]" colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div></section>;
}

function Metric({ label: labelText, tone, value }: { label: string; tone?: "danger" | "warning"; value: number }) {
  const color = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-[#111827]";
  return <div className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b7280]">{labelText}</p><p className={`mt-2 text-2xl font-black ${color}`}>{value || 0}</p></div>;
}

function Fact({ label: labelText, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[#f8faf9] px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#6b7280]">{labelText}</p><p className="mt-1 break-words text-sm font-bold text-[#111827]">{value || "-"}</p></div>;
}

function Badge({ text, tone }: { text: string; tone?: string }) {
  const cls = tone === "urgent" || tone === "high" || tone === "sensitive" || tone === "grievance" ? "bg-red-50 text-red-700" : tone === "normal" || tone === "restricted" ? "bg-amber-50 text-amber-700" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${cls}`}>{text}</span>;
}

function summaryValue(page: HRCasePage, key: "overdue_count" | "escalated_count" | "restricted_count") {
  return (page.summary || []).reduce((sum, row) => sum + (row[key] || 0), 0);
}

function label(value?: string | null) {
  return (value || "-").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function cleanPayload<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined)) as Partial<T>;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

const inputClass = "h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]";
const areaClass = "min-h-[96px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]";
const primaryButton = "rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]";
