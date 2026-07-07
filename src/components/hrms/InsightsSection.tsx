"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Insight = { id: string; insight_key: string; insight_type: string; category: string; severity: string; status: string; title: string; summary: string; confidence_score: number; score: number; source: string; entity_type?: string | null; entity_id?: string | null; employee_user_id?: string | null; reasons?: string[] | null; recommendations?: string[] | null; context?: Record<string, unknown> | null; explainability?: Record<string, unknown> | null; detected_at?: string; resolution_note?: string | null };
type InsightSummary = { total: number; open: number; reviewing: number; resolved: number; dismissed: number; overridden: number; critical: number; high: number; medium: number; low: number; by_category?: Record<string, number> };
type InsightEvent = { id: string; action: string; from_status?: string | null; to_status?: string | null; remarks?: string | null; created_at?: string };
type InsightWorkspace = { items: Insight[]; summary: InsightSummary };
type AISignal = { id: string; signal_key: string; signal_type: string; source_module: string; source_event: string; severity: string; processing_status: string; visibility_scope: string; entity_type?: string | null; occurred_at: string; error_message?: string | null };
type AIAction = { id: string; action_key: string; agent_key: string; agent_name: string; action_type: string; status: string; severity: string; title: string; summary: string; insight_id?: string | null; visibility_scope: string; confidence_score: number; requires_human_review: boolean; failure_message?: string | null; created_at: string };
type AIOverride = { id: string; insight_id?: string | null; action_id?: string | null; override_type: string; original_status?: string | null; override_status: string; reason: string; decision: string; created_at: string };
type AIEvent = { id: string; event_key: string; event_type: string; target_bus: string; status: string; attempts: number; last_error?: string | null; created_at: string; published_at?: string | null };
type AIWorkspace = { signals: AISignal[]; actions: AIAction[]; overrides: AIOverride[]; events: AIEvent[]; summary: { signals_pending: number; signals_failed: number; actions_proposed: number; actions_approved: number; actions_executed: number; actions_failed: number; overrides: number; outbox_pending: number; outbox_failed: number } };
type BoundedAgent = { key: string; name: string; workflow: string; severity: string; visibility_scope: string; signals: string[]; guardrails: string[] };
type Tab = "insights" | "agents" | "actions" | "signals" | "overrides" | "events";

const inputClass = "h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]";
const statuses = ["open", "reviewing", "resolved", "dismissed", "overridden"];
const actionStatuses = ["proposed", "queued", "reviewing", "approved", "rejected", "executed", "failed", "overridden", "cancelled"];
const severities = ["critical", "high", "medium", "low"];
const visibilityScopes = ["employee", "manager_aggregate", "hr", "admin"];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

export function InsightsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [tab, setTab] = useState<Tab>("insights");
  const [workspace, setWorkspace] = useState<InsightWorkspace | null>(null);
  const [aiWorkspace, setAIWorkspace] = useState<AIWorkspace | null>(null);
  const [agents, setAgents] = useState<BoundedAgent[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [events, setEvents] = useState<InsightEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [actionModal, setActionModal] = useState<AIAction | null>(null);
  const [overrideModal, setOverrideModal] = useState<AIAction | null>(null);
  const [reviewForm, setReviewForm] = useState({ status: "reviewing", remarks: "" });
  const [actionForm, setActionForm] = useState({ status: "reviewing", failure_message: "" });
  const [overrideForm, setOverrideForm] = useState({ override_status: "overridden", decision: "manual_action", reason: "" });

  const selected = workspace?.items.find((item) => item.id === selectedID) || workspace?.items[0];
  const categories = useMemo(() => Object.keys(workspace?.summary.by_category || {}).sort(), [workspace?.summary.by_category]);

  const load = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (severityFilter) params.set("severity", severityFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const aiParams = new URLSearchParams();
      if (severityFilter) aiParams.set("severity", severityFilter);
      if (visibilityFilter) aiParams.set("visibility_scope", visibilityFilter);
      const [insightData, aiData] = await Promise.all([
        apiRequest<InsightWorkspace>(`${basePath}/insights?${params.toString()}`),
        apiRequest<AIWorkspace>(`${basePath}/ai/workspace?${aiParams.toString()}`).catch(() => ({ signals: [], actions: [], overrides: [], events: [], summary: { signals_pending: 0, signals_failed: 0, actions_proposed: 0, actions_approved: 0, actions_executed: 0, actions_failed: 0, overrides: 0, outbox_pending: 0, outbox_failed: 0 } })),
      ]);
      setWorkspace(insightData);
      setAIWorkspace(aiData);
      setAgents(await apiRequest<BoundedAgent[]>(`${basePath}/ai/agents`).catch(() => []));
      setSelectedID((current) => current || insightData.items[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI insights.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, categoryFilter, severityFilter, statusFilter, visibilityFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!selected?.id || !canLoad) {
        setEvents([]);
        return;
      }
      void apiRequest<InsightEvent[]>(`${basePath}/insights/${selected.id}/events`).then(setEvents).catch(() => setEvents([]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [basePath, canLoad, selected?.id]);

  async function refreshInsights() {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<InsightWorkspace>(`${basePath}/insights/refresh`, { method: "POST" });
      setWorkspace(data);
      setSelectedID(data.items[0]?.id || "");
      setMessage("Insights refreshed and AI action proposals queued.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh insights.");
    } finally {
      setLoading(false);
    }
  }

  async function submitReview() {
    if (!selected) return;
    try {
      const updated = await apiRequest<Insight>(`${basePath}/insights/${selected.id}/status`, { method: "PUT", body: { status: reviewForm.status, remarks: reviewForm.remarks || undefined, resolution_note: reviewForm.remarks || undefined } });
      setWorkspace((current) => current ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) } : current);
      setReviewOpen(false);
      setMessage("Insight review saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update insight.");
    }
  }

  async function submitActionStatus() {
    if (!actionModal) return;
    try {
      await apiRequest<AIAction>(`${basePath}/ai/actions/${actionModal.id}/status`, { method: "PUT", body: { status: actionForm.status, failure_message: actionForm.failure_message || undefined } });
      setActionModal(null);
      setMessage("AI action status updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update AI action.");
    }
  }

  async function submitOverride() {
    if (!overrideModal) return;
    try {
      await apiRequest<AIOverride>(`${basePath}/ai/overrides`, { method: "POST", body: { action_id: overrideModal.id, insight_id: overrideModal.insight_id || undefined, override_type: "action_review", original_status: overrideModal.status, override_status: overrideForm.override_status, decision: overrideForm.decision, reason: overrideForm.reason || "Human reviewer changed AI recommendation.", metadata: { source: "ai_console" } } });
      setOverrideModal(null);
      setMessage("Human override recorded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record override.");
    }
  }

  async function runAgents(keys: string[] = []) {
    try {
      await apiRequest(`${basePath}/ai/agents/run`, { method: "POST", body: { agents: keys } });
      setMessage(keys.length ? "Selected bounded agent ran and queued recommendations." : "Bounded agents ran and queued recommendations.");
      setTab("actions");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run bounded AI agents.");
    }
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="rounded-2xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">AI Insights</p><InfoButton text="Select a tenant to inspect AI signals, actions, overrides, and event bus state." /></div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">AI action console</h1>
          {tenantsError ? <Alert tone="danger" text={tenantsError} /> : null}
          <select className="mt-5 h-12 w-full rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={tenantsLoading} onChange={(event) => setSelectedTenantID(event.target.value)} value={selectedTenantID}>
            <option value="">Select tenant</option>
            {sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}
          </select>
        </div>
      </section>
    );
  }

  const summary = workspace?.summary || { total: 0, open: 0, reviewing: 0, resolved: 0, dismissed: 0, overridden: 0, critical: 0, high: 0, medium: 0, low: 0 };
  const aiSummary = aiWorkspace?.summary || { signals_pending: 0, signals_failed: 0, actions_proposed: 0, actions_approved: 0, actions_executed: 0, actions_failed: 0, overrides: 0, outbox_pending: 0, outbox_failed: 0 };

  return (
    <section className="px-4 py-6 lg:px-6 lg:py-8">
      <Header action={<div className="flex flex-wrap gap-2"><InfoButton text="Setika records source signals, proposed AI actions, human decisions, and event-bus delivery state. AI suggestions require review before operational action." /><button className="rounded-xl border border-[#dbe8e1] bg-white px-4 py-2 text-sm font-black text-[#374151]" disabled={loading} onClick={load} type="button">Refresh</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={loading} onClick={refreshInsights} type="button">Run Rules</button><button className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={!selected} onClick={() => { setReviewForm({ status: selected?.status || "reviewing", remarks: "" }); setReviewOpen(true); }} type="button">Review Insight</button></div>} subtitle="Explainable AI signals, human-reviewed action proposals, override history, and event-bus audit state." title="AI action console" />
      {message ? <Alert tone="success" text={message} /> : null}
      {error ? <Alert tone="danger" text={error} /> : null}
      <div className="my-5 grid gap-3 md:grid-cols-4 xl:grid-cols-8"><Metric label="Open" value={summary.open} /><Metric label="Critical/High" value={summary.critical + summary.high} /><Metric label="Reviewing" value={summary.reviewing} /><Metric label="Closed" value={summary.resolved + summary.dismissed + summary.overridden} /><Metric label="Actions" value={aiSummary.actions_proposed} /><Metric label="Overrides" value={aiSummary.overrides} /><Metric label="Signals" value={aiSummary.signals_pending} /><Metric label="Outbox" value={aiSummary.outbox_pending + aiSummary.outbox_failed} /></div>
      <div className="mb-5 grid gap-3 rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm lg:grid-cols-4"><Select value={statusFilter} values={statuses} onChange={setStatusFilter} empty="All statuses" /><Select value={severityFilter} values={severities} onChange={setSeverityFilter} empty="All severities" /><select className={inputClass} onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><Select value={visibilityFilter} values={visibilityScopes} onChange={setVisibilityFilter} empty="All visibility" /></div>
      <div className="mb-5 flex flex-wrap gap-2">{(["insights", "agents", "actions", "signals", "overrides", "events"] as Tab[]).map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</div>
      {tab === "insights" ? <InsightsView events={events} items={workspace?.items || []} onSelect={setSelectedID} selected={selected} /> : null}
      {tab === "agents" ? <AgentsView agents={agents} onRun={(key) => void runAgents(key ? [key] : [])} /> : null}
      {tab === "actions" ? <ActionsTable onOverride={(row) => { setOverrideModal(row); setOverrideForm({ override_status: "overridden", decision: "manual_action", reason: "" }); }} onStatus={(row) => { setActionModal(row); setActionForm({ status: row.status, failure_message: "" }); }} rows={aiWorkspace?.actions || []} /> : null}
      {tab === "signals" ? <SignalsTable rows={aiWorkspace?.signals || []} /> : null}
      {tab === "overrides" ? <OverridesTable rows={aiWorkspace?.overrides || []} /> : null}
      {tab === "events" ? <EventsTable rows={aiWorkspace?.events || []} /> : null}
      <ReviewModal form={reviewForm} onChange={setReviewForm} onClose={() => setReviewOpen(false)} onSubmit={() => void submitReview()} open={reviewOpen} />
      <ActionStatusModal form={actionForm} onChange={setActionForm} onClose={() => setActionModal(null)} onSubmit={() => void submitActionStatus()} open={Boolean(actionModal)} />
      <OverrideModal form={overrideForm} onChange={setOverrideForm} onClose={() => setOverrideModal(null)} onSubmit={() => void submitOverride()} open={Boolean(overrideModal)} />
    </section>
  );
}

function InsightsView({ events, items, onSelect, selected }: { events: InsightEvent[]; items: Insight[]; onSelect: (id: string) => void; selected?: Insight }) {
  const reasons = listFromUnknown(selected?.reasons);
  const recommendations = listFromUnknown(selected?.recommendations);
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]"><div className="space-y-3">{items.length ? items.map((item) => <button className={`block w-full rounded-2xl border bg-white p-4 text-left shadow-sm ${selected?.id === item.id ? "border-[#588368]" : "border-[#dfe6e2]"}`} key={item.id} onClick={() => onSelect(item.id)} type="button"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-black text-[#111827]">{item.title}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{item.summary}</p></div><div className="flex gap-2"><Badge tone={item.severity} text={label(item.severity)} /><Badge text={label(item.status)} /></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#6b7280]"><span>{label(item.category)}</span><span>{label(item.insight_type)}</span><span>{Math.round(item.confidence_score)}% confidence</span><span>{fmtDate(item.detected_at)}</span></div></button>) : <Empty text="No insight rows match the current filters." />}</div><aside className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm">{selected ? <><div className="flex items-center gap-2"><h2 className="text-lg font-black text-[#111827]">Explain why</h2><InfoButton text="Reasons and recommendations are stored with each insight so reviewers can challenge or override the recommendation." /></div><p className="mt-3 text-sm font-semibold leading-6 text-[#374151]">{selected.summary}</p><DetailList title="Reasons" items={reasons} /><DetailList title="Recommended actions" items={recommendations} /><div className="mt-5 border-t border-[#edf1ef] pt-4"><h3 className="text-sm font-black text-[#111827]">Audit trail</h3><div className="mt-3 space-y-2">{events.length ? events.slice(0, 8).map((event) => <div className="rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold text-[#374151]" key={event.id}><strong>{label(event.action)}</strong><span className="ml-2 text-[#6b7280]">{event.from_status || "-"} {"->"} {event.to_status || "-"}</span><p className="mt-1 text-[#6b7280]">{event.remarks || fmtDate(event.created_at)}</p></div>) : <p className="text-sm font-semibold text-[#6b7280]">No audit events yet.</p>}</div></div></> : <p className="text-sm font-bold text-[#6b7280]">Select an insight to inspect reasons, actions, and audit trail.</p>}</aside></div>;
}

function AgentsView({ agents, onRun }: { agents: BoundedAgent[]; onRun: (key?: string) => void }) {
  return <div className="space-y-4"><div className="flex justify-end"><button className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white" onClick={() => onRun()} type="button">Run All Agents</button></div><div className="grid gap-4 xl:grid-cols-2">{agents.length ? agents.map((agent) => <article className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm" key={agent.key}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-black text-[#111827]">{agent.name}</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{label(agent.workflow)} recommendations with human review.</p></div><div className="flex gap-2"><Badge tone={agent.severity} text={label(agent.severity)} /><Badge text={label(agent.visibility_scope)} /></div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><MiniList title="Signals" items={agent.signals} /><MiniList title="Guardrails" items={agent.guardrails} /></div><div className="mt-5 flex justify-end"><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#111827]" onClick={() => onRun(agent.key)} type="button">Run Agent</button></div></article>) : <Empty text="No bounded agents configured." />}</div></div>;
}

function ActionsTable({ onOverride, onStatus, rows }: { onOverride: (row: AIAction) => void; onStatus: (row: AIAction) => void; rows: AIAction[] }) {
  return <DataTable headers={["Action", "Agent", "Status", "Scope", "Confidence", "Actions"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.title}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.summary}</span></td><td className="px-5 py-4 text-sm font-semibold">{row.agent_name}<span className="block text-xs text-[#6b7280]">{label(row.action_type)}</span></td><td className="px-5 py-4"><Badge tone={row.severity} text={label(row.status)} /></td><td className="px-5 py-4 text-sm font-semibold">{label(row.visibility_scope)}{row.requires_human_review ? <span className="block text-xs text-[#6b7280]">Review required</span> : null}</td><td className="px-5 py-4 text-sm font-black">{Math.round(row.confidence_score)}%</td><td className="px-5 py-4"><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onStatus(row)} type="button">Status</button><button className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white" onClick={() => onOverride(row)} type="button">Override</button></div></td></tr>) : <EmptyRow colSpan={6} text="No AI action proposals found." />}</DataTable>;
}

function SignalsTable({ rows }: { rows: AISignal[] }) {
  return <DataTable headers={["Signal", "Source", "Status", "Scope", "Entity", "Occurred"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.signal_key}</strong><span className="block text-xs font-semibold text-[#6b7280]">{label(row.signal_type)}</span></td><td className="px-5 py-4 text-sm font-semibold">{row.source_module}<span className="block text-xs text-[#6b7280]">{row.source_event}</span></td><td className="px-5 py-4"><Badge tone={row.severity} text={label(row.processing_status)} /></td><td className="px-5 py-4 text-sm font-semibold">{label(row.visibility_scope)}</td><td className="px-5 py-4 text-sm font-semibold">{row.entity_type || "-"}</td><td className="px-5 py-4 text-sm font-semibold">{fmtDate(row.occurred_at)}</td></tr>) : <EmptyRow colSpan={6} text="No AI signals found." />}</DataTable>;
}

function OverridesTable({ rows }: { rows: AIOverride[] }) {
  return <DataTable headers={["Override", "Decision", "Status", "Reason", "Created"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4 text-sm font-semibold">{label(row.override_type)}</td><td className="px-5 py-4"><Badge text={label(row.decision)} /></td><td className="px-5 py-4 text-sm font-semibold">{row.original_status || "-"} {"->"} {row.override_status}</td><td className="px-5 py-4 text-sm font-semibold">{row.reason}</td><td className="px-5 py-4 text-sm font-semibold">{fmtDate(row.created_at)}</td></tr>) : <EmptyRow colSpan={5} text="No human overrides recorded." />}</DataTable>;
}

function EventsTable({ rows }: { rows: AIEvent[] }) {
  return <DataTable headers={["Event", "Bus", "Status", "Attempts", "Published", "Error"]}>{rows.length ? rows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-4"><strong className="text-sm text-[#111827]">{row.event_key}</strong><span className="block text-xs font-semibold text-[#6b7280]">{row.event_type}</span></td><td className="px-5 py-4 text-sm font-semibold">{row.target_bus}</td><td className="px-5 py-4"><Badge text={label(row.status)} /></td><td className="px-5 py-4 text-sm font-black">{row.attempts}</td><td className="px-5 py-4 text-sm font-semibold">{fmtDate(row.published_at || row.created_at)}</td><td className="px-5 py-4 text-sm font-semibold">{row.last_error || "-"}</td></tr>) : <EmptyRow colSpan={6} text="No event-bus outbox rows found." />}</DataTable>;
}

function ReviewModal({ form, onChange, onClose, onSubmit, open }: { form: { status: string; remarks: string }; onChange: (form: { status: string; remarks: string }) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Review Insight"><div className="grid gap-4"><Field label="Status"><Select value={form.status} values={statuses} onChange={(status) => onChange({ ...form, status })} /></Field><Field label="Remarks"><textarea className="min-h-28 rounded-xl border border-[#dbe8e1] p-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange({ ...form, remarks: event.target.value })} value={form.remarks} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function ActionStatusModal({ form, onChange, onClose, onSubmit, open }: { form: { status: string; failure_message: string }; onChange: (form: { status: string; failure_message: string }) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Update AI Action"><div className="grid gap-4"><Field label="Status"><Select value={form.status} values={actionStatuses} onChange={(status) => onChange({ ...form, status })} /></Field><Field label="Failure Message"><textarea className="min-h-24 rounded-xl border border-[#dbe8e1] p-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange({ ...form, failure_message: event.target.value })} value={form.failure_message} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function OverrideModal({ form, onChange, onClose, onSubmit, open }: { form: { override_status: string; decision: string; reason: string }; onChange: (form: { override_status: string; decision: string; reason: string }) => void; onClose: () => void; onSubmit: () => void; open: boolean }) {
  return <HrmsModal open={open} onClose={onClose} title="Record Human Override"><div className="grid gap-4"><Field label="Override Status"><Select value={form.override_status} values={["overridden", "dismissed", "resolved", "rejected", "cancelled"]} onChange={(override_status) => onChange({ ...form, override_status })} /></Field><Field label="Decision"><Select value={form.decision} values={["accepted", "rejected", "replaced", "manual_action"]} onChange={(decision) => onChange({ ...form, decision })} /></Field><Field label="Reason"><textarea className="min-h-28 rounded-xl border border-[#dbe8e1] p-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange({ ...form, reason: event.target.value })} value={form.reason} /></Field><ModalActions onCancel={onClose} onSubmit={onSubmit} /></div></HrmsModal>;
}

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">AI Insights</p></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">{subtitle}</p></div>{action}</div>;
}

function DataTable({ children, headers }: { children: ReactNode; headers: string[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((header) => <th className="px-5 py-4" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{children}</tbody></table></div></section>;
}

function Metric({ label: labelText, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">{labelText}</p><p className="mt-2 text-3xl font-black text-[#111827]">{value}</p></div>;
}

function Field({ children, label: labelText }: { children: ReactNode; label: string }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{labelText}{children}</label>;
}

function Select({ empty, onChange, value, values }: { empty?: string; onChange: (value: string) => void; value: string; values: string[] }) {
  return <select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>{empty ? <option value="">{empty}</option> : null}{values.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>;
}

function ModalActions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-2 border-t border-[#edf1ef] pt-4"><button className="rounded-xl border border-[#dbe8e1] px-4 py-2 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>;
}

function Badge({ text, tone }: { text: string; tone?: string }) {
  const cls = tone === "critical" ? "bg-red-100 text-red-700" : tone === "high" ? "bg-amber-100 text-amber-800" : tone === "medium" ? "bg-sky-100 text-sky-700" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${cls}`}>{text}</span>;
}

function Alert({ text, tone }: { text: string; tone: "success" | "danger" }) {
  return <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold ${tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{text}</p>;
}

function InfoButton({ text }: { text: string }) {
  return <span className="group relative inline-flex"><button aria-label={text} className="grid h-8 w-8 place-items-center rounded-full border border-[#cfd8d3] text-xs font-black text-[#588368]" type="button">i</button><span className="pointer-events-none absolute right-0 top-10 z-20 hidden w-80 rounded-2xl border border-[#dbe0e5] bg-white p-4 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span></span>;
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return <div className="mt-5"><h3 className="text-sm font-black text-[#111827]">{title}</h3><div className="mt-2 space-y-2">{items.length ? items.map((item) => <p className="rounded-xl bg-[#f8faf9] px-3 py-2 text-sm font-semibold text-[#374151]" key={item}>{item}</p>) : <p className="text-sm font-semibold text-[#6b7280]">No details recorded.</p>}</div></div>;
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">{title}</h3><div className="mt-2 flex flex-wrap gap-2">{items.map((item) => <span className="rounded-full bg-[#f8faf9] px-3 py-1 text-xs font-bold text-[#374151]" key={item}>{item}</span>)}</div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[#dfe6e2] bg-white p-8 text-sm font-bold text-[#6b7280] shadow-sm">{text}</div>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={colSpan}>{text}</td></tr>;
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleString();
}

function listFromUnknown(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
