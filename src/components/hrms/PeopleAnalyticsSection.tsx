"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Analytics = {
  generated_at?: string;
  workforce?: { total_workers?: number; active_workers?: number; inactive_or_paused?: number; type_mix?: Array<{ label: string; count: number }> };
  engagement_health?: { active_engagements?: number; renewals_due_30?: number; renewals_overdue?: number };
  project_health?: { active_projects?: number; on_hold_projects?: number; overdue_projects?: number; high_priority_projects?: number };
  skills_intelligence?: { skill_records?: number; verified_skills?: number; verification_backlog?: number; open_skill_requirements?: number };
  wellbeing?: { score_count?: number; wellbeing_index?: number; high_risk_count?: number };
  cost_intelligence?: { payroll_cost_12m?: number; average_net_salary?: number; salary_slip_count?: number };
  risk_heatmap?: Array<{ area: string; severity: string; count: number }>;
};

type Response = { workspace: Analytics };
type Tab = "overview" | "workforce" | "skills" | "wellbeing" | "cost" | "risks";

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

export function PeopleAnalyticsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Analytics>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!canLoad) return;
    setError("");
    try {
      const response = await apiRequest<Response>(`${basePath}/people-analytics`);
      setData(response.workspace || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load people analytics.");
    }
  }, [basePath, canLoad]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (isSuperAdmin && !selectedTenantID) {
    return <main className="space-y-6 p-6 lg:p-10"><Header title="People Analytics" subtitle="Select a tenant to view aggregate workforce, skills, wellbeing, cost, and risk intelligence." />{tenantsError ? <Alert tone="danger" text={tenantsError} /> : null}<select className="h-12 w-full rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={tenantsLoading} onChange={(event) => setSelectedTenantID(event.target.value)} value={selectedTenantID}><option value="">Select tenant</option>{sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}</select></main>;
  }

  const workforce = data.workforce || {};
  const engagement = data.engagement_health || {};
  const projects = data.project_health || {};
  const skills = data.skills_intelligence || {};
  const wellbeing = data.wellbeing || {};
  const costs = data.cost_intelligence || {};
  const risks = data.risk_heatmap || [];

  return <main className="space-y-6 p-6 lg:p-10"><Header action={<button className="rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151]" onClick={() => void load()} type="button">Refresh</button>} title="People Analytics" subtitle="Forward-looking aggregate analytics for workforce mix, renewals, projects, skills, wellbeing, payroll cost, and risk heatmaps." />{error ? <Alert tone="danger" text={error} /> : null}<div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><Metric label="Workers" value={num(workforce.total_workers)} /><Metric label="Active" value={num(workforce.active_workers)} /><Metric label="Renewals 30d" value={num(engagement.renewals_due_30)} /><Metric label="Skill Gap" value={Math.max(num(skills.open_skill_requirements) - num(skills.verified_skills), 0)} /><Metric label="Wellbeing" value={num(wellbeing.wellbeing_index)} /><Metric label="Payroll 12m" value={money(costs.payroll_cost_12m)} /></div><div className="flex flex-wrap gap-2">{(["overview", "workforce", "skills", "wellbeing", "cost", "risks"] as Tab[]).map((item) => <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</div>{tab === "overview" ? <div className="grid gap-4 xl:grid-cols-2"><Panel title="Engagement Health" rows={[["Active engagements", engagement.active_engagements], ["Renewals due", engagement.renewals_due_30], ["Renewals overdue", engagement.renewals_overdue]]} /><Panel title="Project Health" rows={[["Active projects", projects.active_projects], ["On hold", projects.on_hold_projects], ["Overdue", projects.overdue_projects], ["High priority", projects.high_priority_projects]]} /></div> : null}{tab === "workforce" ? <MixPanel title="Workforce Type Mix" rows={workforce.type_mix || []} /> : null}{tab === "skills" ? <Panel title="Skills Intelligence" rows={[["Skill records", skills.skill_records], ["Verified skills", skills.verified_skills], ["Verification backlog", skills.verification_backlog], ["Open requirements", skills.open_skill_requirements]]} /> : null}{tab === "wellbeing" ? <Panel title="Wellbeing Index" rows={[["Score count", wellbeing.score_count], ["Index", wellbeing.wellbeing_index], ["High risk count", wellbeing.high_risk_count]]} /> : null}{tab === "cost" ? <Panel title="Cost Intelligence" rows={[["Payroll cost 12 months", money(costs.payroll_cost_12m)], ["Average net salary", money(costs.average_net_salary)], ["Salary slips", costs.salary_slip_count]]} /> : null}{tab === "risks" ? <RiskPanel rows={risks} /> : null}</main>;
}

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Analytics</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">{subtitle}</p></div>{action}</div>;
}

function Metric({ label: labelText, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">{labelText}</p><p className="mt-2 text-2xl font-black text-[#111827]">{value}</p></div>;
}

function Panel({ rows, title }: { rows: Array<[string, unknown]>; title: string }) {
  return <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#111827]">{title}</h2><div className="mt-4 divide-y divide-[#edf1ef]">{rows.map(([key, value]) => <div className="flex items-center justify-between py-3 text-sm font-bold" key={key}><span className="text-[#6b7280]">{key}</span><span className="text-[#111827]">{String(value ?? 0)}</span></div>)}</div></section>;
}

function MixPanel({ rows, title }: { rows: Array<{ label: string; count: number }>; title: string }) {
  return <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#111827]">{title}</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{rows.length ? rows.map((row) => <div className="rounded-xl bg-[#f8faf9] p-4" key={row.label}><p className="text-sm font-black text-[#111827]">{row.label}</p><p className="mt-2 text-2xl font-black text-[#588368]">{row.count}</p></div>) : <p className="text-sm font-bold text-[#6b7280]">No workforce mix data yet.</p>}</div></section>;
}

function RiskPanel({ rows }: { rows: Array<{ area: string; severity: string; count: number }> }) {
  return <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#111827]">Risk Heatmap</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{rows.map((row) => <div className="rounded-xl border border-[#edf1ef] p-4" key={row.area}><Badge tone={row.severity} text={label(row.severity)} /><p className="mt-3 text-sm font-black text-[#111827]">{row.area}</p><p className="mt-1 text-2xl font-black text-[#588368]">{row.count}</p></div>)}</div></section>;
}

function Badge({ text, tone }: { text: string; tone?: string }) {
  const cls = tone === "high" ? "bg-amber-100 text-amber-800" : tone === "medium" ? "bg-sky-100 text-sky-700" : "bg-[#eef4f1] text-[#588368]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${cls}`}>{text}</span>;
}

function Alert({ text, tone }: { text: string; tone: "danger" }) {
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{text}</p>;
}

function num(value: unknown) {
  return Number(value || 0);
}

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(num(value));
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
