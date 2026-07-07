"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type WorkbenchSummary = {
  total: number;
  high_priority: number;
  overdue: number;
  due_today: number;
  payroll_blockers: number;
  approvals: number;
  exceptions: number;
  joining: number;
  exits: number;
  compliance: number;
  documents: number;
  ai_recommendations: number;
  employee_requests: number;
  by_lane?: Record<string, number>;
  by_category?: Record<string, number>;
  by_severity?: Record<string, number>;
};

type WorkbenchCard = {
  tenant_id: string;
  card_key: string;
  lane: string;
  category: string;
  source_module: string;
  source_type: string;
  source_id: string;
  employee_user_id?: string;
  title: string;
  summary: string;
  status: string;
  severity: string;
  priority: number;
  due_at?: string;
  detected_at: string;
  action_label: string;
  route_section: string;
  route_record_id?: string;
  metadata?: Record<string, unknown>;
};

type WorkbenchResponse = {
  generated_at: string;
  summary: WorkbenchSummary;
  cards: WorkbenchCard[];
};

type TabKey = "all" | "approvals" | "exceptions" | "payroll_blockers" | "joining" | "exit" | "compliance" | "employee_requests" | "ai_recommendations";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "Today" },
  { key: "approvals", label: "Approvals" },
  { key: "exceptions", label: "Exceptions" },
  { key: "payroll_blockers", label: "Payroll Blockers" },
  { key: "joining", label: "Joining" },
  { key: "exit", label: "Exit" },
  { key: "compliance", label: "Compliance" },
  { key: "employee_requests", label: "Employee Requests" },
  { key: "ai_recommendations", label: "AI" },
];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

export function OperationsWorkbenchSection({ isSuperAdmin, onNavigate, tenants, tenantsError, tenantsLoading }: { isSuperAdmin: boolean; onNavigate?: (section: string) => void; tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [data, setData] = useState<WorkbenchResponse | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const load = useCallback(async () => {
    if (!canLoad) return;
    const params = new URLSearchParams();
    if (tab !== "all") params.set("lane", tab);
    if (search.trim()) params.set("search", search.trim());
    if (severity) params.set("severity", severity);
    params.set("limit", "250");
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<WorkbenchResponse>(`${basePath}/operations-workbench?${params.toString()}`);
      const normalized = { ...response, cards: Array.isArray(response.cards) ? response.cards : [], summary: response.summary || emptySummary() };
      setData(normalized);
      setSelectedKey((current) => current && normalized.cards.some((card) => card.card_key === current) ? current : normalized.cards[0]?.card_key || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load operations workbench.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, search, severity, tab]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (isSuperAdmin && !selectedTenantID) {
    return <main className="space-y-5 p-6 lg:p-10"><Header showInfo={showInfo} setShowInfo={setShowInfo} title="Operations Workbench" /><TenantPicker disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /></main>;
  }

  const summary = data?.summary || emptySummary();
  const cards = data?.cards || [];
  const selected = cards.find((card) => card.card_key === selectedKey) || cards[0];

  return (
    <main className="space-y-5 p-6 lg:p-10">
      <Header action={<button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151]" onClick={() => void load()} type="button">{loading ? "Refreshing..." : "Refresh"}</button>} showInfo={showInfo} setShowInfo={setShowInfo} title="Operations Workbench" />
      {isSuperAdmin ? <TenantPicker compact disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Open Work" value={summary.total} />
        <Metric label="High Priority" value={summary.high_priority} tone="danger" />
        <Metric label="Overdue" value={summary.overdue} tone="danger" />
        <Metric label="Due Today" value={summary.due_today} />
        <Metric label="Payroll Blockers" value={summary.payroll_blockers} tone="warning" />
        <Metric label="AI Reviews" value={summary.ai_recommendations} />
      </section>
      <section className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">{tabs.map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black ${tab === item.key ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item.key} onClick={() => setTab(item.key)} type="button">{item.label}<span className="ml-2 text-xs opacity-80">{tabCount(summary, item.key)}</span></button>)}</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="h-10 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#374151]" onChange={(event) => setSeverity(event.target.value)} value={severity}>
              <option value="">All severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input className="h-10 rounded-lg border border-[#dbe0e5] px-3 text-sm font-semibold outline-none focus:border-[#588368] sm:w-64" onChange={(event) => setSearch(event.target.value)} placeholder="Search work" value={search} />
          </div>
        </div>
      </section>
      <section className="grid min-h-[520px] gap-4 xl:grid-cols-[0.95fr_1.4fr]">
        <div className="rounded-lg border border-[#dfe6e2] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">Queue</p></div>
          <div className="max-h-[640px] overflow-y-auto p-2">
            {loading && !cards.length ? <p className="p-6 text-sm font-bold text-[#6b7280]">Loading work queue...</p> : null}
            {!loading && !cards.length ? <p className="p-6 text-sm font-bold text-[#6b7280]">No open work for this filter.</p> : null}
            {cards.map((card) => <button className={`mb-2 w-full rounded-lg border p-4 text-left transition ${selected?.card_key === card.card_key ? "border-[#588368] bg-[#f4f8f5]" : "border-[#edf1ef] bg-white hover:bg-[#f8faf9]"}`} key={card.card_key} onClick={() => setSelectedKey(card.card_key)} type="button"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#111827]">{card.title}</p><p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#6b7280]">{card.summary}</p></div><Badge text={label(card.severity)} tone={card.severity} /></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#6b7280]"><span>{label(card.lane)}</span><span>·</span><span>{label(card.status)}</span>{card.due_at ? <><span>·</span><span>Due {fmtDate(card.due_at)}</span></> : null}</div></button>)}
          </div>
        </div>
        <DetailPanel card={selected} onNavigate={onNavigate} />
      </section>
    </main>
  );
}

function Header({ action, showInfo, setShowInfo, title }: { action?: ReactNode; showInfo: boolean; setShowInfo: (value: boolean) => void; title: string }) {
  return <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Workbench</p><button className="grid size-7 place-items-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" onClick={() => setShowInfo(!showInfo)} type="button">i</button></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">{title}</h1>{showInfo ? <p className="mt-2 max-w-3xl rounded-lg border border-[#dfe6e2] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#6b7280]">The workbench aggregates open items from existing modules. Actions open the owning screen so leave, payroll, attendance, document, compliance, exit, and AI rules remain controlled by their source workflows.</p> : null}</div>{action}</header>;
}

function TenantPicker({ compact, disabled, error, onChange, tenants, value }: { compact?: boolean; disabled: boolean; error: string; onChange: (value: string) => void; tenants: BranchTenantOption[]; value: string }) {
  return <section className={compact ? "" : "rounded-lg border border-[#dfe6e2] bg-white p-5 shadow-sm"}>{error ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}<select className="h-11 w-full rounded-lg border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}</select></section>;
}

function DetailPanel({ card, onNavigate }: { card?: WorkbenchCard; onNavigate?: (section: string) => void }) {
  if (!card) {
    return <section className="rounded-lg border border-[#dfe6e2] bg-white p-8 text-sm font-bold text-[#6b7280] shadow-sm">Select a queue item to view details.</section>;
  }
  return <section className="rounded-lg border border-[#dfe6e2] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><div className="flex flex-wrap items-center gap-2"><Badge text={label(card.severity)} tone={card.severity} /><Badge text={label(card.lane)} /><Badge text={label(card.status)} /></div><h2 className="mt-4 text-2xl font-black text-[#111827]">{card.title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-[#6b7280]">{card.summary}</p></div><div className="grid gap-4 p-5 md:grid-cols-2"><Fact label="Source" value={`${label(card.source_module)} · ${label(card.source_type)}`} /><Fact label="Due" value={card.due_at ? fmtDate(card.due_at) : "No due date"} /><Fact label="Detected" value={fmtDate(card.detected_at)} /><Fact label="Priority" value={String(card.priority)} /></div><div className="border-t border-[#edf1ef] p-5"><h3 className="text-sm font-black text-[#111827]">Context</h3><div className="mt-3 grid gap-2 md:grid-cols-2">{metadataRows(card.metadata).map(([key, value]) => <Fact key={key} label={label(key)} value={String(value)} />)}</div></div><div className="flex flex-wrap gap-3 border-t border-[#edf1ef] p-5"><button className="rounded-lg bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => onNavigate?.(card.route_section)} type="button">{card.action_label}</button><button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => onNavigate?.(card.route_section)} type="button">Open Full Record</button></div></section>;
}

function Metric({ label: labelText, tone, value }: { label: string; tone?: "danger" | "warning"; value: number }) {
  const color = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-[#111827]";
  return <div className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b7280]">{labelText}</p><p className={`mt-2 text-2xl font-black ${color}`}>{value || 0}</p></div>;
}

function Fact({ label: labelText, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[#f8faf9] px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#6b7280]">{labelText}</p><p className="mt-1 break-words text-sm font-bold text-[#111827]">{value || "-"}</p></div>;
}

function Badge({ text, tone }: { text: string; tone?: string }) {
  const cls = tone === "critical" || tone === "high" ? "bg-red-50 text-red-700" : tone === "medium" ? "bg-amber-50 text-amber-700" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${cls}`}>{text}</span>;
}

function emptySummary(): WorkbenchSummary {
  return { total: 0, high_priority: 0, overdue: 0, due_today: 0, payroll_blockers: 0, approvals: 0, exceptions: 0, joining: 0, exits: 0, compliance: 0, documents: 0, ai_recommendations: 0, employee_requests: 0, by_lane: {}, by_category: {}, by_severity: {} };
}

function tabCount(summary: WorkbenchSummary, tab: TabKey) {
  if (tab === "all") return summary.total || 0;
  return summary.by_lane?.[tab] || 0;
}

function label(value?: string | null) {
  return (value || "-").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function metadataRows(metadata?: Record<string, unknown>) {
  return Object.entries(metadata || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
}
