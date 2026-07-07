"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

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
  leave: { summary?: { total_requests: number; pending_count: number; approved_count: number; rejected_count: number; canceled_count: number; total_days: number; pending_days: number; approved_days: number } | null; pending_requests: number; recent_requests: Array<{ id: string; firstname: string; lastname?: string | null; department_name?: string | null; start_date: string; end_date: string; days: number; status: string }> };
  payroll: { month: number; year: number; generated_slips: number; pending_slips: number; total_gross_salary: number; total_net_salary: number; total_deductions: number };
  onboarding: { complete_employees: number; incomplete_employees: number; pending_review_documents: number; rejected_documents: number };
  policies: { published_policies: number; required_documents: number };
  celebrations: Array<{ id: string; title: string; type_name: string; date: string; days_until: number }>;
  upcoming_services: Array<{ key: string; title: string; description: string; reason: string }>;
  operational_alerts: Array<{ key: string; title: string; severity: string; detail: string }>;
};

type Distribution = { name: string; count: number };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function currentMonth() {
  const date = new Date();
  return { month: String(date.getMonth() + 1), year: String(date.getFullYear()) };
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function fmtMinutes(value = 0) {
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(value || 0);
}

function titleCase(value?: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function employeeName(row: { firstname: string; lastname?: string | null; employee_code?: string | null }) {
  return `${row.firstname} ${row.lastname || ""}`.trim() || row.employee_code || "Employee";
}

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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

export function HRDashboardSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError, onNavigate }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string; onNavigate?: (section: string) => void }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const period = currentMonth();
  const [month, setMonth] = useState(period.month);
  const [year, setYear] = useState(period.year);
  const [dashboard, setDashboard] = useState<HRDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && selectedTenant ? `/hrms/tenants/${selectedTenant.id}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenant);
  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants.filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.plan, tenant.status].some((value) => value.toLowerCase().includes(query))).sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b)));
  }, [tenantSearch, tenants]);

  const loadDashboard = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<HRDashboard>(`${basePath}/dashboard/hr?month=${month}&year=${year}`);
      setDashboard(normalizeHRDashboard(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load HR dashboard.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, month, year]);

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Analytics</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">HR Dashboard</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to view workforce, attendance, leave, payroll, and onboarding analytics.</p></div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Dashboard</button></td></tr>)}</tbody></table></div></section>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Analytics</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{selectedTenant ? `${selectedTenant.name} HR Dashboard` : "HR Dashboard"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Workforce health, approvals, attendance, leave, payroll, and compliance for {dashboard ? `${fmtDate(dashboard.window_start)} to ${fmtDate(dashboard.window_end)}` : "the selected period"}.</p></div>
        <div className="flex flex-wrap gap-3">{isSuperAdmin ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setSelectedTenant(null)} type="button">Back to tenants</button> : null}<select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-bold" onChange={(event) => setMonth(event.target.value)} value={month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2025, index, 1))}</option>)}</select><input className="h-11 w-28 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold" onChange={(event) => setYear(event.target.value)} value={year} /><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={() => void loadDashboard()} type="button">Refresh</button></div>
      </div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {loading && !dashboard ? <div className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-sm font-semibold text-[#6b7280] shadow-sm">Loading HR dashboard...</div> : null}
      {dashboard ? <HRDashboardContent dashboard={dashboard} onNavigate={onNavigate} /> : null}
    </div>
  );
}

function HRDashboardContent({ dashboard, onNavigate }: { dashboard: HRDashboard; onNavigate?: (section: string) => void }) {
  const attendance = dashboard.attendance.month_summary;
  const leave = dashboard.leave.summary;
  return (
    <div className="space-y-6">
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active employees" value={String(dashboard.headcount.active_employees)} sub={`${dashboard.headcount.new_joiners_this_month} new this month`} />
        <Metric label="Today present" value={String(dashboard.attendance.today_summary?.present || 0)} sub={`${dashboard.attendance.today_summary?.incomplete || 0} incomplete · ${dashboard.attendance.today_summary?.absent || 0} absent`} />
        <Metric label="Pending approvals" value={String(dashboard.leave.pending_requests)} sub={`${leave?.approved_count || 0} approved this period`} />
        <Metric label="Payroll net" value={money(dashboard.payroll.total_net_salary)} sub={`${dashboard.payroll.generated_slips} generated · ${dashboard.payroll.pending_slips} pending`} />
      </section>

      {dashboard.operational_alerts.length ? <section className="grid gap-3 lg:grid-cols-3">{dashboard.operational_alerts.map((alert) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm" key={alert.key}><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black uppercase text-[#588368]">{alert.severity}</span><strong className="mt-3 block text-sm text-[#111827]">{alert.title}</strong><p className="mt-1 text-sm font-semibold text-[#6b7280]">{alert.detail}</p></div>)}</section> : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <main className="space-y-6">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-[#111827]">Attendance & Work</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{attendance?.attendance_rate.toFixed(1) || "0.0"}% attendance · {fmtMinutes(attendance?.total_worked_minutes || 0)} worked</p></div><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => onNavigate?.("attendance")} type="button">Open Attendance</button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-5"><MiniStat label="Present days" value={attendance?.present_days || 0} /><MiniStat label="Incomplete" value={attendance?.incomplete_days || 0} /><MiniStat label="Absent days" value={attendance?.absent_days || 0} /><MiniStat label="Leave days" value={attendance?.leave_days || 0} /><MiniStat label="Late days" value={attendance?.late_days || 0} /></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">{dashboard.attendance.departments.slice(0, 6).map((dept) => <DistributionBar key={dept.department_name} label={dept.department_name} value={dept.present_days} total={Math.max(dept.employee_days, 1)} suffix={`${dept.attendance_rate.toFixed(1)}%`} />)}</div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Leave Approvals" action="Open Leaves" onAction={() => onNavigate?.("leave-approvals")}>
              <div className="grid grid-cols-2 gap-3"><MiniStat label="Total" value={leave?.total_requests || 0} /><MiniStat label="Pending" value={leave?.pending_count || 0} /><MiniStat label="Approved" value={leave?.approved_count || 0} /><MiniStat label="Days" value={leave?.total_days || 0} /></div>
              <div className="mt-4 space-y-3">{dashboard.leave.recent_requests.slice(0, 4).map((item) => <div className="rounded-xl bg-[#f8faf9] p-3" key={item.id}><strong className="text-sm text-[#111827]">{employeeName(item)}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">{fmtDate(item.start_date)} to {fmtDate(item.end_date)} · {item.days} days</p></div>)}</div>
            </Panel>
            <Panel title="Payroll" action="Open Payslips" onAction={() => onNavigate?.("payslips")}>
              <div className="grid grid-cols-2 gap-3"><MiniStat label="Generated" value={dashboard.payroll.generated_slips} /><MiniStat label="Pending" value={dashboard.payroll.pending_slips} /><MiniStat label="Gross" value={money(dashboard.payroll.total_gross_salary)} /><MiniStat label="Deductions" value={money(dashboard.payroll.total_deductions)} /></div>
            </Panel>
          </section>
        </main>

        <aside className="space-y-6">
          <Panel title="Workforce Mix"><div className="space-y-3">{dashboard.headcount.departments.slice(0, 6).map((item) => <DistributionBar key={item.name} label={item.name} value={item.count} total={Math.max(dashboard.headcount.active_employees, 1)} />)}</div></Panel>
          <Panel title="Onboarding & Compliance" action="Documents" onAction={() => onNavigate?.("document-requirements")}><div className="grid grid-cols-2 gap-3"><MiniStat label="Complete" value={dashboard.onboarding.complete_employees} /><MiniStat label="Incomplete" value={dashboard.onboarding.incomplete_employees} /><MiniStat label="Pending docs" value={dashboard.onboarding.pending_review_documents} /><MiniStat label="Rejected docs" value={dashboard.onboarding.rejected_documents} /><MiniStat label="Policies" value={dashboard.policies.published_policies} /><MiniStat label="Required docs" value={dashboard.policies.required_documents} /></div></Panel>
          <Panel title="Celebrations"><div className="space-y-3">{dashboard.celebrations.slice(0, 5).map((event) => <div className="rounded-xl bg-[#f8faf9] p-3" key={event.id}><div className="flex items-start justify-between gap-3"><strong className="text-sm text-[#111827]">{event.title}</strong><span className="rounded-full bg-white px-2 py-1 text-xs font-black text-[#588368]">{event.days_until === 0 ? "Today" : `${event.days_until}d`}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.type_name} · {fmtDate(event.date)}</p></div>)}</div></Panel>
        </aside>
      </div>

      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-[#111827]">Coming Soon</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{dashboard.upcoming_services.map((item) => <article className="rounded-2xl border border-dashed border-[#cfd8d3] bg-[#fbfcfb] p-4" key={item.key}><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black uppercase text-[#588368]">Coming soon</span><strong className="mt-4 block text-sm text-[#111827]">{item.title}</strong><p className="mt-2 text-sm leading-6 text-[#6b7280]">{item.description}</p><p className="mt-3 text-xs font-semibold text-[#9ca3af]">{item.reason}</p></article>)}</div>
      </section>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <article className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-3 block text-3xl tracking-tight text-[#111827]">{value}</strong><span className="mt-2 block text-xs font-semibold text-[#588368]">{sub}</span></article>;
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl bg-[#f8faf9] px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-[#9ca3af]">{label}</p><strong className="mt-1 block text-xl text-[#111827]">{typeof value === "number" ? titleCase(String(value)) : value}</strong></div>;
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-black text-[#111827]">{title}</h2>{action ? <button className="text-sm font-black text-[#588368]" onClick={onAction} type="button">{action}</button> : null}</div>{children}</section>;
}

function DistributionBar({ label, value, total, suffix }: { label: string; value: number; total: number; suffix?: string }) {
  const width = `${Math.min(100, Math.max(0, (value / total) * 100))}%`;
  return <div><div className="mb-2 flex items-center justify-between gap-3 text-sm"><strong className="truncate text-[#111827]">{label}</strong><span className="font-black text-[#588368]">{suffix || value}</span></div><div className="h-2 rounded-full bg-[#edf1ef]"><div className="h-2 rounded-full bg-[#588368]" style={{ width }} /></div></div>;
}
