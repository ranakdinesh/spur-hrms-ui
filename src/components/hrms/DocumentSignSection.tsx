"use client";

import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Tab = "requests" | "workflows" | "templates" | "providers" | "storage";

type StorageSettings = {
  provider: string;
  is_enabled: boolean;
  bucket: string;
  region?: string | null;
  endpoint?: string | null;
  access_key_id?: string | null;
  secret_access_key?: string | null;
  use_ssl: boolean;
  force_path_style: boolean;
  object_prefix?: string | null;
  public_base_url?: string | null;
  max_file_size_bytes: number;
  allowed_content_types: string;
  last_test_status?: string | null;
  last_test_message?: string | null;
};

type Template = {
  id: string;
  code: string;
  name: string;
  document_type: string;
  subject?: string | null;
  body_html?: string | null;
  default_workflow_id?: string | null;
  is_active: boolean;
};

type Workflow = {
  id: string;
  code: string;
  name: string;
  document_type?: string | null;
  initiator_kind: string;
  initiator_value?: string | null;
  is_default: boolean;
  is_active: boolean;
  steps?: WorkflowStep[];
};

type WorkflowStep = {
  id?: string;
  step_order: number;
  step_key: string;
  name: string;
  step_type: "approval" | "review" | "signature" | "cc" | string;
  routing_mode: "sequential" | "parallel" | string;
  actor_kind: "role" | "user" | "requester" | "manager" | "external_email" | string;
  actor_value?: string | null;
  required: boolean;
  allow_delegate: boolean;
  reminder_after_hours: number;
  escalation_after_hours: number;
};

type DocumentRequest = {
  id: string;
  title: string;
  status: string;
  workflow_id: string;
  template_id?: string | null;
  current_step_order?: number | null;
  document_path?: string | null;
  signed_document_path?: string | null;
  created_at: string;
  steps?: RequestStep[];
  artifacts?: Artifact[];
  events?: EventRow[];
  provider_requests?: ProviderRequest[];
};

type RequestStep = WorkflowStep & {
  id: string;
  request_id: string;
  workflow_step_id?: string | null;
  status: string;
  assigned_email?: string | null;
  signature_name?: string | null;
  comments?: string | null;
};

type Artifact = { id: string; artifact_type: string; file_name: string; content_type: string; storage_path: string; created_at: string };
type EventRow = { id: string; action: string; from_status?: string | null; to_status?: string | null; actor_email?: string | null; comments?: string | null; created_at: string };
type ProviderSettings = { id: string; provider: "digio" | "leegality" | "dsc" | "aadhaar_esign" | "custom" | string; display_name: string; is_enabled: boolean; environment: "sandbox" | "production" | string; base_url?: string | null; client_id?: string | null; api_key?: string | null; webhook_secret?: string | null; callback_url?: string | null; default_signature_mode: string; max_retry_attempts: number; retry_backoff_seconds: number; last_test_status?: string | null; last_test_message?: string | null };
type ProviderStepLink = { id: string; workflow_step_id: string; provider_settings_id: string; provider_step_type: string; signature_mode: string; require_signed_document: boolean; require_audit_certificate: boolean };
type ProviderRequest = { id: string; request_step_id: string; provider: string; provider_reference: string; status: string; provider_status?: string | null; redirect_url?: string | null; last_error?: string | null; retry_count: number; completed_at?: string | null; metadata?: Record<string, unknown> | null };

type StorageForm = {
  provider: "minio" | "s3";
  is_enabled: boolean;
  bucket: string;
  region: string;
  endpoint: string;
  access_key_id: string;
  secret_access_key: string;
  use_ssl: boolean;
  force_path_style: boolean;
  object_prefix: string;
  public_base_url: string;
  max_file_size_bytes: string;
  allowed_content_types: string;
};

type WorkflowForm = Omit<Workflow, "id" | "steps"> & { id?: string; steps: WorkflowStep[] };
type TemplateForm = Omit<Template, "id"> & { id?: string };
type RequestForm = { title: string; workflow_id: string; template_id: string; requester_email: string };
type ActionForm = { step_id: string; action: "approve" | "review" | "sign" | "reject" | "comment"; actor_email: string; signature_name: string; signature_method: string; comments: string };
type ArtifactForm = { artifact_type: "source" | "signed" | "audit" | "attachment"; file_name: string; content_type: string; content_base64: string };
type ProviderForm = { provider: ProviderSettings["provider"]; display_name: string; is_enabled: boolean; environment: "sandbox" | "production"; base_url: string; client_id: string; api_key: string; api_secret: string; webhook_secret: string; callback_url: string; default_signature_mode: string; max_retry_attempts: string; retry_backoff_seconds: string };
type ProviderStepForm = { workflow_id: string; workflow_step_id: string; provider_settings_id: string; provider_step_type: string; signature_mode: string; require_signed_document: boolean; require_audit_certificate: boolean };

const emptyStorage: StorageForm = {
  provider: "minio",
  is_enabled: true,
  bucket: "",
  region: "",
  endpoint: "localhost:9000",
  access_key_id: "",
  secret_access_key: "",
  use_ssl: false,
  force_path_style: true,
  object_prefix: "document-sign",
  public_base_url: "",
  max_file_size_bytes: "26214400",
  allowed_content_types: "application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const defaultStep = (order: number, type: WorkflowStep["step_type"] = "approval"): WorkflowStep => ({
  step_order: order,
  step_key: `${type}_${order}`,
  name: type === "signature" ? "Signer" : "Approval",
  step_type: type,
  routing_mode: "sequential",
  actor_kind: type === "signature" ? "requester" : "role",
  actor_value: "",
  required: true,
  allow_delegate: false,
  reminder_after_hours: 24,
  escalation_after_hours: 72,
});

const emptyWorkflow: WorkflowForm = {
  code: "",
  name: "",
  document_type: "",
  initiator_kind: "permission",
  initiator_value: "requests.create",
  is_default: false,
  is_active: true,
  steps: [defaultStep(1), defaultStep(2, "signature")],
};

const emptyTemplate: TemplateForm = {
  code: "",
  name: "",
  document_type: "",
  subject: "",
  body_html: "",
  default_workflow_id: "",
  is_active: true,
};

const emptyRequest: RequestForm = { title: "", workflow_id: "", template_id: "", requester_email: "" };
const emptyAction: ActionForm = { step_id: "", action: "approve", actor_email: "", signature_name: "", signature_method: "typed", comments: "" };
const emptyArtifact: ArtifactForm = { artifact_type: "source", file_name: "", content_type: "application/pdf", content_base64: "" };
const emptyProvider: ProviderForm = { provider: "custom", display_name: "", is_enabled: false, environment: "sandbox", base_url: "", client_id: "", api_key: "", api_secret: "", webhook_secret: "", callback_url: "", default_signature_mode: "electronic", max_retry_attempts: "5", retry_backoff_seconds: "300" };
const emptyProviderStep: ProviderStepForm = { workflow_id: "", workflow_step_id: "", provider_settings_id: "", provider_step_type: "esign", signature_mode: "electronic", require_signed_document: true, require_audit_certificate: true };

function optional(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function InfoButton({ text }: { text: string }) {
  return <button className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" title={text} type="button">i</button>;
}

export function DocumentSignSection() {
  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [storage, setStorage] = useState<StorageSettings | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [providers, setProviders] = useState<ProviderSettings[]>([]);
  const [providerLinks, setProviderLinks] = useState<ProviderStepLink[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageOpen, setStorageOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerStepOpen, setProviderStepOpen] = useState(false);
  const [storageForm, setStorageForm] = useState<StorageForm>(emptyStorage);
  const [workflowForm, setWorkflowForm] = useState<WorkflowForm>(emptyWorkflow);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate);
  const [requestForm, setRequestForm] = useState<RequestForm>(emptyRequest);
  const [actionForm, setActionForm] = useState<ActionForm>(emptyAction);
  const [artifactForm, setArtifactForm] = useState<ArtifactForm>(emptyArtifact);
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProvider);
  const [providerStepForm, setProviderStepForm] = useState<ProviderStepForm>(emptyProviderStep);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [workflowRows, templateRows, requestRows, storageRow, providerRows, providerLinkRows] = await Promise.all([
        apiRequest<Workflow[]>("/document-sign/workflows").catch(() => []),
        apiRequest<Template[]>("/document-sign/templates").catch(() => []),
        apiRequest<DocumentRequest[]>("/document-sign/requests").catch(() => []),
        apiRequest<StorageSettings>("/document-sign/storage-provider-settings").catch(() => null),
        apiRequest<ProviderSettings[]>("/document-sign/esign/providers").catch(() => []),
        apiRequest<ProviderStepLink[]>("/document-sign/esign/provider-step-links").catch(() => []),
      ]);
      setWorkflows(workflowRows);
      setTemplates(templateRows);
      setRequests(requestRows);
      setStorage(storageRow);
      setProviders(providerRows);
      setProviderLinks(providerLinkRows);
      if (storageRow) setStorageForm(settingsToForm(storageRow));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load document sign workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const stats = useMemo(() => ({
    pending: requests.filter((item) => item.status === "pending").length,
    completed: requests.filter((item) => item.status === "completed").length,
    workflows: workflows.length,
    templates: templates.length,
    providers: providers.length,
  }), [providers, requests, templates, workflows]);

  async function saveStorage() {
    setError("");
    const saved = await apiRequest<StorageSettings>("/document-sign/storage-provider-settings", {
      method: "PUT",
      body: {
        ...storageForm,
        region: optional(storageForm.region),
        endpoint: optional(storageForm.endpoint),
        access_key_id: optional(storageForm.access_key_id),
        secret_access_key: optional(storageForm.secret_access_key),
        object_prefix: optional(storageForm.object_prefix),
        public_base_url: optional(storageForm.public_base_url),
        max_file_size_bytes: Number(storageForm.max_file_size_bytes || 0),
      },
    });
    setStorage(saved);
    setStorageOpen(false);
    setNotice("Storage settings saved.");
  }

  async function testStorage() {
    setError("");
    try {
      const saved = await apiRequest<StorageSettings>("/document-sign/storage-provider-settings/test", { method: "POST" });
      setStorage(saved);
      setNotice("Storage connection verified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Storage test failed.");
      void load();
    }
  }

  async function saveWorkflow() {
    setError("");
    const body = {
      ...workflowForm,
      document_type: optional(workflowForm.document_type || ""),
      initiator_value: optional(workflowForm.initiator_value || ""),
      steps: workflowForm.steps.map((step) => ({ ...step, actor_value: optional(step.actor_value || "") })),
    };
    const path = workflowForm.id ? `/document-sign/workflows/${workflowForm.id}` : "/document-sign/workflows";
    await apiRequest<Workflow>(path, { method: workflowForm.id ? "PUT" : "POST", body });
    setWorkflowOpen(false);
    setWorkflowForm(emptyWorkflow);
    setNotice("Workflow saved.");
    await load();
  }

  async function saveTemplate() {
    setError("");
    const body = { ...templateForm, subject: optional(templateForm.subject || ""), body_html: optional(templateForm.body_html || ""), default_workflow_id: optional(templateForm.default_workflow_id || "") };
    const path = templateForm.id ? `/document-sign/templates/${templateForm.id}` : "/document-sign/templates";
    await apiRequest<Template>(path, { method: templateForm.id ? "PUT" : "POST", body });
    setTemplateOpen(false);
    setTemplateForm(emptyTemplate);
    setNotice("Template saved.");
    await load();
  }

  async function createRequest() {
    setError("");
    const item = await apiRequest<DocumentRequest>("/document-sign/requests", {
      method: "POST",
      body: {
        title: requestForm.title,
        workflow_id: requestForm.workflow_id,
        template_id: optional(requestForm.template_id),
        requester_email: optional(requestForm.requester_email),
      },
    });
    setRequestOpen(false);
    setRequestForm(emptyRequest);
    setNotice("Request created.");
    await load();
    await openRequest(item.id);
  }

  async function openRequest(id: string) {
    const item = await apiRequest<DocumentRequest>(`/document-sign/requests/${id}`);
    setSelectedRequest(item);
  }

  async function actOnStep() {
    if (!selectedRequest) return;
    setError("");
    const item = await apiRequest<DocumentRequest>(`/document-sign/requests/${selectedRequest.id}/actions`, {
      method: "POST",
      body: {
        ...actionForm,
        actor_email: optional(actionForm.actor_email),
        signature_name: optional(actionForm.signature_name),
        signature_method: optional(actionForm.signature_method),
        comments: optional(actionForm.comments),
      },
    });
    setActionOpen(false);
    setSelectedRequest(item);
    setNotice("Action recorded.");
    await load();
  }

  async function recallRequest() {
    if (!selectedRequest) return;
    const item = await apiRequest<DocumentRequest>(`/document-sign/requests/${selectedRequest.id}/recall`, { method: "POST", body: { comments: "Recalled from workspace." } });
    setSelectedRequest(item);
    setNotice("Request recalled.");
    await load();
  }

  async function storeArtifact() {
    if (!selectedRequest) return;
    setError("");
    const artifact = await apiRequest<Artifact>(`/document-sign/requests/${selectedRequest.id}/artifacts`, { method: "POST", body: artifactForm });
    setArtifactOpen(false);
    setArtifactForm(emptyArtifact);
    setNotice(`${artifact.file_name} uploaded.`);
    await openRequest(selectedRequest.id);
    await load();
  }

  async function saveProvider() {
    setError("");
    const saved = await apiRequest<ProviderSettings>("/document-sign/esign/providers", {
      method: "PUT",
      body: {
        ...providerForm,
        base_url: optional(providerForm.base_url),
        client_id: optional(providerForm.client_id),
        api_key: optional(providerForm.api_key),
        api_secret: optional(providerForm.api_secret),
        webhook_secret: optional(providerForm.webhook_secret),
        callback_url: optional(providerForm.callback_url),
        max_retry_attempts: Number(providerForm.max_retry_attempts || 0),
        retry_backoff_seconds: Number(providerForm.retry_backoff_seconds || 0),
      },
    });
    setProviderOpen(false);
    setProviderForm(emptyProvider);
    setNotice(`${saved.display_name} saved.`);
    await load();
  }

  async function testProvider(provider: string) {
    setError("");
    try {
      await apiRequest<ProviderSettings>(`/document-sign/esign/providers/${provider}/test`, { method: "POST" });
      setNotice("Provider settings verified.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provider test failed.");
      await load();
    }
  }

  async function saveProviderStepLink() {
    setError("");
    await apiRequest<ProviderStepLink>(`/document-sign/workflows/${providerStepForm.workflow_id}/steps/${providerStepForm.workflow_step_id}/provider`, {
      method: "PUT",
      body: {
        provider_settings_id: providerStepForm.provider_settings_id,
        provider_step_type: providerStepForm.provider_step_type,
        signature_mode: providerStepForm.signature_mode,
        require_signed_document: providerStepForm.require_signed_document,
        require_audit_certificate: providerStepForm.require_audit_certificate,
      },
    });
    setProviderStepOpen(false);
    setProviderStepForm(emptyProviderStep);
    setNotice("Provider step link saved.");
    await load();
  }

  async function startProviderStep(stepID: string) {
    if (!selectedRequest) return;
    setError("");
    const providerRequest = await apiRequest<ProviderRequest>(`/document-sign/requests/${selectedRequest.id}/steps/${stepID}/provider/start`, { method: "POST" });
    setNotice(`Provider request ${providerRequest.status}.`);
    await openRequest(selectedRequest.id);
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const bytes = new Uint8Array(data);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    setArtifactForm((current) => ({ ...current, file_name: file.name, content_type: file.type || current.content_type, content_base64: btoa(binary) }));
  }

  const pendingSteps = selectedRequest?.steps?.filter((step) => step.status === "pending") || [];
  const linkedWorkflowStepIDs = useMemo(() => new Set(providerLinks.map((item) => item.workflow_step_id)), [providerLinks]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Document Sign</p>
          <h1 className="mt-2 text-3xl font-black text-[#111827]">Workflow Requests</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => { setStorageForm(storage ? settingsToForm(storage) : emptyStorage); setStorageOpen(true); }} type="button">Storage</button>
          <button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => { setProviderForm(emptyProvider); setProviderOpen(true); }} type="button">Provider</button>
          <button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => { setTemplateForm(emptyTemplate); setTemplateOpen(true); }} type="button">New Template</button>
          <button className="rounded-lg border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => { setWorkflowForm(emptyWorkflow); setWorkflowOpen(true); }} type="button">New Workflow</button>
          <button className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-black text-white disabled:opacity-60" disabled={workflows.length === 0} onClick={() => { setRequestForm({ ...emptyRequest, workflow_id: workflows[0]?.id || "", template_id: templates[0]?.id || "" }); setRequestOpen(true); }} type="button">New Request</button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Pending" value={stats.pending} />
        <Metric label="Completed" value={stats.completed} />
        <Metric label="Workflows" value={stats.workflows} />
        <Metric label="Templates" value={stats.templates} />
        <Metric label="Providers" value={stats.providers} />
      </section>

      <div className="flex flex-wrap gap-2 border-b border-[#edf1ef]">
        {(["requests", "workflows", "templates", "providers", "storage"] as Tab[]).map((tab) => (
          <button className={`border-b-2 px-3 py-3 text-sm font-black capitalize ${activeTab === tab ? "border-[#588368] text-[#111827]" : "border-transparent text-[#6b7280]"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>
        ))}
      </div>

      {activeTab === "requests" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border border-[#edf1ef] bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f8faf9] text-xs uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Request</th><th>Status</th><th>Step</th><th>Created</th><th></th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? <tr><td className="px-4 py-8 text-center font-semibold text-[#6b7280]" colSpan={5}>Loading...</td></tr> : null}
                {!loading && requests.length === 0 ? <tr><td className="px-4 py-8 text-center font-semibold text-[#6b7280]" colSpan={5}>No requests yet.</td></tr> : null}
                {requests.map((item) => <tr key={item.id}><td className="px-4 py-3 font-black text-[#111827]">{item.title}</td><td><Status value={item.status} /></td><td>{item.current_step_order || "-"}</td><td>{dateOnly(item.created_at)}</td><td><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => void openRequest(item.id)} type="button">Open</button></td></tr>)}
              </tbody>
            </table>
          </div>
          <RequestDetail item={selectedRequest} linkedWorkflowStepIDs={linkedWorkflowStepIDs} onAction={() => { setActionForm({ ...emptyAction, step_id: pendingSteps[0]?.id || "" }); setActionOpen(true); }} onProviderStart={(stepID) => void startProviderStep(stepID)} onRecall={() => void recallRequest()} onUpload={() => setArtifactOpen(true)} pendingSteps={pendingSteps} />
        </section>
      ) : activeTab === "workflows" ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map((item) => <article className="rounded-lg border border-[#edf1ef] bg-white p-4" key={item.id}><div className="flex justify-between gap-3"><div><h2 className="font-black text-[#111827]">{item.name}</h2><p className="mt-1 text-xs font-bold uppercase text-[#6b7280]">{item.code}</p></div><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => { void apiRequest<Workflow>(`/document-sign/workflows/${item.id}`).then((workflow) => { setWorkflowForm(workflowToForm(workflow)); setWorkflowOpen(true); }); }} type="button">Edit</button></div><div className="mt-4 flex flex-wrap gap-2"><Status value={item.is_active ? "active" : "inactive"} /><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{item.document_type || "Any"}</span></div></article>)}
        </section>
      ) : activeTab === "templates" ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((item) => <article className="rounded-lg border border-[#edf1ef] bg-white p-4" key={item.id}><div className="flex justify-between gap-3"><div><h2 className="font-black text-[#111827]">{item.name}</h2><p className="mt-1 text-xs font-bold uppercase text-[#6b7280]">{item.document_type}</p></div><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => { setTemplateForm(templateToForm(item)); setTemplateOpen(true); }} type="button">Edit</button></div><p className="mt-3 text-sm font-semibold text-[#4b5563]">{item.subject || "No subject"}</p></article>)}
        </section>
      ) : activeTab === "providers" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 md:grid-cols-2">
            {providers.length === 0 ? <div className="rounded-lg border border-[#edf1ef] bg-white p-5 text-sm font-semibold text-[#6b7280]">No provider settings yet.</div> : null}
            {providers.map((item) => <article className="rounded-lg border border-[#edf1ef] bg-white p-4" key={item.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-[#111827]">{item.display_name}</h2><p className="mt-1 text-xs font-bold uppercase text-[#6b7280]">{item.provider} / {item.environment}</p></div><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => { setProviderForm(providerToForm(item)); setProviderOpen(true); }} type="button">Edit</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => void testProvider(item.provider)} type="button">Test</button></div></div><div className="mt-4 flex flex-wrap gap-2"><Status value={item.is_enabled ? "enabled" : "disabled"} /><Status value={item.default_signature_mode} />{item.last_test_status ? <Status value={item.last_test_status} /> : null}</div></article>)}
          </div>
          <aside className="rounded-lg border border-[#edf1ef] bg-white p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-[#111827]">Step Links</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{providerLinks.length} linked steps</p></div><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black disabled:opacity-50" disabled={providers.length === 0 || workflows.length === 0} onClick={() => setProviderStepLinkDefaults(workflows, providers, setProviderStepForm, setProviderStepOpen)} type="button">Link</button></div>
            <div className="mt-4 space-y-2">{providerLinks.map((link) => <div className="rounded-lg bg-[#f8faf9] p-3 text-sm" key={link.id}><strong className="text-[#111827]">{workflowStepName(workflows, link.workflow_step_id)}</strong><p className="mt-1 text-xs font-bold uppercase text-[#6b7280]">{providerName(providers, link.provider_settings_id)} / {link.signature_mode}</p></div>)}</div>
          </aside>
        </section>
      ) : (
        <section className="rounded-lg border border-[#edf1ef] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-black text-[#111827]">{storage?.bucket || "No storage configured"}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{storage?.provider || "minio"} {storage?.endpoint ? `- ${storage.endpoint}` : ""}</p></div>
            <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => void testStorage()} type="button">Test</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Status value={storage?.is_enabled ? "enabled" : "disabled"} />{storage?.last_test_status ? <Status value={storage.last_test_status} /> : null}</div>
        </section>
      )}

      <HrmsModal onClose={() => setStorageOpen(false)} open={storageOpen} title="Storage Settings">
        <StorageFormView form={storageForm} onChange={setStorageForm} onSubmit={() => void saveStorage()} />
      </HrmsModal>
      <HrmsModal onClose={() => setWorkflowOpen(false)} open={workflowOpen} title="Workflow">
        <WorkflowFormView form={workflowForm} onChange={setWorkflowForm} onSubmit={() => void saveWorkflow()} />
      </HrmsModal>
      <HrmsModal onClose={() => setTemplateOpen(false)} open={templateOpen} title="Template">
        <TemplateFormView form={templateForm} workflows={workflows} onChange={setTemplateForm} onSubmit={() => void saveTemplate()} />
      </HrmsModal>
      <HrmsModal onClose={() => setRequestOpen(false)} open={requestOpen} title="Request">
        <RequestFormView form={requestForm} templates={templates} workflows={workflows} onChange={setRequestForm} onSubmit={() => void createRequest()} />
      </HrmsModal>
      <HrmsModal onClose={() => setActionOpen(false)} open={actionOpen} title="Step Action">
        <ActionFormView form={actionForm} pendingSteps={pendingSteps} onChange={setActionForm} onSubmit={() => void actOnStep()} />
      </HrmsModal>
      <HrmsModal onClose={() => setArtifactOpen(false)} open={artifactOpen} title="Upload Artifact">
        <ArtifactFormView form={artifactForm} onChange={setArtifactForm} onFile={readFile} onSubmit={() => void storeArtifact()} />
      </HrmsModal>
      <HrmsModal onClose={() => setProviderOpen(false)} open={providerOpen} title="E-Sign Provider">
        <ProviderFormView form={providerForm} onChange={setProviderForm} onSubmit={() => void saveProvider()} />
      </HrmsModal>
      <HrmsModal onClose={() => setProviderStepOpen(false)} open={providerStepOpen} title="Provider Step Link">
        <ProviderStepFormView form={providerStepForm} providers={providers} workflows={workflows} onChange={setProviderStepForm} onSubmit={() => void saveProviderStepLink()} />
      </HrmsModal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-[#edf1ef] bg-white p-4"><p className="text-xs font-black uppercase text-[#6b7280]">{label}</p><strong className="mt-2 block text-2xl text-[#111827]">{value}</strong></div>;
}

function Status({ value }: { value: string }) {
  const tone = ["completed", "ok", "active", "enabled"].includes(value) ? "bg-[#e7f6ed] text-[#237a45]" : ["rejected", "failed", "disabled", "inactive", "recalled"].includes(value) ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone}`}>{value}</span>;
}

function RequestDetail({ item, linkedWorkflowStepIDs, onAction, onProviderStart, onRecall, onUpload, pendingSteps }: { item: DocumentRequest | null; linkedWorkflowStepIDs: Set<string>; onAction: () => void; onProviderStart: (stepID: string) => void; onRecall: () => void; onUpload: () => void; pendingSteps: RequestStep[] }) {
  if (!item) return <aside className="rounded-lg border border-[#edf1ef] bg-white p-5 text-sm font-semibold text-[#6b7280]">Open a request to view workflow steps.</aside>;
  return (
    <aside className="rounded-lg border border-[#edf1ef] bg-white p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-[#111827]">{item.title}</h2><div className="mt-2"><Status value={item.status} /></div></div><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black disabled:opacity-50" disabled={pendingSteps.length === 0} onClick={onAction} type="button">Act</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={onUpload} type="button">Upload</button><button className="rounded-lg border border-[#fee2e2] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={onRecall} type="button">Recall</button></div></div>
      <div className="mt-5 space-y-3">{item.steps?.map((step) => {
        const providerRequest = item.provider_requests?.find((row) => row.request_step_id === step.id);
        const canStartProvider = step.status === "pending" && step.step_type === "signature" && !!step.workflow_step_id && linkedWorkflowStepIDs.has(step.workflow_step_id);
        return <div className="rounded-lg border border-[#edf1ef] p-3" key={step.id}><div className="flex items-center justify-between gap-2"><strong className="text-sm text-[#111827]">{step.step_order}. {step.name}</strong><Status value={step.status} /></div><p className="mt-1 text-xs font-bold uppercase text-[#6b7280]">{step.step_type} / {step.actor_kind}</p>{providerRequest ? <div className="mt-3 flex flex-wrap items-center gap-2"><Status value={providerRequest.status} /><span className="text-xs font-bold text-[#6b7280]">{providerRequest.provider_reference}</span>{providerRequest.redirect_url ? <a className="text-xs font-black text-[#2563eb]" href={providerRequest.redirect_url} rel="noreferrer" target="_blank">Open</a> : null}</div> : canStartProvider ? <button className="mt-3 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onProviderStart(step.id)} type="button">Start Provider</button> : null}</div>;
      })}</div>
      <h3 className="mt-6 text-sm font-black uppercase text-[#6b7280]">Audit</h3>
      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">{item.events?.map((event) => <div className="rounded-lg bg-[#f8faf9] p-3 text-sm" key={event.id}><strong className="text-[#111827]">{event.action}</strong><p className="text-xs font-semibold text-[#6b7280]">{dateOnly(event.created_at)} {event.to_status ? `- ${event.to_status}` : ""}</p></div>)}</div>
    </aside>
  );
}

function Field({ children, label, info }: { children: ReactNode; label: string; info?: string }) {
  return <label className="block text-sm font-bold text-[#374151]"><span className="mb-2 flex items-center gap-2">{label}{info ? <InfoButton text={info} /> : null}</span>{children}</label>;
}

const inputClass = "h-11 w-full rounded-lg border border-[#dbe0e5] px-3 text-sm outline-none focus:border-[#588368]";
const textareaClass = "min-h-[90px] w-full rounded-lg border border-[#dbe0e5] px-3 py-3 text-sm outline-none focus:border-[#588368]";
const primaryClass = "rounded-lg bg-[#111827] px-4 py-3 text-sm font-black text-white disabled:opacity-60";

function StorageFormView({ form, onChange, onSubmit }: { form: StorageForm; onChange: (form: StorageForm) => void; onSubmit: () => void }) {
  return <div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Provider"><select className={inputClass} value={form.provider} onChange={(e) => onChange({ ...form, provider: e.target.value as StorageForm["provider"] })}><option value="minio">MinIO</option><option value="s3">S3</option></select></Field><Field label="Bucket"><input className={inputClass} value={form.bucket} onChange={(e) => onChange({ ...form, bucket: e.target.value })} /></Field><Field label="Endpoint" info="Required for MinIO or S3-compatible tenant storage."><input className={inputClass} value={form.endpoint} onChange={(e) => onChange({ ...form, endpoint: e.target.value })} /></Field><Field label="Region"><input className={inputClass} value={form.region} onChange={(e) => onChange({ ...form, region: e.target.value })} /></Field><Field label="Access Key"><input className={inputClass} value={form.access_key_id} onChange={(e) => onChange({ ...form, access_key_id: e.target.value })} /></Field><Field label="Secret Key"><input className={inputClass} type="password" value={form.secret_access_key} onChange={(e) => onChange({ ...form, secret_access_key: e.target.value })} /></Field><Field label="Object Prefix"><input className={inputClass} value={form.object_prefix} onChange={(e) => onChange({ ...form, object_prefix: e.target.value })} /></Field><Field label="Max Bytes"><input className={inputClass} type="number" value={form.max_file_size_bytes} onChange={(e) => onChange({ ...form, max_file_size_bytes: e.target.value })} /></Field></div><Field label="Allowed Content Types"><input className={inputClass} value={form.allowed_content_types} onChange={(e) => onChange({ ...form, allowed_content_types: e.target.value })} /></Field><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.is_enabled} onChange={(e) => onChange({ ...form, is_enabled: e.target.checked })} type="checkbox" /> Enabled</label><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.use_ssl} onChange={(e) => onChange({ ...form, use_ssl: e.target.checked })} type="checkbox" /> SSL</label><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.force_path_style} onChange={(e) => onChange({ ...form, force_path_style: e.target.checked })} type="checkbox" /> Path style</label></div><button className={primaryClass} disabled={!form.bucket.trim()} onClick={onSubmit} type="button">Save Storage</button></div>;
}

function WorkflowFormView({ form, onChange, onSubmit }: { form: WorkflowForm; onChange: (form: WorkflowForm) => void; onSubmit: () => void }) {
  return <div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Code"><input className={inputClass} value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value })} /></Field><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field><Field label="Document Type"><input className={inputClass} value={form.document_type || ""} onChange={(e) => onChange({ ...form, document_type: e.target.value })} /></Field><Field label="Initiator"><select className={inputClass} value={form.initiator_kind} onChange={(e) => onChange({ ...form, initiator_kind: e.target.value })}><option value="permission">Permission</option><option value="role">Role</option><option value="user">User</option><option value="any_authenticated">Any signed-in user</option></select></Field></div><div className="space-y-3">{form.steps.map((step, index) => <div className="rounded-lg border border-[#edf1ef] p-3" key={index}><div className="grid gap-3 md:grid-cols-3"><Field label="Order"><input className={inputClass} type="number" value={step.step_order} onChange={(e) => updateStep(form, onChange, index, { step_order: Number(e.target.value) })} /></Field><Field label="Name"><input className={inputClass} value={step.name} onChange={(e) => updateStep(form, onChange, index, { name: e.target.value })} /></Field><Field label="Type"><select className={inputClass} value={step.step_type} onChange={(e) => updateStep(form, onChange, index, { step_type: e.target.value })}><option value="approval">Approval</option><option value="review">Review</option><option value="signature">Signature</option><option value="cc">CC</option></select></Field><Field label="Actor"><select className={inputClass} value={step.actor_kind} onChange={(e) => updateStep(form, onChange, index, { actor_kind: e.target.value })}><option value="role">Role</option><option value="user">User</option><option value="requester">Requester</option><option value="manager">Manager</option><option value="external_email">External Email</option></select></Field><Field label="Actor Value"><input className={inputClass} value={step.actor_value || ""} onChange={(e) => updateStep(form, onChange, index, { actor_value: e.target.value })} /></Field><Field label="Routing"><select className={inputClass} value={step.routing_mode} onChange={(e) => updateStep(form, onChange, index, { routing_mode: e.target.value })}><option value="sequential">Sequential</option><option value="parallel">Parallel</option></select></Field></div></div>)}</div><button className="rounded-lg border border-[#dbe0e5] px-4 py-3 text-sm font-black" onClick={() => onChange({ ...form, steps: [...form.steps, defaultStep(form.steps.length + 1)] })} type="button">Add Step</button><button className={primaryClass} disabled={!form.code.trim() || !form.name.trim() || form.steps.length === 0} onClick={onSubmit} type="button">Save Workflow</button></div>;
}

function TemplateFormView({ form, workflows, onChange, onSubmit }: { form: TemplateForm; workflows: Workflow[]; onChange: (form: TemplateForm) => void; onSubmit: () => void }) {
  return <div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Code"><input className={inputClass} value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value })} /></Field><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field><Field label="Document Type"><input className={inputClass} value={form.document_type} onChange={(e) => onChange({ ...form, document_type: e.target.value })} /></Field><Field label="Workflow"><select className={inputClass} value={form.default_workflow_id || ""} onChange={(e) => onChange({ ...form, default_workflow_id: e.target.value })}><option value="">None</option>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select></Field></div><Field label="Subject"><input className={inputClass} value={form.subject || ""} onChange={(e) => onChange({ ...form, subject: e.target.value })} /></Field><Field label="Body"><textarea className={textareaClass} value={form.body_html || ""} onChange={(e) => onChange({ ...form, body_html: e.target.value })} /></Field><button className={primaryClass} disabled={!form.code.trim() || !form.name.trim() || !form.document_type.trim()} onClick={onSubmit} type="button">Save Template</button></div>;
}

function RequestFormView({ form, workflows, templates, onChange, onSubmit }: { form: RequestForm; workflows: Workflow[]; templates: Template[]; onChange: (form: RequestForm) => void; onSubmit: () => void }) {
  return <div className="grid gap-4"><Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} /></Field><Field label="Workflow"><select className={inputClass} value={form.workflow_id} onChange={(e) => onChange({ ...form, workflow_id: e.target.value })}>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select></Field><Field label="Template"><select className={inputClass} value={form.template_id} onChange={(e) => onChange({ ...form, template_id: e.target.value })}><option value="">None</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field><Field label="Requester Email"><input className={inputClass} value={form.requester_email} onChange={(e) => onChange({ ...form, requester_email: e.target.value })} /></Field><button className={primaryClass} disabled={!form.title.trim() || !form.workflow_id} onClick={onSubmit} type="button">Create Request</button></div>;
}

function ActionFormView({ form, pendingSteps, onChange, onSubmit }: { form: ActionForm; pendingSteps: RequestStep[]; onChange: (form: ActionForm) => void; onSubmit: () => void }) {
  return <div className="grid gap-4"><Field label="Step"><select className={inputClass} value={form.step_id} onChange={(e) => onChange({ ...form, step_id: e.target.value })}>{pendingSteps.map((step) => <option key={step.id} value={step.id}>{step.name}</option>)}</select></Field><Field label="Action"><select className={inputClass} value={form.action} onChange={(e) => onChange({ ...form, action: e.target.value as ActionForm["action"] })}><option value="approve">Approve</option><option value="review">Review</option><option value="sign">Sign</option><option value="reject">Reject</option><option value="comment">Comment</option></select></Field><div className="grid gap-3 md:grid-cols-2"><Field label="Actor Email"><input className={inputClass} value={form.actor_email} onChange={(e) => onChange({ ...form, actor_email: e.target.value })} /></Field><Field label="Signature Name"><input className={inputClass} value={form.signature_name} onChange={(e) => onChange({ ...form, signature_name: e.target.value })} /></Field></div><Field label="Comments"><textarea className={textareaClass} value={form.comments} onChange={(e) => onChange({ ...form, comments: e.target.value })} /></Field><button className={primaryClass} disabled={!form.step_id} onClick={onSubmit} type="button">Record Action</button></div>;
}

function ArtifactFormView({ form, onChange, onFile, onSubmit }: { form: ArtifactForm; onChange: (form: ArtifactForm) => void; onFile: (event: ChangeEvent<HTMLInputElement>) => void; onSubmit: () => void }) {
  return <div className="grid gap-4"><Field label="Artifact Type"><select className={inputClass} value={form.artifact_type} onChange={(e) => onChange({ ...form, artifact_type: e.target.value as ArtifactForm["artifact_type"] })}><option value="source">Source</option><option value="signed">Signed</option><option value="audit">Audit</option><option value="attachment">Attachment</option></select></Field><Field label="File"><input className={inputClass} onChange={onFile} type="file" /></Field><Field label="Content Type"><input className={inputClass} value={form.content_type} onChange={(e) => onChange({ ...form, content_type: e.target.value })} /></Field><button className={primaryClass} disabled={!form.content_base64 || !form.file_name} onClick={onSubmit} type="button">Upload</button></div>;
}

function ProviderFormView({ form, onChange, onSubmit }: { form: ProviderForm; onChange: (form: ProviderForm) => void; onSubmit: () => void }) {
  return <div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Provider"><select className={inputClass} value={form.provider} onChange={(e) => onChange({ ...form, provider: e.target.value })}><option value="digio">Digio</option><option value="leegality">Leegality</option><option value="dsc">DSC</option><option value="aadhaar_esign">Aadhaar eSign</option><option value="custom">Custom</option></select></Field><Field label="Display Name"><input className={inputClass} value={form.display_name} onChange={(e) => onChange({ ...form, display_name: e.target.value })} /></Field><Field label="Environment"><select className={inputClass} value={form.environment} onChange={(e) => onChange({ ...form, environment: e.target.value as ProviderForm["environment"] })}><option value="sandbox">Sandbox</option><option value="production">Production</option></select></Field><Field label="Signature Mode"><select className={inputClass} value={form.default_signature_mode} onChange={(e) => onChange({ ...form, default_signature_mode: e.target.value })}><option value="electronic">Electronic</option><option value="aadhaar">Aadhaar</option><option value="dsc">DSC</option><option value="otp">OTP</option><option value="custom">Custom</option></select></Field><Field label="Base URL" info="Provider-specific API endpoint when this tenant uses its own account."><input className={inputClass} value={form.base_url} onChange={(e) => onChange({ ...form, base_url: e.target.value })} /></Field><Field label="Callback URL" info="Where provider signing screens should return after completion."><input className={inputClass} value={form.callback_url} onChange={(e) => onChange({ ...form, callback_url: e.target.value })} /></Field><Field label="Client ID"><input className={inputClass} value={form.client_id} onChange={(e) => onChange({ ...form, client_id: e.target.value })} /></Field><Field label="API Key"><input className={inputClass} value={form.api_key} onChange={(e) => onChange({ ...form, api_key: e.target.value })} /></Field><Field label="API Secret"><input className={inputClass} type="password" value={form.api_secret} onChange={(e) => onChange({ ...form, api_secret: e.target.value })} /></Field><Field label="Webhook Secret" info="Used to verify HMAC signatures on provider webhooks."><input className={inputClass} type="password" value={form.webhook_secret} onChange={(e) => onChange({ ...form, webhook_secret: e.target.value })} /></Field><Field label="Max Retries"><input className={inputClass} type="number" value={form.max_retry_attempts} onChange={(e) => onChange({ ...form, max_retry_attempts: e.target.value })} /></Field><Field label="Retry Backoff"><input className={inputClass} type="number" value={form.retry_backoff_seconds} onChange={(e) => onChange({ ...form, retry_backoff_seconds: e.target.value })} /></Field></div><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.is_enabled} onChange={(e) => onChange({ ...form, is_enabled: e.target.checked })} type="checkbox" /> Enabled</label><button className={primaryClass} disabled={!form.display_name.trim()} onClick={onSubmit} type="button">Save Provider</button></div>;
}

function ProviderStepFormView({ form, providers, workflows, onChange, onSubmit }: { form: ProviderStepForm; providers: ProviderSettings[]; workflows: Workflow[]; onChange: (form: ProviderStepForm) => void; onSubmit: () => void }) {
  const selectedWorkflow = workflows.find((workflow) => workflow.id === form.workflow_id);
  const signatureSteps = selectedWorkflow?.steps?.filter((step) => step.step_type === "signature" && step.id) || [];
  return <div className="grid gap-4"><Field label="Workflow"><select className={inputClass} value={form.workflow_id} onChange={(e) => { const workflow = workflows.find((item) => item.id === e.target.value); const firstStep = workflow?.steps?.find((step) => step.step_type === "signature" && step.id); onChange({ ...form, workflow_id: e.target.value, workflow_step_id: firstStep?.id || "" }); }}>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select></Field><Field label="Signature Step"><select className={inputClass} value={form.workflow_step_id} onChange={(e) => onChange({ ...form, workflow_step_id: e.target.value })}>{signatureSteps.map((step) => <option key={step.id} value={step.id}>{step.name}</option>)}</select></Field><Field label="Provider"><select className={inputClass} value={form.provider_settings_id} onChange={(e) => onChange({ ...form, provider_settings_id: e.target.value })}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.display_name}</option>)}</select></Field><div className="grid gap-3 md:grid-cols-2"><Field label="Provider Step"><select className={inputClass} value={form.provider_step_type} onChange={(e) => onChange({ ...form, provider_step_type: e.target.value })}><option value="esign">eSign</option><option value="aadhaar">Aadhaar</option><option value="dsc">DSC</option><option value="provider_review">Provider Review</option></select></Field><Field label="Signature Mode"><select className={inputClass} value={form.signature_mode} onChange={(e) => onChange({ ...form, signature_mode: e.target.value })}><option value="electronic">Electronic</option><option value="aadhaar">Aadhaar</option><option value="dsc">DSC</option><option value="otp">OTP</option><option value="custom">Custom</option></select></Field></div><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.require_signed_document} onChange={(e) => onChange({ ...form, require_signed_document: e.target.checked })} type="checkbox" /> Signed document</label><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.require_audit_certificate} onChange={(e) => onChange({ ...form, require_audit_certificate: e.target.checked })} type="checkbox" /> Audit certificate</label></div><button className={primaryClass} disabled={!form.workflow_id || !form.workflow_step_id || !form.provider_settings_id} onClick={onSubmit} type="button">Save Step Link</button></div>;
}

function updateStep(form: WorkflowForm, onChange: (form: WorkflowForm) => void, index: number, patch: Partial<WorkflowStep>) {
  onChange({ ...form, steps: form.steps.map((step, itemIndex) => itemIndex === index ? { ...step, ...patch } : step) });
}

function settingsToForm(settings: StorageSettings): StorageForm {
  return { provider: settings.provider === "s3" ? "s3" : "minio", is_enabled: settings.is_enabled, bucket: settings.bucket || "", region: settings.region || "", endpoint: settings.endpoint || "", access_key_id: "", secret_access_key: "", use_ssl: settings.use_ssl, force_path_style: settings.force_path_style, object_prefix: settings.object_prefix || "", public_base_url: settings.public_base_url || "", max_file_size_bytes: String(settings.max_file_size_bytes || 26214400), allowed_content_types: settings.allowed_content_types || "" };
}

function workflowToForm(item: Workflow): WorkflowForm {
  return { id: item.id, code: item.code, name: item.name, document_type: item.document_type || "", initiator_kind: item.initiator_kind, initiator_value: item.initiator_value || "", is_default: item.is_default, is_active: item.is_active, steps: item.steps?.length ? item.steps : emptyWorkflow.steps };
}

function templateToForm(item: Template): TemplateForm {
  return { id: item.id, code: item.code, name: item.name, document_type: item.document_type, subject: item.subject || "", body_html: item.body_html || "", default_workflow_id: item.default_workflow_id || "", is_active: item.is_active };
}

function providerToForm(item: ProviderSettings): ProviderForm {
  return { provider: item.provider, display_name: item.display_name, is_enabled: item.is_enabled, environment: item.environment === "production" ? "production" : "sandbox", base_url: item.base_url || "", client_id: item.client_id || "", api_key: "", api_secret: "", webhook_secret: "", callback_url: item.callback_url || "", default_signature_mode: item.default_signature_mode || "electronic", max_retry_attempts: String(item.max_retry_attempts || 5), retry_backoff_seconds: String(item.retry_backoff_seconds || 300) };
}

function setProviderStepLinkDefaults(workflows: Workflow[], providers: ProviderSettings[], setForm: (form: ProviderStepForm) => void, setOpen: (open: boolean) => void) {
  const workflow = workflows.find((item) => item.steps?.some((step) => step.step_type === "signature" && step.id));
  const step = workflow?.steps?.find((item) => item.step_type === "signature" && item.id);
  setForm({ ...emptyProviderStep, workflow_id: workflow?.id || "", workflow_step_id: step?.id || "", provider_settings_id: providers[0]?.id || "" });
  setOpen(true);
}

function workflowStepName(workflows: Workflow[], stepID: string) {
  for (const workflow of workflows) {
    const step = workflow.steps?.find((item) => item.id === stepID);
    if (step) return `${workflow.name}: ${step.name}`;
  }
  return stepID;
}

function providerName(providers: ProviderSettings[], id: string) {
  return providers.find((item) => item.id === id)?.display_name || id;
}

function dateOnly(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}
