"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Distribution = { name: string; count: number };
type HRDashboardAlert = { key: string; title: string; severity: string; detail: string };

type HRDashboard = {
  generated_at: string;
  window_start: string;
  window_end: string;
  headcount: {
    total_employees: number;
    active_employees: number;
    inactive_employees: number;
    new_joiners_this_month: number;
    departments: Distribution[];
    branches: Distribution[];
    designations: Distribution[];
    employment_types: Distribution[];
  };
  attendance: {
    today_summary?: { present: number; leave: number; absent: number; holiday: number; weekoff: number; incomplete?: number; empty: number; total_worked_minutes: number } | null;
    month_summary?: { present_days: number; absent_days: number; leave_days: number; incomplete_days?: number; late_days: number; early_exit_days: number; total_worked_minutes: number; attendance_rate: number; absenteeism_rate: number; late_rate: number } | null;
    daily_trends: Array<{ date: string; present_days: number; absent_days: number; late_days: number; average_worked_minutes: number }>;
    departments: Array<{ department_name: string; employee_days: number; present_days: number; absent_days: number; incomplete_days?: number; late_days: number; attendance_rate: number }>;
    exception_employees: Array<{ employee_code?: string | null; firstname: string; lastname?: string | null; date: string; status: string; rule_outcome?: string | null; late_minutes: number; early_exit_minutes: number }>;
  };
  leave: {
    summary?: { total_requests: number; pending_count: number; approved_count: number; rejected_count: number; canceled_count: number; total_days: number; pending_days: number; approved_days: number } | null;
    pending_requests: number;
    recent_requests: Array<{ id: string; firstname: string; lastname?: string | null; department_name?: string | null; start_date: string; end_date: string; days: number; status: string }>;
  };
  payroll: { month: number; year: number; generated_slips: number; pending_slips: number; total_gross_salary: number; total_net_salary: number; total_deductions: number };
  onboarding: { complete_employees: number; incomplete_employees: number; pending_review_documents: number; rejected_documents: number };
  policies: { published_policies: number; required_documents: number };
  celebrations: Array<{ id: string; title: string; type_name: string; date: string; days_until: number }>;
  upcoming_services: Array<{ key: string; title: string; description: string; reason: string }>;
  operational_alerts: HRDashboardAlert[];
};

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

function currentMonth() {
  const date = new Date();
  return { month: String(date.getMonth() + 1), year: String(date.getFullYear()) };
}

export function HRCommandCenterSection({ isSuperAdmin, onNavigate, tenants, tenantsError, tenantsLoading }: { isSuperAdmin: boolean; onNavigate?: (section: string) => void; tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const period = currentMonth();
  const [month, setMonth] = useState(period.month);
  const [year, setYear] = useState(period.year);
  const [dashboard, setDashboard] = useState<HRDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedTenant = sortedTenants.find((tenant) => tenant.id === selectedTenantID) || null;
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const load = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<HRDashboard>(`${basePath}/dashboard/hr?month=${month}&year=${year}`);
      setDashboard(normalizeHRDashboard(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load business dashboard.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, month, year]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <main className="space-y-4 p-4 lg:p-6">
        <DashboardMotionStyle />
        <DashboardHeader loading={loading} month={month} onMonthChange={setMonth} onRefresh={() => void load()} onYearChange={setYear} showInfo={showInfo} setShowInfo={setShowInfo} tenantMode year={year} />
        <TenantPicker disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} />
      </main>
    );
  }

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <DashboardMotionStyle />
      <DashboardHeader dashboard={dashboard} loading={loading} month={month} onMonthChange={setMonth} onRefresh={() => void load()} onYearChange={setYear} selectedTenant={selectedTenant} showInfo={showInfo} setShowInfo={setShowInfo} year={year} />
      {isSuperAdmin ? <TenantPicker compact disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /> : null}
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      {loading && !dashboard ? <p className="rounded-xl border border-[#dfe6e2] bg-white p-5 text-sm font-bold text-[#6b7280] shadow-sm">Loading business dashboard...</p> : null}
      {dashboard ? <BusinessDashboard dashboard={dashboard} onNavigate={onNavigate} /> : null}
    </main>
  );
}

function BusinessDashboard({ dashboard, onNavigate }: { dashboard: HRDashboard; onNavigate?: (section: string) => void }) {
  const attendance = dashboard.attendance.month_summary;
  const leave = dashboard.leave.summary;
  const payrollReadiness = pct(dashboard.payroll.generated_slips, dashboard.payroll.generated_slips + dashboard.payroll.pending_slips);
  const onboardingReadiness = pct(dashboard.onboarding.complete_employees, dashboard.onboarding.complete_employees + dashboard.onboarding.incomplete_employees);
  const exceptionCount = dashboard.attendance.exception_employees.length + (attendance?.incomplete_days || 0) + (dashboard.onboarding.pending_review_documents || 0);
  const reportHealth = Math.max(0, 100 - Math.min(100, exceptionCount * 6 + dashboard.payroll.pending_slips * 5));
  const hiringActivity = dashboard.headcount.new_joiners_this_month + dashboard.onboarding.incomplete_employees + dashboard.onboarding.pending_review_documents;

  const executiveSignals = [
    { accent: "#2563eb", label: "People", note: `${dashboard.headcount.inactive_employees} inactive`, route: "employees", value: dashboard.headcount.active_employees, valueLabel: "active" },
    { accent: "#16a34a", label: "Payroll", note: `${payrollReadiness}% slips ready`, route: "payroll-operations", value: moneyCompact(dashboard.payroll.total_net_salary), valueLabel: "net" },
    { accent: "#f97316", label: "Hiring", note: `${dashboard.onboarding.incomplete_employees} onboarding gaps`, route: "candidate-onboarding", value: hiringActivity, valueLabel: "movement" },
    { accent: "#0891b2", label: "Performance", note: `${attendance?.late_rate?.toFixed(1) || "0.0"}% late rate`, route: "performance", value: `${attendance?.attendance_rate?.toFixed(1) || "0.0"}%`, valueLabel: "attendance" },
    { accent: "#be123c", label: "Reports", note: `${exceptionCount} data exceptions`, route: "reports", value: `${reportHealth}%`, valueLabel: "health" },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {executiveSignals.map((signal, index) => <SignalCard index={index} key={signal.label} {...signal} onNavigate={onNavigate} />)}
      </section>

      {dashboard.operational_alerts.length ? <AlertDiagnostics alerts={dashboard.operational_alerts} onNavigate={onNavigate} /> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <AnalyticsPanel action="People" eyebrow="People" onAction={() => onNavigate?.("employees")} title="Workforce shape">
          <div className="grid grid-cols-3 gap-2">
            <TinyFact label="Active" value={dashboard.headcount.active_employees} />
            <TinyFact label="Joined" value={dashboard.headcount.new_joiners_this_month} />
            <TinyFact label="Inactive" value={dashboard.headcount.inactive_employees} />
          </div>
          <div className="mt-3 space-y-2">
            {topDistributions(dashboard.headcount.departments, 4).map((item) => <DistributionBar accent="#2563eb" key={item.name} label={item.name} total={Math.max(dashboard.headcount.active_employees, 1)} value={item.count} />)}
            {!dashboard.headcount.departments.length ? <EmptyState label="No department mix yet." /> : null}
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel action="Payroll" eyebrow="Payroll" onAction={() => onNavigate?.("payroll-operations")} title="Payroll readiness">
          <ProgressRing accent="#16a34a" label="Payslip readiness" note={`${dashboard.payroll.generated_slips} generated · ${dashboard.payroll.pending_slips} pending`} value={payrollReadiness} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <TinyFact label="Gross" value={moneyCompact(dashboard.payroll.total_gross_salary)} />
            <TinyFact label="Net" value={moneyCompact(dashboard.payroll.total_net_salary)} />
            <TinyFact label="Deductions" value={moneyCompact(dashboard.payroll.total_deductions)} />
          </div>
          <StackBar items={[
            { color: "#16a34a", label: "Net", value: dashboard.payroll.total_net_salary },
            { color: "#f97316", label: "Deductions", value: dashboard.payroll.total_deductions },
          ]} />
        </AnalyticsPanel>

        <AnalyticsPanel action="Hiring" eyebrow="Hiring" onAction={() => onNavigate?.("candidate-onboarding")} title="Hiring and onboarding">
          <FunnelRow accent="#f97316" label="New joiners" value={dashboard.headcount.new_joiners_this_month} />
          <FunnelRow accent="#f59e0b" label="Onboarding complete" value={dashboard.onboarding.complete_employees} />
          <FunnelRow accent="#dc2626" label="Open onboarding gaps" value={dashboard.onboarding.incomplete_employees + dashboard.onboarding.pending_review_documents} />
        </AnalyticsPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AnalyticsPanel action="Performance" eyebrow="Performance" onAction={() => onNavigate?.("performance")} title="Workforce reliability">
          <TrendChart data={dashboard.attendance.daily_trends} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TinyFact label="Attendance" value={`${attendance?.attendance_rate?.toFixed(1) || "0.0"}%`} />
            <TinyFact label="Absenteeism" value={`${attendance?.absenteeism_rate?.toFixed(1) || "0.0"}%`} />
            <TinyFact label="Late days" value={attendance?.late_days || 0} />
            <TinyFact label="Leave days" value={leave?.approved_days || attendance?.leave_days || 0} />
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel action="Reports" eyebrow="Reports" onAction={() => onNavigate?.("reports")} title="Reporting health">
          <ProgressRing accent="#be123c" label="Data health" note={`${exceptionCount} exceptions across attendance, documents, and payroll`} value={reportHealth} />
          <div className="mt-3 space-y-2">
            <DistributionBar accent="#be123c" label="Policy coverage" total={Math.max(dashboard.policies.required_documents, dashboard.policies.published_policies, 1)} value={dashboard.policies.published_policies} />
            <DistributionBar accent="#f97316" label="Document pending review" total={Math.max(dashboard.onboarding.pending_review_documents + dashboard.onboarding.complete_employees, 1)} value={dashboard.onboarding.pending_review_documents} />
            <DistributionBar accent="#0891b2" label="Leave approved days" total={Math.max(leave?.total_days || 0, 1)} value={leave?.approved_days || 0} />
          </div>
        </AnalyticsPanel>
      </section>
    </div>
  );
}

function DashboardHeader({ dashboard, loading, month, onMonthChange, onRefresh, onYearChange, selectedTenant, showInfo, setShowInfo, tenantMode, year }: { dashboard?: HRDashboard | null; loading: boolean; month: string; onMonthChange: (value: string) => void; onRefresh: () => void; onYearChange: (value: string) => void; selectedTenant?: BranchTenantOption | null; showInfo: boolean; setShowInfo: (value: boolean) => void; tenantMode?: boolean; year: string }) {
  return (
    <header className="rounded-xl border border-[#dfe6e2] bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--brand-primary)]">Business intelligence</p>
            <button className="grid size-7 place-items-center rounded-full border border-[#dbe0e5] text-xs font-black text-[var(--brand-primary)] transition hover:bg-[#f8faf9]" onClick={() => setShowInfo(!showInfo)} type="button">i</button>
          </div>
          <h1 className="mt-0.5 truncate text-xl font-black tracking-tight text-[#111827] sm:text-2xl">{selectedTenant ? `${selectedTenant.name} Business Dashboard` : "Business Dashboard"}</h1>
        </div>
        {!tenantMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[#f4f7f5] px-3 py-2 text-xs font-bold text-[#65736b]">{dashboard?.generated_at ? `Updated ${fmtDateTime(dashboard.generated_at)}` : "Analytics view"}</span>
            <select className="h-9 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#374151]" onChange={(event) => onMonthChange(event.target.value)} value={month}>
              {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2025, index, 1))}</option>)}
            </select>
            <input className="h-9 w-24 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#374151]" onChange={(event) => onYearChange(event.target.value)} value={year} />
            <button className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-md" onClick={onRefresh} type="button">{loading ? "Refreshing" : "Refresh"}</button>
          </div>
        ) : null}
      </div>
      {showInfo ? (
        <div className="mt-3 rounded-lg border border-[#dfe6e2] bg-[#f8faf9] px-4 py-3 text-sm font-semibold leading-6 text-[#6b7280]">
          Data sources: employee records, attendance, payroll slips, onboarding documents, leave reports, and policy records.
        </div>
      ) : null}
    </header>
  );
}

function TenantPicker({ compact, disabled, error, onChange, tenants, value }: { compact?: boolean; disabled: boolean; error: string; onChange: (value: string) => void; tenants: BranchTenantOption[]; value: string }) {
  return (
    <section className={compact ? "min-w-[260px]" : "rounded-xl border border-[#dfe6e2] bg-white p-5 shadow-sm"}>
      {error ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <select className="h-10 w-full rounded-lg border border-[#dbe8e1] bg-white px-3 text-sm font-bold text-[#374151] outline-none focus:border-[var(--brand-primary)]" disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Select tenant</option>
        {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}
      </select>
    </section>
  );
}

function SignalCard({ accent, index, label, note, onNavigate, route, value, valueLabel }: { accent: string; index: number; label: string; note: string; onNavigate?: (section: string) => void; route: string; value: number | string; valueLabel: string }) {
  return (
    <button className="hr-dashboard-rise group min-h-[84px] rounded-lg border p-2.5 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md" onClick={() => onNavigate?.(route)} style={{ animationDelay: `${index * 55}ms`, background: `linear-gradient(135deg, ${accent}1f, #ffffff 48%, ${accent}12)`, borderColor: `${accent}45` }} type="button">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#6b7280]">{label}</span>
        <span className="size-2.5 rounded-full transition group-hover:scale-150" style={{ backgroundColor: accent }} />
      </div>
      <strong className="mt-1.5 block text-xl tracking-tight text-[#111827]">{value}</strong>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-[#8a978f]">{valueLabel}</span>
        <span style={{ color: accent }}>{note}</span>
      </div>
    </button>
  );
}

function AlertDiagnostics({ alerts, onNavigate }: { alerts: HRDashboardAlert[]; onNavigate?: (section: string) => void }) {
  return (
    <section className="hr-dashboard-rise rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#c2410c]">Attention needed</p>
          <h2 className="mt-0.5 text-base font-black text-[#111827]">{alerts.length} operating signals</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#c2410c]">{alerts.filter((alert) => alert.severity === "warning").length} warning</span>
      </div>
      <div className="grid gap-2 xl:grid-cols-3">
        {alerts.map((alert) => {
          const config = alertConfig(alert);
          return (
            <article className="rounded-lg border border-white/80 bg-white/85 p-3 shadow-sm" key={alert.key}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]" style={{ backgroundColor: `${config.accent}16`, color: config.accent }}>{alert.severity}</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6b7280]">{config.area}</span>
                  </div>
                  <strong className="mt-1.5 block text-sm text-[#111827]">{alert.title}</strong>
                </div>
                <MetricPill accent={config.accent} text={config.metric} />
              </div>
              <div className="mt-2 grid gap-2 text-xs font-semibold text-[#6b7280] sm:grid-cols-[0.8fr_1fr] xl:grid-cols-1">
                <div className="rounded-md bg-[#f8faf9] px-2 py-1.5"><span className="font-black text-[#374151]">Where:</span> {config.where}</div>
                <div className="rounded-md bg-[#f8faf9] px-2 py-1.5"><span className="font-black text-[#374151]">What:</span> {alert.detail}</div>
              </div>
              <button className="mt-2 h-8 rounded-lg px-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => onNavigate?.(config.route)} style={{ backgroundColor: config.accent }} type="button">{config.action}</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MetricPill({ accent, text }: { accent: string; text: string }) {
  return <span className="shrink-0 rounded-full px-2 py-1 text-xs font-black" style={{ backgroundColor: `${accent}14`, color: accent }}>{text}</span>;
}

function alertConfig(alert: HRDashboardAlert) {
  const metric = alert.detail.match(/\d+/)?.[0] || "1";
  const map: Record<string, { action: string; area: string; where: string; route: string; accent: string; metricLabel: string }> = {
    late_arrivals: { accent: "#0891b2", action: "Open Attendance", area: "Time", metricLabel: "late", route: "attendance", where: "Attendance > Monthly exceptions > Late arrivals" },
    monthly_incomplete_attendance: { accent: "#f97316", action: "Regularise", area: "Time", metricLabel: "days", route: "attendance", where: "Attendance > Regularisation > Missing checkout" },
    onboarding_incomplete: { accent: "#2563eb", action: "Review Employees", area: "People", metricLabel: "employees", route: "employees", where: "People > Employees > Onboarding checklist" },
    pending_leave: { accent: "#7c3aed", action: "Review Leaves", area: "Leave", metricLabel: "requests", route: "leave-approvals", where: "Time > Leave approvals > Pending" },
    pending_payroll: { accent: "#16a34a", action: "Open Payslips", area: "Payroll", metricLabel: "employees", route: "payslips", where: "Payroll > Payslips > Selected month" },
    today_absent: { accent: "#dc2626", action: "Open Attendance", area: "Time", metricLabel: "absent", route: "attendance", where: "Attendance > Today > Absent employees" },
    today_incomplete_attendance: { accent: "#f97316", action: "Open Attendance", area: "Time", metricLabel: "employees", route: "attendance", where: "Attendance > Today > Missing checkout" },
  };
  const config = map[alert.key] || { accent: "#6b7280", action: "Open Reports", area: "Reports", metricLabel: "items", route: "reports", where: "Reports > Dashboard signal" };
  return { ...config, metric: `${metric} ${config.metricLabel}` };
}

function AnalyticsPanel({ action, children, eyebrow, onAction, title }: { action?: string; children: ReactNode; eyebrow: string; onAction?: () => void; title: string }) {
  const theme = panelTheme(eyebrow);
  return (
    <section className="hr-dashboard-rise rounded-xl border p-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ background: theme.bg, borderColor: theme.border }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: theme.accent }}>{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black text-[#111827]">{title}</h2>
        </div>
        {action ? <button className="rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-xs font-black text-[#374151] transition hover:bg-white" onClick={onAction} type="button">{action}</button> : null}
      </div>
      {children}
    </section>
  );
}

function panelTheme(key: string) {
  const themes: Record<string, { accent: string; bg: string; border: string }> = {
    Hiring: { accent: "#f97316", bg: "linear-gradient(135deg, #fff7ed, #ffffff 64%)", border: "#fed7aa" },
    Payroll: { accent: "#16a34a", bg: "linear-gradient(135deg, #ecfdf5, #ffffff 64%)", border: "#bbf7d0" },
    People: { accent: "#2563eb", bg: "linear-gradient(135deg, #eff6ff, #ffffff 64%)", border: "#bfdbfe" },
    Performance: { accent: "#0891b2", bg: "linear-gradient(135deg, #ecfeff, #ffffff 64%)", border: "#a5f3fc" },
    Reports: { accent: "#be123c", bg: "linear-gradient(135deg, #fff1f2, #ffffff 64%)", border: "#fecdd3" },
  };
  return themes[key] || { accent: "var(--brand-primary)", bg: "#ffffff", border: "#dfe6e2" };
}

function ProgressRing({ accent, label, note, value }: { accent: string; label: string; note: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  return (
    <article className="flex items-center gap-3 rounded-lg bg-white/75 p-3">
      <div className="grid size-16 shrink-0 place-items-center rounded-full transition-all duration-700" style={{ background: `conic-gradient(${accent} ${safeValue}%, #e8eeeb ${safeValue}% 100%)` }}>
        <div className="grid size-11 place-items-center rounded-full bg-white text-xs font-black text-[#111827]">{safeValue}%</div>
      </div>
      <div>
        <p className="text-sm font-black text-[#111827]">{label}</p>
        <p className="mt-1 text-xs font-bold leading-5 text-[#6b7280]">{note}</p>
      </div>
    </article>
  );
}

function StackBar({ items }: { items: Array<{ color: string; label: string; value: number }> }) {
  const total = Math.max(1, items.reduce((sum, item) => sum + Math.max(0, item.value), 0));
  return (
    <div className="mt-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-[#edf1ef]">
        {items.map((item) => <span className="transition-all duration-700" key={item.label} style={{ backgroundColor: item.color, width: `${Math.max(2, (Math.max(0, item.value) / total) * 100)}%` }} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[#6b7280]">
        {items.map((item) => <span className="inline-flex items-center gap-1.5" key={item.label}><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: HRDashboard["attendance"]["daily_trends"] }) {
  const points = chartPoints(data.slice(-14).map((row) => row.present_days));
  const latePoints = chartPoints(data.slice(-14).map((row) => row.late_days));
  return (
    <div className="rounded-lg bg-white/75 p-3">
      <svg aria-label="Attendance trend" className="h-24 w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
        <path d="M0 34 C20 31, 35 35, 52 29 S78 19, 100 23" fill="none" stroke="#dbe8e1" strokeWidth="1.5" />
        <polyline fill="none" points={points} stroke="#0891b2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
        <polyline fill="none" points={latePoints} stroke="#f97316" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
      <div className="flex gap-4 text-xs font-bold text-[#6b7280]"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#0891b2]" />Present</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#f97316]" />Late</span></div>
    </div>
  );
}

function FunnelRow({ accent, label, value }: { accent: string; label: string; value: number }) {
  return (
    <div className="mb-2 rounded-lg border border-white/70 bg-white/75 p-2.5">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-black text-[#111827]">{label}</span><strong className="text-xl text-[#111827]">{value || 0}</strong></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1ef]"><span className="block h-full rounded-full transition-all duration-700" style={{ backgroundColor: accent, width: `${Math.min(100, Math.max(8, value * 12))}%` }} /></div>
    </div>
  );
}

function TinyFact({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-lg bg-white/75 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a978f]">{label}</p><strong className="mt-0.5 block text-base text-[#111827]">{value}</strong></div>;
}

function DistributionBar({ accent, label, suffix, total, value }: { accent: string; label: string; suffix?: string; total: number; value: number }) {
  const width = `${Math.min(100, Math.max(0, (value / Math.max(total, 1)) * 100))}%`;
  return <div><div className="mb-1 flex items-center justify-between gap-3 text-xs"><strong className="truncate text-[#111827]">{label}</strong><span className="font-black" style={{ color: accent }}>{suffix || value}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-2 rounded-full transition-all duration-700" style={{ backgroundColor: accent, width }} /></div></div>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed border-[#cfd8d3] bg-[#fbfcfb] px-3 py-4 text-sm font-semibold leading-6 text-[#6b7280]">{label}</p>;
}

function DashboardMotionStyle() {
  return (
    <style>{`
      @keyframes hr-dashboard-rise {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .hr-dashboard-rise { animation: hr-dashboard-rise .42s ease-out both; }
      @media (prefers-reduced-motion: reduce) { .hr-dashboard-rise { animation: none; } }
    `}</style>
  );
}

function normalizeHRDashboard(dashboard: HRDashboard): HRDashboard {
  const headcount = dashboard.headcount || {};
  const attendance = dashboard.attendance || {};
  const leave = dashboard.leave || {};
  const payroll = dashboard.payroll || {};
  const onboarding = dashboard.onboarding || {};
  const policies = dashboard.policies || {};

  return {
    ...dashboard,
    headcount: {
      total_employees: headcount.total_employees || 0,
      active_employees: headcount.active_employees || 0,
      inactive_employees: headcount.inactive_employees || 0,
      new_joiners_this_month: headcount.new_joiners_this_month || 0,
      departments: arrayOrEmpty(headcount.departments),
      branches: arrayOrEmpty(headcount.branches),
      designations: arrayOrEmpty(headcount.designations),
      employment_types: arrayOrEmpty(headcount.employment_types),
    },
    attendance: {
      today_summary: attendance.today_summary || null,
      month_summary: attendance.month_summary || null,
      daily_trends: arrayOrEmpty(attendance.daily_trends),
      departments: arrayOrEmpty(attendance.departments),
      exception_employees: arrayOrEmpty(attendance.exception_employees),
    },
    leave: {
      summary: leave.summary || null,
      pending_requests: leave.pending_requests || 0,
      recent_requests: arrayOrEmpty(leave.recent_requests),
    },
    payroll: {
      month: payroll.month || 0,
      year: payroll.year || 0,
      generated_slips: payroll.generated_slips || 0,
      pending_slips: payroll.pending_slips || 0,
      total_gross_salary: payroll.total_gross_salary || 0,
      total_net_salary: payroll.total_net_salary || 0,
      total_deductions: payroll.total_deductions || 0,
    },
    onboarding: {
      complete_employees: onboarding.complete_employees || 0,
      incomplete_employees: onboarding.incomplete_employees || 0,
      pending_review_documents: onboarding.pending_review_documents || 0,
      rejected_documents: onboarding.rejected_documents || 0,
    },
    policies: {
      published_policies: policies.published_policies || 0,
      required_documents: policies.required_documents || 0,
    },
    celebrations: arrayOrEmpty(dashboard.celebrations),
    upcoming_services: arrayOrEmpty(dashboard.upcoming_services),
    operational_alerts: arrayOrEmpty(dashboard.operational_alerts),
  };
}

function topDistributions(items: Distribution[], limit: number) {
  return [...items].sort((a, b) => b.count - a.count).slice(0, limit);
}

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function chartPoints(values: number[]) {
  const source = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...source);
  return source.map((value, index) => `${source.length === 1 ? 100 : (index / (source.length - 1)) * 100},${36 - (value / max) * 28}`).join(" ");
}

function moneyCompact(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, notation: "compact", style: "currency" }).format(value || 0);
}

function fmtDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return new Intl.DateTimeFormat("en", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short" }).format(date);
}
