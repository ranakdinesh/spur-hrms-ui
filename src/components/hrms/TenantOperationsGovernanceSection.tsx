"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Home, Info, Plus, RefreshCw, Search } from "lucide-react";

import { HrmsModal } from "@/components/hrms/HrmsModal";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type TenantOperationRequest = {
  id: string;
  operation_number: string;
  operation_type: string;
  title: string;
  target_tenant_id?: string | null;
  target_tenant_name?: string | null;
  target_tenant_code?: string | null;
  status: string;
  risk_level: string;
  reason: string;
  approval_required: boolean;
  backup_required: boolean;
  backup_confirmed: boolean;
  retention_until?: string | null;
  request_payload?: Record<string, unknown>;
  validation_results?: Record<string, unknown>;
  rollback_metadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type TenantOperationEvent = {
  id: string;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  remarks?: string | null;
  created_at: string;
};

type Workspace = {
  requests: TenantOperationRequest[];
  summary: {
    total: number;
    pending_approval: number;
    in_progress: number;
    high_risk: number;
    completed: number;
    by_status?: Record<string, number>;
    by_operation_type?: Record<string, number>;
  };
};

type Detail = {
  request: TenantOperationRequest;
  events: TenantOperationEvent[];
};

type OperationForm = {
  operation_type: string;
  title: string;
  target_tenant_id: string;
  target_tenant_name: string;
  target_tenant_code: string;
  risk_level: string;
  reason: string;
  backup_confirmed: boolean;
  retention_until: string;
  request_payload: string;
  rollback_metadata: string;
};

type ActionForm = {
  action: string;
  remarks: string;
  backup_confirmed: boolean;
  validation_results: string;
  rollback_metadata: string;
};

const emptySummary = { total: 0, pending_approval: 0, in_progress: 0, high_risk: 0, completed: 0 };

const operations = [
  ["create_tenant", "Create tenant"],
  ["suspend_tenant", "Suspend tenant"],
  ["restore_tenant", "Restore tenant"],
  ["schedule_delete_tenant", "Schedule deletion"],
  ["cancel_delete_tenant", "Cancel deletion"],
  ["module_enable", "Enable module"],
  ["module_disable", "Disable module"],
  ["storage_change", "Storage change"],
  ["domain_branding_change", "Domain or branding"],
  ["admin_reassignment", "Admin reassignment"],
  ["data_export", "Data export"],
] as const;

const statuses = ["all", "pending_validation", "pending_approval", "approved", "in_progress", "completed", "rejected", "cancelled", "failed"];
const risks = ["all", "low", "medium", "high", "critical"];
const actions = ["validate", "approve", "start", "complete", "reject", "cancel", "fail"];

const emptyForm: OperationForm = {
  operation_type: "create_tenant",
  title: "",
  target_tenant_id: "",
  target_tenant_name: "",
  target_tenant_code: "",
  risk_level: "",
  reason: "",
  backup_confirmed: false,
  retention_until: "",
  request_payload: "{}",
  rollback_metadata: "{}",
};

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseJSON(value: string, fallback: Record<string, unknown>) {
  const clean = value.trim();
  if (!clean) return fallback;
  const parsed = JSON.parse(clean);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
}

function statusTone(status: string) {
  if (status === "completed") return "bg-[#e6f4ea] text-[#1f7a4d]";
  if (status === "failed" || status === "rejected") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "in_progress" || status === "approved") return "bg-[#e0f2fe] text-[#0369a1]";
  if (status === "cancelled") return "bg-[#f3f4f6] text-[#4b5563]";
  return "bg-[#fff7ed] text-[#c2410c]";
}

function riskTone(risk: string) {
  if (risk === "critical") return "bg-[#7f1d1d] text-white";
  if (risk === "high") return "bg-[#fee2e2] text-[#b91c1c]";
  if (risk === "medium") return "bg-[#fff7ed] text-[#c2410c]";
  return "bg-[#e6f4ea] text-[#1f7a4d]";
}

export function TenantOperationsGovernanceSection({ tenants, tenantsError, tenantsLoading }: { tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace>({ requests: [], summary: { total: 0, pending_approval: 0, in_progress: 0, high_risk: 0, completed: 0 } });
  const [selectedID, setSelectedID] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const [query, setQuery] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [form, setForm] = useState<OperationForm>(emptyForm);
  const [actionForm, setActionForm] = useState<ActionForm>({ action: "validate", remarks: "", backup_confirmed: false, validation_results: "{}", rollback_metadata: "{}" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = detail?.request || workspace.requests.find((item) => item.id === selectedID) || workspace.requests[0] || null;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (status !== "all") params.set("status", status);
    if (risk !== "all") params.set("risk_level", risk);
    if (query.trim()) params.set("search", query.trim());
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<Workspace>(`/hrms/tenant-operations?${params.toString()}`);
      const requests = Array.isArray(response.requests) ? response.requests : [];
      setWorkspace({ requests, summary: response.summary || emptySummary });
      setSelectedID((current) => current && requests.some((item) => item.id === current) ? current : requests[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tenant operations.");
    } finally {
      setLoading(false);
    }
  }, [query, risk, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      if (!selectedID) {
        setDetail(null);
        return;
      }
      apiRequest<Detail>(`/hrms/tenant-operations/${selectedID}`).then((response) => {
        if (mounted) setDetail(response);
      }).catch(() => {
        if (mounted) setDetail(null);
      });
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [selectedID]);

  function openCreate(tenant?: BranchTenantOption) {
    setForm({ ...emptyForm, target_tenant_id: tenant?.id || "", target_tenant_name: tenant?.name || "", target_tenant_code: tenant?.code || "" });
    setCreateOpen(true);
  }

  async function submitOperation(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest<TenantOperationRequest>("/hrms/tenant-operations", {
        method: "POST",
        body: {
          operation_type: form.operation_type,
          title: form.title.trim(),
          target_tenant_id: form.target_tenant_id || undefined,
          target_tenant_name: form.target_tenant_name || undefined,
          target_tenant_code: form.target_tenant_code || undefined,
          risk_level: form.risk_level || undefined,
          reason: form.reason.trim(),
          backup_confirmed: form.backup_confirmed,
          retention_until: form.retention_until || undefined,
          request_payload: parseJSON(form.request_payload, {}),
          rollback_metadata: parseJSON(form.rollback_metadata, {}),
        },
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create tenant operation.");
    } finally {
      setSaving(false);
    }
  }

  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest<TenantOperationRequest>(`/hrms/tenant-operations/${selected.id}/actions`, {
        method: "POST",
        body: {
          action: actionForm.action,
          remarks: actionForm.remarks || undefined,
          backup_confirmed: actionForm.backup_confirmed,
          validation_results: parseJSON(actionForm.validation_results, {}),
          rollback_metadata: parseJSON(actionForm.rollback_metadata, {}),
        },
      });
      setActionOpen(false);
      await load();
      setSelectedID(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply tenant operation action.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f1] text-[#588368] shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">Tenant Operations</h1>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#dbe0e5] bg-white text-[#588368] shadow-sm" onClick={() => setShowInfo((value) => !value)} type="button" aria-label="Show tenant operations help">
              <Info className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
            <Home className="h-3.5 w-3.5" />
            <span>/</span>
            <span>Tenant Support</span>
            <span>/</span>
            <span className="font-semibold text-[#172033]">Operations Queue</span>
          </div>
          {showInfo ? <div className="mt-3 max-w-2xl rounded-xl border border-[#dbe0e5] bg-white p-3 text-sm text-[#4b5563] shadow-[0_8px_22px_rgba(23,32,51,0.06)]">High-risk tenant changes are recorded as requests first, then validated, approved, executed, and audited. Identity/platform-owned tenant mutation remains outside this HRMS queue until executor services are attached.</div> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm" onClick={() => void load()} type="button"><RefreshCw className="h-4 w-4 text-[#588368]" />Refresh</button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#588368] px-4 py-2 text-sm font-bold text-white shadow-sm" onClick={() => openCreate()} type="button"><Plus className="h-4 w-4" />New Operation</button>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {tenantsError ? <div className="mb-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#92400e]">{tenantsError}</div> : null}

      <div className="setika-card-rise mb-5 flex flex-col gap-3 rounded-2xl border border-[#e2e8e4] bg-white p-4 shadow-[0_8px_22px_rgba(23,32,51,0.06)] lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
          <input className="h-11 w-full rounded-lg border border-[#dbe0e5] pl-10 pr-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setQuery(event.target.value)} placeholder="Search operations" value={query} />
        </div>
        <select className="h-11 rounded-lg border border-[#dbe0e5] px-3 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}>
          {statuses.map((item) => <option key={item} value={item}>{item === "all" ? "All statuses" : labelize(item)}</option>)}
        </select>
        <select className="h-11 rounded-lg border border-[#dbe0e5] px-3 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setRisk(event.target.value)} value={risk}>
          {risks.map((item) => <option key={item} value={item}>{item === "all" ? "All risk" : labelize(item)}</option>)}
        </select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
          <div className="flex items-center gap-3 border-b border-[#edf1ef] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-[#588368]">
              <ClipboardList className="h-5 w-5" />
            </span>
            <h2 className="text-base font-black text-[#111827]">Request Queue</h2>
          </div>
          <div className="max-h-[680px] overflow-auto">
            {loading ? <div className="p-5 text-sm font-semibold text-[#6b7280]">Loading operations...</div> : null}
            {!loading && !workspace.requests.length ? <div className="p-5 text-sm font-semibold text-[#6b7280]">No tenant operations found.</div> : null}
            {workspace.requests.map((item) => (
              <button className={`block w-full border-b border-[#edf1ef] p-4 text-left transition hover:bg-[#f8faf9] ${selected?.id === item.id ? "bg-[#f1f7f3]" : "bg-white"}`} key={item.id} onClick={() => setSelectedID(item.id)} type="button">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#111827]">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-[#6b7280]">{item.operation_number} / {labelize(item.operation_type)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${riskTone(item.risk_level)}`}>{labelize(item.risk_level)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusTone(item.status)}`}>{labelize(item.status)}</span>
                  {item.target_tenant_name ? <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-bold text-[#4b5563]">{item.target_tenant_name}</span> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
          {!selected ? (
            <div className="p-6 text-sm font-semibold text-[#6b7280]">Select a request to review approval state and audit history.</div>
          ) : (
            <>
              <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-[#6b7280]">{selected.operation_number}</p>
                  <h2 className="mt-1 text-2xl font-black text-[#111827]">{selected.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-[#4b5563]">{selected.reason}</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-xl bg-[#172033] px-4 py-3 text-sm font-bold text-white shadow-sm" onClick={() => { setActionForm({ action: "validate", remarks: "", backup_confirmed: selected.backup_confirmed, validation_results: JSON.stringify(selected.validation_results || {}, null, 2), rollback_metadata: JSON.stringify(selected.rollback_metadata || {}, null, 2) }); setActionOpen(true); }} type="button"><CheckCircle2 className="h-4 w-4" />Take Action</button>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-3">
                {[
                  ["Status", labelize(selected.status)],
                  ["Risk", labelize(selected.risk_level)],
                  ["Target", selected.target_tenant_name || selected.target_tenant_code || "New tenant"],
                  ["Backup", selected.backup_required ? selected.backup_confirmed ? "Confirmed" : "Required" : "Not required"],
                  ["Retention", selected.retention_until ? new Date(selected.retention_until).toLocaleDateString() : "Not set"],
                  ["Updated", new Date(selected.updated_at).toLocaleString()],
                ].map(([label, value]) => (
                  <div className="rounded-lg border border-[#edf1ef] bg-[#f8faf9] p-4" key={label}>
                    <p className="text-xs font-black uppercase text-[#6b7280]">{label}</p>
                    <p className="mt-2 text-sm font-bold text-[#111827]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#edf1ef] p-5">
                <h3 className="text-base font-black text-[#111827]">Audit History</h3>
                <div className="mt-4 space-y-3">
                  {(detail?.events || []).map((event) => (
                    <div className="rounded-lg border border-[#edf1ef] p-4" key={event.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-black text-[#111827]">{labelize(event.action)}</p>
                        <p className="text-xs font-semibold text-[#6b7280]">{new Date(event.created_at).toLocaleString()}</p>
                      </div>
                      <p className="mt-2 text-sm text-[#4b5563]">{event.from_status ? labelize(event.from_status) : "Start"} {"->"} {event.to_status ? labelize(event.to_status) : "Updated"}</p>
                      {event.remarks ? <p className="mt-2 text-sm text-[#4b5563]">{event.remarks}</p> : null}
                    </div>
                  ))}
                  {detail && !detail.events.length ? <p className="text-sm font-semibold text-[#6b7280]">No events recorded.</p> : null}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <HrmsModal open={createOpen} title="New Tenant Operation" onClose={() => setCreateOpen(false)}>
        <form className="space-y-4" onSubmit={submitOperation}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-bold text-[#111827]">Operation<select className="mt-2 h-11 w-full rounded-lg border border-[#dbe0e5] px-3" value={form.operation_type} onChange={(event) => setForm({ ...form, operation_type: event.target.value })}>{operations.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-sm font-bold text-[#111827]">Risk<select className="mt-2 h-11 w-full rounded-lg border border-[#dbe0e5] px-3" value={form.risk_level} onChange={(event) => setForm({ ...form, risk_level: event.target.value })}><option value="">Default from operation</option>{risks.filter((item) => item !== "all").map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></label>
          </div>
          <label className="block text-sm font-bold text-[#111827]">Title<input className="mt-2 h-11 w-full rounded-lg border border-[#dbe0e5] px-3" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="block text-sm font-bold text-[#111827]">Target Tenant<select className="mt-2 h-11 w-full rounded-lg border border-[#dbe0e5] px-3" disabled={tenantsLoading} value={form.target_tenant_id} onChange={(event) => { const tenant = tenants.find((item) => item.id === event.target.value); setForm({ ...form, target_tenant_id: event.target.value, target_tenant_name: tenant?.name || "", target_tenant_code: tenant?.code || "" }); }}><option value="">No existing tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label className="block text-sm font-bold text-[#111827]">Reason<textarea className="mt-2 min-h-24 w-full rounded-lg border border-[#dbe0e5] px-3 py-2" required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-bold text-[#111827]">Retention Until<input className="mt-2 h-11 w-full rounded-lg border border-[#dbe0e5] px-3" type="date" value={form.retention_until} onChange={(event) => setForm({ ...form, retention_until: event.target.value })} /></label>
            <label className="flex items-center gap-3 rounded-lg border border-[#dbe0e5] px-3 py-3 text-sm font-bold text-[#111827]"><input checked={form.backup_confirmed} onChange={(event) => setForm({ ...form, backup_confirmed: event.target.checked })} type="checkbox" /> Backup/export evidence is ready</label>
          </div>
          <details className="rounded-lg border border-[#dbe0e5] p-3">
            <summary className="cursor-pointer text-sm font-black text-[#111827]">Payload and rollback metadata</summary>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <textarea className="min-h-28 rounded-lg border border-[#dbe0e5] px-3 py-2 font-mono text-xs" value={form.request_payload} onChange={(event) => setForm({ ...form, request_payload: event.target.value })} />
              <textarea className="min-h-28 rounded-lg border border-[#dbe0e5] px-3 py-2 font-mono text-xs" value={form.rollback_metadata} onChange={(event) => setForm({ ...form, rollback_metadata: event.target.value })} />
            </div>
          </details>
          <div className="flex justify-end gap-3">
            <button className="rounded-lg border border-[#dbe0e5] px-4 py-3 text-sm font-bold" type="button" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-bold text-white" disabled={saving} type="submit">{saving ? "Saving..." : "Create Request"}</button>
          </div>
        </form>
      </HrmsModal>

      <HrmsModal open={actionOpen} title="Update Tenant Operation" onClose={() => setActionOpen(false)}>
        <form className="space-y-4" onSubmit={submitAction}>
          <label className="block text-sm font-bold text-[#111827]">Action<select className="mt-2 h-11 w-full rounded-lg border border-[#dbe0e5] px-3" value={actionForm.action} onChange={(event) => setActionForm({ ...actionForm, action: event.target.value })}>{actions.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></label>
          <label className="block text-sm font-bold text-[#111827]">Remarks<textarea className="mt-2 min-h-24 w-full rounded-lg border border-[#dbe0e5] px-3 py-2" value={actionForm.remarks} onChange={(event) => setActionForm({ ...actionForm, remarks: event.target.value })} /></label>
          <label className="flex items-center gap-3 rounded-lg border border-[#dbe0e5] px-3 py-3 text-sm font-bold text-[#111827]"><input checked={actionForm.backup_confirmed} onChange={(event) => setActionForm({ ...actionForm, backup_confirmed: event.target.checked })} type="checkbox" /> Backup/export evidence confirmed</label>
          <details className="rounded-lg border border-[#dbe0e5] p-3">
            <summary className="cursor-pointer text-sm font-black text-[#111827]">Validation and rollback metadata</summary>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <textarea className="min-h-28 rounded-lg border border-[#dbe0e5] px-3 py-2 font-mono text-xs" value={actionForm.validation_results} onChange={(event) => setActionForm({ ...actionForm, validation_results: event.target.value })} />
              <textarea className="min-h-28 rounded-lg border border-[#dbe0e5] px-3 py-2 font-mono text-xs" value={actionForm.rollback_metadata} onChange={(event) => setActionForm({ ...actionForm, rollback_metadata: event.target.value })} />
            </div>
          </details>
          <div className="flex justify-end gap-3">
            <button className="rounded-lg border border-[#dbe0e5] px-4 py-3 text-sm font-bold" type="button" onClick={() => setActionOpen(false)}>Cancel</button>
            <button className="rounded-lg bg-[#111827] px-4 py-3 text-sm font-bold text-white" disabled={saving} type="submit">{saving ? "Saving..." : "Apply Action"}</button>
          </div>
        </form>
      </HrmsModal>
    </div>
  );
}
