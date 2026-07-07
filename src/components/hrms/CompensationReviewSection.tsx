"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name: string; worker_code?: string | null };
type PayBand = { id: string; code: string; name: string; job_family?: string | null; level_code?: string | null; location_label?: string | null; currency_code: string; min_pay: number; midpoint_pay: number; max_pay: number; is_active: boolean };
type Cycle = { id: string; code: string; name: string; status: string; cycle_type: string; effective_date?: string | null; currency_code: string; budget_amount: number };
type BudgetPool = { id: string; cycle_id: string; name: string; pool_type: string; budget_amount: number; allocated_amount: number; committed_amount?: number; recommendation_count?: number };
type Recommendation = { id: string; cycle_id: string; worker_profile_id: string; pay_band_id?: string | null; budget_pool_id?: string | null; current_salary: number; current_compa_ratio: number; recommended_salary: number; recommended_increment_amount: number; recommended_increment_percent: number; promotion_recommended: boolean; reason?: string | null; performance_rating?: string | null; equity_flag: boolean; equity_notes?: string | null; status: string; effective_date?: string | null; worker_display_name?: string | null; worker_code?: string | null; pay_band_name?: string | null; budget_pool_name?: string | null };
type EquityCheck = { id: string; cycle_id: string; worker_display_name?: string | null; worker_code?: string | null; pay_band_name?: string | null; check_type: string; severity: string; variance_percent: number; finding: string; recommendation?: string | null; status: string };
type EventRow = { id: string; source_type: string; action: string; from_status?: string | null; to_status?: string | null; remarks?: string | null; created_at: string };
type SummaryRow = { metric: string; metric_count: number; metric_amount: number };
type Tab = "bands" | "cycles" | "budgets" | "recommendations" | "equity" | "audit";
type Modal = "" | "band" | "cycle" | "pool" | "recommendation" | "cycleStatus" | "recommendationStatus" | "equityStatus";

const inputClass = "w-full rounded-xl border border-[#dbe8e1] bg-white px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]";
const cycleTypes = ["annual", "mid_year", "promotion", "market_adjustment", "equity", "bonus", "custom"];
const cycleStatuses = ["draft", "open", "submitted", "approved", "finalized", "cancelled"];
const poolTypes = ["merit", "promotion", "equity", "retention", "market_adjustment", "bonus", "custom"];
const recommendationStatuses = ["draft", "submitted", "approved", "rejected", "finalized", "handed_to_payroll"];
const equityStatuses = ["open", "acknowledged", "resolved", "waived"];

function money(value?: number | null, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function datePayload(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function defaultBand() {
  return { code: "", name: "", job_family: "", level_code: "", location_label: "", currency_code: "INR", min_pay: "0", midpoint_pay: "0", max_pay: "0", is_active: true };
}

function defaultCycle() {
  return { code: "", name: "", status: "draft", cycle_type: "annual", effective_date: "", currency_code: "INR", budget_amount: "0", planning_guidance: "", approval_policy: "" };
}

function defaultPool(cycleID = "") {
  return { cycle_id: cycleID, name: "", pool_type: "merit", budget_amount: "0", allocated_amount: "0", notes: "" };
}

function defaultRecommendation(cycleID = "", workerID = "") {
  return { cycle_id: cycleID, worker_profile_id: workerID, pay_band_id: "", budget_pool_id: "", current_salary: "0", current_compa_ratio: "0", recommended_salary: "0", recommended_increment_amount: "0", recommended_increment_percent: "0", promotion_recommended: false, reason: "", performance_rating: "", equity_flag: false, equity_notes: "", status: "draft", effective_date: "" };
}

export function CompensationReviewSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Compensation Review" subtitle="Open a tenant to manage pay bands, budgets, review recommendations, and equity checks." />
        {tenantsError ? <Alert text={tenantsError} /> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => (
                <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.plan}</td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setTenant(row)} type="button">Open</button></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  }

  return <CompensationWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function CompensationWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("cycles");
  const [bands, setBands] = useState<PayBand[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [pools, setPools] = useState<BudgetPool[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [equity, setEquity] = useState<EquityCheck[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cycleID, setCycleID] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>("");
  const [selectedBand, setSelectedBand] = useState<PayBand | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [selectedPool, setSelectedPool] = useState<BudgetPool | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [selectedEquity, setSelectedEquity] = useState<EquityCheck | null>(null);
  const [bandForm, setBandForm] = useState(defaultBand());
  const [cycleForm, setCycleForm] = useState(defaultCycle());
  const [poolForm, setPoolForm] = useState(defaultPool());
  const [recommendationForm, setRecommendationForm] = useState(defaultRecommendation());
  const [statusForm, setStatusForm] = useState({ status: "open", remarks: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    const cycleQuery = cycleID ? `?cycle_id=${cycleID}` : "";
    const listQuery = query.toString() ? `?${query.toString()}` : "";
    const [bandRows, cycleRows, recommendationRows, equityRows, eventRows, summaryRows, workerRows] = await Promise.all([
      apiRequest<PayBand[]>(`${basePath}/compensation-pay-bands${listQuery}`).catch(() => []),
      apiRequest<Cycle[]>(`${basePath}/compensation-cycles${listQuery}`).catch(() => []),
      apiRequest<Recommendation[]>(`${basePath}/compensation-recommendations${cycleQuery}`).catch(() => []),
      apiRequest<EquityCheck[]>(`${basePath}/compensation-equity-checks${cycleQuery}`).catch(() => []),
      apiRequest<EventRow[]>(`${basePath}/compensation-events${cycleQuery}`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/compensation-summary`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
    ]);
    setBands(bandRows);
    setCycles(cycleRows);
    const activeCycle = cycleID || cycleRows[0]?.id || "";
    setCycleID(activeCycle);
    setRecommendations(recommendationRows);
    setEquity(equityRows);
    setEvents(eventRows);
    setSummary(summaryRows);
    setWorkers(workerRows);
    setRecommendationForm((current) => ({ ...current, cycle_id: current.cycle_id || activeCycle, worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "" }));
    if (activeCycle) setPools(await apiRequest<BudgetPool[]>(`${basePath}/compensation-cycles/${activeCycle}/budget-pools`).catch(() => []));
  }, [basePath, cycleID, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load compensation review."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const map = new Map(summary.map((item) => [item.metric, item]));
    return [
      ["Cycles", map.get("cycles")?.metric_count || cycles.length, map.get("cycles")?.metric_amount || 0],
      ["Open", map.get("open_cycles")?.metric_count || cycles.filter((item) => ["draft", "open", "submitted"].includes(item.status)).length, 0],
      ["Approved", map.get("approved_recommendations")?.metric_count || recommendations.filter((item) => ["approved", "finalized", "handed_to_payroll"].includes(item.status)).length, map.get("approved_recommendations")?.metric_amount || 0],
      ["Equity", map.get("equity_flags")?.metric_count || equity.filter((item) => item.status === "open").length, 0],
    ];
  }, [cycles, equity, recommendations, summary]);

  function openBand(item?: PayBand) {
    setSelectedBand(item || null);
    setBandForm(item ? { code: item.code, name: item.name, job_family: item.job_family || "", level_code: item.level_code || "", location_label: item.location_label || "", currency_code: item.currency_code, min_pay: String(item.min_pay), midpoint_pay: String(item.midpoint_pay), max_pay: String(item.max_pay), is_active: item.is_active } : defaultBand());
    setModal("band");
  }

  function openCycle(item?: Cycle) {
    setSelectedCycle(item || null);
    setCycleForm(item ? { code: item.code, name: item.name, status: item.status, cycle_type: item.cycle_type, effective_date: dateOnly(item.effective_date), currency_code: item.currency_code, budget_amount: String(item.budget_amount), planning_guidance: "", approval_policy: "" } : defaultCycle());
    setModal("cycle");
  }

  function openPool(item?: BudgetPool) {
    setSelectedPool(item || null);
    setPoolForm(item ? { cycle_id: item.cycle_id, name: item.name, pool_type: item.pool_type, budget_amount: String(item.budget_amount), allocated_amount: String(item.allocated_amount), notes: "" } : defaultPool(cycleID));
    setModal("pool");
  }

  function openRecommendation(item?: Recommendation) {
    setSelectedRecommendation(item || null);
    setRecommendationForm(item ? { cycle_id: item.cycle_id, worker_profile_id: item.worker_profile_id, pay_band_id: item.pay_band_id || "", budget_pool_id: item.budget_pool_id || "", current_salary: String(item.current_salary), current_compa_ratio: String(item.current_compa_ratio), recommended_salary: String(item.recommended_salary), recommended_increment_amount: String(item.recommended_increment_amount), recommended_increment_percent: String(item.recommended_increment_percent), promotion_recommended: item.promotion_recommended, reason: item.reason || "", performance_rating: item.performance_rating || "", equity_flag: item.equity_flag, equity_notes: item.equity_notes || "", status: item.status, effective_date: dateOnly(item.effective_date) } : defaultRecommendation(cycleID, workers[0]?.id || ""));
    setModal("recommendation");
  }

  async function saveBand() {
    const body = { ...bandForm, min_pay: Number(bandForm.min_pay), midpoint_pay: Number(bandForm.midpoint_pay), max_pay: Number(bandForm.max_pay), job_family: bandForm.job_family || null, level_code: bandForm.level_code || null, location_label: bandForm.location_label || null };
    await apiRequest(`${basePath}/compensation-pay-bands${selectedBand ? `/${selectedBand.id}` : ""}`, { method: selectedBand ? "PUT" : "POST", body });
    setNotice("Pay band saved."); closeModal(); await load();
  }

  async function saveCycle() {
    const body = { ...cycleForm, budget_amount: Number(cycleForm.budget_amount), effective_date: datePayload(cycleForm.effective_date), planning_guidance: cycleForm.planning_guidance || null, approval_policy: cycleForm.approval_policy || null };
    await apiRequest(`${basePath}/compensation-cycles${selectedCycle ? `/${selectedCycle.id}` : ""}`, { method: selectedCycle ? "PUT" : "POST", body });
    setNotice("Cycle saved."); closeModal(); await load();
  }

  async function savePool() {
    const body = { ...poolForm, budget_amount: Number(poolForm.budget_amount), allocated_amount: Number(poolForm.allocated_amount), notes: poolForm.notes || null };
    await apiRequest(`${basePath}/compensation-cycles/${poolForm.cycle_id}/budget-pools${selectedPool ? `/${selectedPool.id}` : ""}`, { method: selectedPool ? "PUT" : "POST", body });
    setNotice("Budget pool saved."); closeModal(); await load();
  }

  async function saveRecommendation() {
    const body = { ...recommendationForm, pay_band_id: recommendationForm.pay_band_id || null, budget_pool_id: recommendationForm.budget_pool_id || null, current_salary: Number(recommendationForm.current_salary), current_compa_ratio: Number(recommendationForm.current_compa_ratio), recommended_salary: Number(recommendationForm.recommended_salary), recommended_increment_amount: Number(recommendationForm.recommended_increment_amount), recommended_increment_percent: Number(recommendationForm.recommended_increment_percent), reason: recommendationForm.reason || null, performance_rating: recommendationForm.performance_rating || null, equity_notes: recommendationForm.equity_notes || null, effective_date: datePayload(recommendationForm.effective_date) };
    await apiRequest(`${basePath}/compensation-recommendations${selectedRecommendation ? `/${selectedRecommendation.id}` : ""}`, { method: selectedRecommendation ? "PUT" : "POST", body });
    setNotice("Recommendation saved."); closeModal(); await load();
  }

  async function updateStatus() {
    if (modal === "cycleStatus" && selectedCycle) await apiRequest(`${basePath}/compensation-cycles/${selectedCycle.id}/status`, { method: "POST", body: statusForm });
    if (modal === "recommendationStatus" && selectedRecommendation) await apiRequest(`${basePath}/compensation-recommendations/${selectedRecommendation.id}/status`, { method: "POST", body: statusForm });
    if (modal === "equityStatus" && selectedEquity) await apiRequest(`${basePath}/compensation-equity-checks/${selectedEquity.id}/status`, { method: "POST", body: statusForm });
    setNotice("Status updated."); closeModal(); await load();
  }

  async function generateEquity() {
    if (!cycleID) return;
    const rows = await apiRequest<EquityCheck[]>(`${basePath}/compensation-cycles/${cycleID}/equity-checks/generate`, { method: "POST", body: {} });
    setNotice(`${rows.length} equity check(s) generated.`); await load(); setTab("equity");
  }

  function closeModal() {
    setModal(""); setSelectedBand(null); setSelectedCycle(null); setSelectedPool(null); setSelectedRecommendation(null); setSelectedEquity(null);
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title={tenant ? `${tenant.name} Compensation Review` : "Compensation Review"} subtitle="Plan compensation cycles, manage budgets, check pay bands, and control payroll handoff." />
      <div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}<button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => void load()} type="button">Refresh</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => openCycle()} type="button">New Cycle</button><button className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!cycleID} onClick={() => void generateEquity()} type="button">Run Equity Checks</button></div>
      {notice ? <Alert text={notice} tone="success" /> : null}{error ? <Alert text={error} /> : null}
      <section className="grid gap-4 md:grid-cols-4">{metrics.map(([name, count, amount]) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={name}><p className="text-xs font-black uppercase text-[#6b7280]">{name}</p><p className="mt-2 text-3xl font-black text-[#111827]">{count}</p><p className="mt-1 text-xs font-bold text-[#588368]">{amount ? money(amount as number) : "Ready"}</p></div>)}</section>
      <section className="rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{(["cycles", "bands", "budgets", "recommendations", "equity", "audit"] as Tab[]).map((item) => <button className={`rounded-xl px-4 py-2 text-sm font-black ${tab === item ? "bg-[#588368] text-white" : "bg-[#f8faf9] text-[#374151]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</div><div className="flex flex-wrap gap-2"><select className={inputClass} onChange={(e) => setCycleID(e.target.value)} value={cycleID}><option value="">All cycles</option>{cycles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input className={inputClass} onChange={(e) => setSearch(e.target.value)} placeholder="Search" value={search} /></div></div></section>
      {tab === "cycles" ? <Table headers={["Cycle", "Budget", "Status", "Actions"]} rows={cycles.map((item) => [<Cell key="c" title={item.name} sub={`${item.code} · ${label(item.cycle_type)}`} />, money(item.budget_amount, item.currency_code), <Badge key="s" value={item.status} />, <Actions key="a" items={[["Edit", () => openCycle(item)], ["Status", () => { setSelectedCycle(item); setStatusForm({ status: item.status, remarks: "" }); setModal("cycleStatus"); }]]} />])} /> : null}
      {tab === "bands" ? <><div className="flex justify-end"><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => openBand()} type="button">New Band</button></div><Table headers={["Band", "Range", "Scope", "Actions"]} rows={bands.map((item) => [<Cell key="b" title={item.name} sub={item.code} />, `${money(item.min_pay, item.currency_code)} - ${money(item.max_pay, item.currency_code)}`, `${item.job_family || "-"} · ${item.level_code || "-"}`, <Actions key="a" items={[["Edit", () => openBand(item)]]} />])} /></> : null}
      {tab === "budgets" ? <><div className="flex justify-end"><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!cycleID} onClick={() => openPool()} type="button">New Pool</button></div><Table headers={["Pool", "Budget", "Committed", "Actions"]} rows={pools.map((item) => [<Cell key="p" title={item.name} sub={label(item.pool_type)} />, money(item.budget_amount), money(item.committed_amount), <Actions key="a" items={[["Edit", () => openPool(item)]]} />])} /></> : null}
      {tab === "recommendations" ? <><div className="flex justify-end"><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!cycleID} onClick={() => openRecommendation()} type="button">New Recommendation</button></div><Table headers={["Employee", "Current", "Recommended", "Status", "Actions"]} rows={recommendations.map((item) => [<Cell key="e" title={item.worker_display_name || item.worker_profile_id} sub={item.worker_code || item.pay_band_name || ""} />, money(item.current_salary), `${money(item.recommended_salary)} (${item.recommended_increment_percent || 0}%)`, <Badge key="s" value={item.status} />, <Actions key="a" items={[["Edit", () => openRecommendation(item)], ["Status", () => { setSelectedRecommendation(item); setStatusForm({ status: item.status, remarks: "" }); setModal("recommendationStatus"); }]]} />])} /></> : null}
      {tab === "equity" ? <Table headers={["Employee", "Finding", "Variance", "Status", "Actions"]} rows={equity.map((item) => [<Cell key="e" title={item.worker_display_name || "-"} sub={`${label(item.severity)} · ${item.pay_band_name || ""}`} />, item.finding, `${item.variance_percent || 0}%`, <Badge key="s" value={item.status} />, <Actions key="a" items={[["Status", () => { setSelectedEquity(item); setStatusForm({ status: item.status, remarks: "" }); setModal("equityStatus"); }]]} />])} /> : null}
      {tab === "audit" ? <Table headers={["Source", "Action", "Transition", "When"]} rows={events.map((item) => [label(item.source_type), label(item.action), `${label(item.from_status)} -> ${label(item.to_status)}`, new Date(item.created_at).toLocaleString()])} /> : null}
      {modal === "band" ? <ModalShell title={selectedBand ? "Edit Pay Band" : "New Pay Band"} onClose={closeModal} onSave={saveBand}><Field value={bandForm.code} onChange={(v) => setBandForm({ ...bandForm, code: v })} label="Code" /><Field value={bandForm.name} onChange={(v) => setBandForm({ ...bandForm, name: v })} label="Name" /><Field value={bandForm.job_family} onChange={(v) => setBandForm({ ...bandForm, job_family: v })} label="Job family" /><div className="grid gap-3 sm:grid-cols-3"><Field value={bandForm.min_pay} onChange={(v) => setBandForm({ ...bandForm, min_pay: v })} label="Min" type="number" /><Field value={bandForm.midpoint_pay} onChange={(v) => setBandForm({ ...bandForm, midpoint_pay: v })} label="Midpoint" type="number" /><Field value={bandForm.max_pay} onChange={(v) => setBandForm({ ...bandForm, max_pay: v })} label="Max" type="number" /></div><div className="grid gap-3 sm:grid-cols-3"><Field value={bandForm.level_code} onChange={(v) => setBandForm({ ...bandForm, level_code: v })} label="Level" /><Field value={bandForm.location_label} onChange={(v) => setBandForm({ ...bandForm, location_label: v })} label="Location" /><Field value={bandForm.currency_code} onChange={(v) => setBandForm({ ...bandForm, currency_code: v })} label="Currency" /></div></ModalShell> : null}
      {modal === "cycle" ? <ModalShell title={selectedCycle ? "Edit Cycle" : "New Cycle"} onClose={closeModal} onSave={saveCycle}><Field value={cycleForm.code} onChange={(v) => setCycleForm({ ...cycleForm, code: v })} label="Code" /><Field value={cycleForm.name} onChange={(v) => setCycleForm({ ...cycleForm, name: v })} label="Name" /><Select value={cycleForm.cycle_type} onChange={(v) => setCycleForm({ ...cycleForm, cycle_type: v })} label="Type" options={cycleTypes} /><div className="grid gap-3 sm:grid-cols-3"><Field value={cycleForm.budget_amount} onChange={(v) => setCycleForm({ ...cycleForm, budget_amount: v })} label="Budget" type="number" /><Field value={cycleForm.effective_date} onChange={(v) => setCycleForm({ ...cycleForm, effective_date: v })} label="Effective date" type="date" /><Field value={cycleForm.currency_code} onChange={(v) => setCycleForm({ ...cycleForm, currency_code: v })} label="Currency" /></div><Field value={cycleForm.planning_guidance} onChange={(v) => setCycleForm({ ...cycleForm, planning_guidance: v })} label="Planning guidance" /></ModalShell> : null}
      {modal === "pool" ? <ModalShell title={selectedPool ? "Edit Budget Pool" : "New Budget Pool"} onClose={closeModal} onSave={savePool}><Field value={poolForm.name} onChange={(v) => setPoolForm({ ...poolForm, name: v })} label="Name" /><Select value={poolForm.pool_type} onChange={(v) => setPoolForm({ ...poolForm, pool_type: v })} label="Pool type" options={poolTypes} /><div className="grid gap-3 sm:grid-cols-2"><Field value={poolForm.budget_amount} onChange={(v) => setPoolForm({ ...poolForm, budget_amount: v })} label="Budget" type="number" /><Field value={poolForm.allocated_amount} onChange={(v) => setPoolForm({ ...poolForm, allocated_amount: v })} label="Allocated" type="number" /></div></ModalShell> : null}
      {modal === "recommendation" ? <ModalShell title={selectedRecommendation ? "Edit Recommendation" : "New Recommendation"} onClose={closeModal} onSave={saveRecommendation}><Select value={recommendationForm.worker_profile_id} onChange={(v) => setRecommendationForm({ ...recommendationForm, worker_profile_id: v })} label="Worker" options={workers.map((item) => ({ value: item.id, label: `${item.display_name}${item.worker_code ? ` (${item.worker_code})` : ""}` }))} /><div className="grid gap-3 sm:grid-cols-2"><Select value={recommendationForm.pay_band_id} onChange={(v) => setRecommendationForm({ ...recommendationForm, pay_band_id: v })} label="Pay band" options={[{ value: "", label: "No band" }, ...bands.map((item) => ({ value: item.id, label: item.name }))]} /><Select value={recommendationForm.budget_pool_id} onChange={(v) => setRecommendationForm({ ...recommendationForm, budget_pool_id: v })} label="Budget pool" options={[{ value: "", label: "No pool" }, ...pools.map((item) => ({ value: item.id, label: item.name }))]} /></div><div className="grid gap-3 sm:grid-cols-3"><Field value={recommendationForm.current_salary} onChange={(v) => setRecommendationForm({ ...recommendationForm, current_salary: v })} label="Current" type="number" /><Field value={recommendationForm.recommended_salary} onChange={(v) => setRecommendationForm({ ...recommendationForm, recommended_salary: v })} label="Recommended" type="number" /><Field value={recommendationForm.current_compa_ratio} onChange={(v) => setRecommendationForm({ ...recommendationForm, current_compa_ratio: v })} label="Compa ratio" type="number" /></div><Field value={recommendationForm.reason} onChange={(v) => setRecommendationForm({ ...recommendationForm, reason: v })} label="Reason" /></ModalShell> : null}
      {["cycleStatus", "recommendationStatus", "equityStatus"].includes(modal) ? <ModalShell title="Update Status" onClose={closeModal} onSave={updateStatus}><Select value={statusForm.status} onChange={(v) => setStatusForm({ ...statusForm, status: v })} label="Status" options={modal === "cycleStatus" ? cycleStatuses : modal === "equityStatus" ? equityStatuses : recommendationStatuses} /><Field value={statusForm.remarks} onChange={(v) => setStatusForm({ ...statusForm, remarks: v })} label="Remarks" /></ModalShell> : null}
    </main>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll / Compensation</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">{subtitle}</p></div>;
}

function Alert({ text, tone = "danger" }: { text: string; tone?: "danger" | "success" }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{text}</div>;
}

function Badge({ value }: { value: string }) {
  return <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black capitalize text-[#588368]">{label(value)}</span>;
}

function Cell({ title, sub }: { title: string; sub?: string }) {
  return <div><strong className="block text-sm text-[#111827]">{title}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{sub}</span></div>;
}

function Actions({ items }: { items: Array<[string, () => void]> }) {
  return <div className="flex justify-end gap-2">{items.map(([labelText, onClick]) => <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" key={labelText} onClick={onClick} type="button">{labelText}</button>)}</div>;
}

function Table({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((item) => <th className="px-5 py-4" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={headers.length}>No records found.</td></tr> : rows.map((row, index) => <tr className="hover:bg-[#f8faf9]" key={index}>{row.map((cell, cellIndex) => <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]" key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function ModalShell({ title, children, onClose, onSave }: { title: string; children: ReactNode; onClose: () => void; onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try { await onSave(); } finally { setSaving(false); }
  }
  return <HrmsModal onClose={onClose} open={true} title={title}><div className="grid gap-4">{children}<div className="flex justify-end gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onClose} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={saving} onClick={() => void submit()} type="button">Save</button></div></div></HrmsModal>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2 text-xs font-black uppercase text-[#6b7280]">{label}<input className={inputClass} onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function Select({ label: fieldLabel, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<string | { value: string; label: string }> }) {
  return <label className="grid gap-2 text-xs font-black uppercase text-[#6b7280]">{fieldLabel}<select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>{options.map((item) => typeof item === "string" ? <option key={item} value={item}>{label(item)}</option> : <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
}
