"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";
import { requestAttendanceLocation, type AttendanceLocation } from "@/lib/geolocation";

type EmployeeDashboard = {
  generated_at: string;
  profile?: {
    employee_id: string;
    user_id: string;
    employee_code?: string | null;
    name: string;
    email?: string | null;
    mobile?: string | null;
    department_name?: string | null;
    branch_name?: string | null;
    designation_name?: string | null;
    employment_type?: string | null;
    profile_photo_path?: string | null;
    joining_date?: string | null;
  } | null;
  attendance?: {
    today?: AttendanceStatus | null;
    month_summary?: AttendanceSummary | null;
    recent_days: AttendanceStatus[];
    work_totals: { today_worked_minutes: number; month_worked_minutes: number; month_worked_hours: number; late_days: number; early_exit_days: number };
  } | null;
  leave?: {
    balances: LeaveBalance[];
    recent_requests: LeaveRequest[];
    pending_requests: number;
    available_days: number;
    pending_days: number;
    used_days: number;
  } | null;
  payslips: Payslip[];
  policies: Policy[];
  celebrations: Celebration[];
  quick_tools: QuickTool[];
  onboarding: { status: string; is_complete: boolean; required_documents: number; approved_required_documents: number; pending_review_documents: number; rejected_documents: number; missing_required_documents: string[] };
};

type AttendanceStatus = { date: string; status: string; reason: string; first_check_in?: string | null; last_check_out?: string | null; worked_minutes: number; late_minutes: number; early_exit_minutes: number };
type AttendanceSummary = { present_days: number; absent_days: number; leave_days: number; holiday_days: number; weekoff_days: number; incomplete_days?: number; late_days: number; early_exit_days: number; total_worked_minutes: number; attendance_rate: number };
type LeaveBalance = { leave_type_id: string; leave_type_name: string; total_days: number; used_days: number; pending_days: number; balance_days: number };
type LeaveRequest = { id: string; start_date: string; end_date: string; days: number; status: string; reason?: string | null };
type Payslip = { id: string; month: number; year: number; net_salary: number; created_at: string };
type Policy = { id: string; title: string; description?: string | null; file_path?: string | null; updated_at: string };
type Celebration = { id: string; title: string; type_name: string; date: string; days_until: number; description?: string | null; is_personal_event: boolean };
type QuickTool = { key: string; label: string; description: string; section: string; permission: string };
const attendanceNotRequiredStatuses = new Set(["leave", "holiday", "weekoff", "not_applicable"]);

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function fmtTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function fmtMinutes(value = 0) {
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function titleCase(value?: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(value || 0);
}

function dashboardEventTitle(event: Celebration) {
  if (!event.is_personal_event) return event.title;
  const typeName = event.type_name.toLowerCase().includes("birthday") ? "Birthday" : titleCase(event.type_name);
  return `Your ${typeName}`;
}

function todayKey() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

async function downloadFile(path: string) {
  const { blob, filename } = await apiDownload(path);
  saveBlobDownload(blob, filename);
}

export function EmployeeDashboardSection({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [attendanceLocation, setAttendanceLocation] = useState<AttendanceLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDashboard(await apiRequest<EmployeeDashboard>("/hrms/dashboard/employee"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load employee dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const attendance = dashboard?.attendance;
  const todayAttendance = attendance?.today;
  const attendanceRequiredToday = todayAttendance?.status !== "not_applicable";
  const needsCheckIn = Boolean(dashboard && !todayAttendance?.first_check_in && !attendanceNotRequiredStatuses.has(todayAttendance?.status || ""));
  const needsCheckOut = Boolean(attendanceRequiredToday && todayAttendance?.first_check_in && !todayAttendance?.last_check_out);
  const needsRegularisation = todayAttendance?.status === "incomplete";
  const leave = dashboard?.leave;
  const summary = attendance?.month_summary;
  const leaveBalances = useMemo(() => [...(leave?.balances || [])].sort((a, b) => b.balance_days - a.balance_days), [leave?.balances]);
  const hasOnboardingWork = Boolean((dashboard?.onboarding.required_documents || 0) > 0 || (dashboard?.onboarding.missing_required_documents || []).length > 0 || (dashboard?.onboarding.pending_review_documents || 0) > 0);
  const visibleQuickTools = useMemo(() => (dashboard?.quick_tools || []).filter((tool) => tool.section !== "my-onboarding" || hasOnboardingWork), [dashboard?.quick_tools, hasOnboardingWork]);

  async function captureAttendanceLocation() {
    setError("");
    setLocationMessage("");
    setLocationSaving(true);
    try {
      const captured = await requestAttendanceLocation();
      setAttendanceLocation(captured);
      setLocationMessage("Location captured for this attendance punch.");
      return captured;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Location permission is required to mark attendance.");
      return null;
    } finally {
      setLocationSaving(false);
    }
  }

  async function punchAttendance(action: "checkin" | "checkout") {
    setError("");
    setMessage("");
    setAttendanceSaving(true);
    try {
      const location = attendanceLocation || await captureAttendanceLocation();
      if (!location) return;
      await apiRequest("/hrms/attendances/punch", {
        method: "POST",
        body: {
          action,
          date: todayKey(),
          time: new Date().toISOString(),
          source: "web",
          work_mode: "office",
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
      setMessage(action === "checkin" ? "Check-in captured." : "Check-out captured.");
      setAttendanceLocation(null);
      setLocationMessage("");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : action === "checkin" ? "Unable to check in." : "Unable to check out.");
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function downloadPayslip(id: string) {
    setError("");
    setMessage("");
    try {
      await downloadFile(`/hrms/salary-slips/${id}/pdf`);
      setMessage("Download started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download payslip.");
    }
  }

  if (loading) {
    return <div className="px-4 py-6 lg:px-6 lg:py-8"><div className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-sm font-semibold text-[#6b7280] shadow-sm">Loading employee dashboard...</div></div>;
  }

  if (!dashboard) {
    return <div className="px-4 py-6 lg:px-6 lg:py-8"><div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm font-semibold text-red-700">{error || "Employee dashboard is unavailable."}</div></div>;
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111827]">Employee Dashboard</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#6b7280]">
            <span>⌂</span>
            <span>/</span>
            <span>Home</span>
            <span>/</span>
            <span className="font-semibold text-[#111827]">Self Service</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-2.5 text-sm font-black text-[#374151]" onClick={() => void loadDashboard()} type="button">Refresh</button>
          <button className="rounded-lg bg-[#588368] px-4 py-2.5 text-sm font-black text-white shadow-sm" onClick={() => void downloadFile("/hrms/salary-slips/recent-download?months=6")} type="button">Payslips ZIP</button>
        </div>
      </div>

      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {needsCheckIn ? <AttendancePrompt error={error} location={attendanceLocation} locationMessage={locationMessage} locationSaving={locationSaving} saving={attendanceSaving} onCaptureLocation={() => void captureAttendanceLocation()} onPunch={() => void punchAttendance("checkin")} /> : null}

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#588368]">Attendance</p>
              <h2 className="mt-2 text-2xl font-black text-[#111827]">{fmtMinutes(attendance?.work_totals.today_worked_minutes || 0)}</h2>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">Today · {titleCase(todayAttendance?.status)}</p>
            </div>
            <span className="rounded-lg bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{fmtTime(todayAttendance?.first_check_in)} - {fmtTime(todayAttendance?.last_check_out)}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <EmployeeMetric label="Month Hours" value={fmtMinutes(attendance?.work_totals.month_worked_minutes || 0)} tone="primary" />
            <EmployeeMetric label="Attendance" value={`${summary?.attendance_rate?.toFixed(1) || "0.0"}%`} tone="secondary" />
            <EmployeeMetric label="Incomplete" value={String(summary?.incomplete_days || 0)} tone="tertiary" />
            <EmployeeMetric label="Early Exit" value={String(summary?.early_exit_days || 0)} tone="dark" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {!attendanceRequiredToday ? <span className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700">Attendance not required</span> : null}
            {attendanceRequiredToday && !todayAttendance?.first_check_in ? <button className="rounded-lg bg-[#588368] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60" disabled={attendanceSaving} onClick={() => void punchAttendance("checkin")} type="button">{attendanceSaving ? "Saving..." : "Check In"}</button> : null}
            {needsCheckOut ? <button className="rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60" disabled={attendanceSaving} onClick={() => void punchAttendance("checkout")} type="button">{attendanceSaving ? "Saving..." : "Check Out"}</button> : null}
            {needsRegularisation ? <button className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-black text-white" onClick={() => onNavigate?.("attendance")} type="button">Regularise</button> : null}
            <button className="rounded-lg border border-[#dbe0e5] px-4 py-2.5 text-sm font-black text-[#374151]" onClick={() => onNavigate?.("attendance")} type="button">Details</button>
          </div>
        </section>

        <section className="rounded-xl border border-[#dfe6e2] bg-[#588368] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-white/70">Leave Summary</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-black">{leave?.available_days.toFixed(1) || "0.0"}</p>
              <p className="mt-1 text-xs font-bold text-white/75">Available</p>
            </div>
            <div>
              <p className="text-3xl font-black">{leave?.pending_requests || 0}</p>
              <p className="mt-1 text-xs font-bold text-white/75">Pending</p>
            </div>
          </div>
          <button className="mt-6 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-black text-[#111827]" onClick={() => onNavigate?.("leaves")} type="button">Apply Leave</button>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <main className="space-y-6">
          <section className="rounded-xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#111827]">Leave Balances</h2>
                <p className="mt-1 text-sm font-semibold text-[#6b7280]">{leave?.used_days.toFixed(1) || "0.0"} used · {leave?.pending_days.toFixed(1) || "0.0"} pending</p>
              </div>
              <button className="rounded-lg border border-[#dbe0e5] px-4 py-2.5 text-sm font-black text-[#374151]" onClick={() => onNavigate?.("leaves")} type="button">Apply Leave</button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {leaveBalances.length ? leaveBalances.map((balance) => <LeaveTypeCard balance={balance} key={balance.leave_type_id} />) : <p className="rounded-lg bg-[#f8faf9] p-4 text-sm font-semibold text-[#6b7280] md:col-span-2">No leave allocation is available yet.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#111827]">Attendance History</h2>
                <p className="mt-1 text-sm font-semibold text-[#6b7280]">Recent working days and status</p>
              </div>
              <button className="rounded-lg border border-[#dbe0e5] px-4 py-2.5 text-sm font-black text-[#374151]" onClick={() => onNavigate?.("attendance")} type="button">Open Attendance</button>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-7">
              {(attendance?.recent_days || []).map((day) => <AttendanceDay day={day} key={day.date} />)}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#dfe6e2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Recent Payslips</h2><button className="text-sm font-black text-[#588368]" onClick={() => onNavigate?.("payslips")} type="button">View all</button></div>
            <div className="divide-y divide-[#edf1ef]">
              {dashboard.payslips.length ? dashboard.payslips.slice(0, 4).map((slip) => <div className="flex items-center justify-between gap-4 px-5 py-4" key={slip.id}><div><strong className="text-sm text-[#111827]">{String(slip.month).padStart(2, "0")}/{slip.year}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">{money(slip.net_salary)} net salary</p></div><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => void downloadPayslip(slip.id)} type="button">PDF</button></div>) : <p className="px-5 py-8 text-sm font-semibold text-[#6b7280]">No salary slips generated yet.</p>}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#111827]">Quick Actions</h2>
            <div className="mt-5 grid gap-3">
              {visibleQuickTools.map((tool, index) => <QuickAction tool={tool} index={index} key={tool.key} onNavigate={onNavigate} />)}
            </div>
          </section>

          {hasOnboardingWork ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#111827]">Documents</h2>
              <p className="mt-2 text-sm font-semibold text-amber-800">{dashboard.onboarding.pending_review_documents} pending review · {dashboard.onboarding.missing_required_documents.length} missing</p>
              <button className="mt-4 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-black text-white" onClick={() => onNavigate?.("my-onboarding")} type="button">Open Documents</button>
            </section>
          ) : null}

          <section className="rounded-xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#111827]">Upcoming Events</h2>
            <div className="mt-5 space-y-3">
              {dashboard.celebrations.length ? dashboard.celebrations.slice(0, 5).map((event) => <div className="rounded-lg bg-[#f8faf9] p-4" key={event.id}><div className="flex items-start justify-between gap-3"><strong className="text-sm text-[#111827]">{dashboardEventTitle(event)}</strong><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#588368]">{event.days_until === 0 ? "Today" : `${event.days_until}d`}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.is_personal_event ? "Personal event" : event.type_name} · {fmtDate(event.date)}</p></div>) : <p className="text-sm font-semibold text-[#6b7280]">No upcoming events published.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#111827]">Policies</h2>
            <div className="mt-5 space-y-3">
              {dashboard.policies.length ? dashboard.policies.slice(0, 4).map((policy) => <button className="block w-full rounded-lg border border-[#edf1ef] px-4 py-3 text-left hover:border-[#588368]" key={policy.id} onClick={() => onNavigate?.("policies")} type="button"><strong className="block text-sm text-[#111827]">{policy.title}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">Updated {fmtDate(policy.updated_at)}</span></button>) : <p className="text-sm font-semibold text-[#6b7280]">No company policies published.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function EmployeeMetric({ label, value, tone }: { label: string; value: string; tone: "primary" | "secondary" | "tertiary" | "dark" }) {
  const toneClass = {
    dark: "bg-[#111827] text-white",
    primary: "bg-[#eef4f1] text-[#588368]",
    secondary: "bg-[#eff6ff] text-[#2563eb]",
    tertiary: "bg-[#fff7ed] text-[#9a5b1f]",
  }[tone];

  return (
    <div className={`rounded-lg p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <strong className="mt-2 block text-2xl font-black">{value}</strong>
    </div>
  );
}

function LeaveTypeCard({ balance }: { balance: LeaveBalance }) {
  const width = Math.min(100, Math.max(0, (balance.balance_days / Math.max(balance.total_days, 1)) * 100));
  return (
    <div className="rounded-lg border border-[#edf1ef] p-4">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm text-[#111827]">{balance.leave_type_name}</strong>
        <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{balance.balance_days.toFixed(1)} left</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf1ef]">
        <div className="h-full rounded-full bg-[#588368]" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-[#6b7280]">
        <span>Total {balance.total_days.toFixed(1)}</span>
        <span>Used {balance.used_days.toFixed(1)}</span>
        <span>Pending {balance.pending_days.toFixed(1)}</span>
      </div>
    </div>
  );
}

function AttendanceDay({ day }: { day: AttendanceStatus }) {
  const className =
    day.status === "present"
      ? "bg-[#ecfdf3] text-[#16803c]"
      : day.status === "incomplete"
        ? "bg-amber-50 text-amber-800"
      : day.status === "absent"
        ? "bg-[#fef2f2] text-[#b42318]"
        : day.status === "leave"
          ? "bg-[#eff6ff] text-[#2563eb]"
          : day.status === "weekoff" || day.status === "holiday"
            ? "bg-[#fff7ed] text-[#9a5b1f]"
            : "bg-[#f8faf9] text-[#4b5563]";

  return (
    <span className={`rounded-lg px-3 py-3 text-center text-xs font-black ${className}`}>
      {fmtDate(day.date).slice(0, 6)}
      <strong className="mt-1 block text-current">{titleCase(day.status)}</strong>
    </span>
  );
}

function QuickAction({ tool, index, onNavigate }: { tool: QuickTool; index: number; onNavigate?: (section: string) => void }) {
  const colors = ["bg-[#eef4f1] text-[#588368]", "bg-[#eff6ff] text-[#2563eb]", "bg-[#fff7ed] text-[#9a5b1f]", "bg-[#111827] text-white"];
  return (
    <button className="flex items-start gap-3 rounded-lg border border-[#edf1ef] px-4 py-3 text-left hover:border-[#588368] hover:bg-[#f8faf9]" onClick={() => onNavigate?.(tool.section)} type="button">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${colors[index % colors.length]}`}>{index + 1}</span>
      <span>
        <strong className="block text-sm text-[#111827]">{tool.label}</strong>
        <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tool.description}</span>
      </span>
    </button>
  );
}

function AttendancePrompt({
  error,
  location,
  locationMessage,
  locationSaving,
  onCaptureLocation,
  onPunch,
  saving,
}: {
  error?: string;
  location: AttendanceLocation | null;
  locationMessage?: string;
  locationSaving: boolean;
  onCaptureLocation: () => void;
  onPunch: () => void;
  saving: boolean;
}) {
  const title = "Mark today's attendance";
  const body = "You have not checked in today. Attendance must include your current location so payroll, leave, and attendance reports stay accurate.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Attendance Required</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[#111827]">{title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#6b7280]">{body}</p>
        <div className="mt-5 rounded-2xl border border-[#dfe6e2] bg-[#f8faf9] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#111827]">Current location</p>
              <p className="mt-1 text-xs font-semibold text-[#6b7280]">
                {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : locationMessage || "Location is required before attendance can be marked."}
              </p>
            </div>
            <button className="rounded-xl border border-[#dbe8e1] bg-white px-4 py-2.5 text-xs font-black text-[#588368] disabled:opacity-60" disabled={locationSaving || saving} onClick={onCaptureLocation} type="button">
              {locationSaving ? "Locating..." : location ? "Refresh" : "Use Location"}
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="flex-1 rounded-xl bg-[#588368] px-5 py-4 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={onPunch} type="button">
            {saving ? "Marking..." : location ? "Check In Now" : "Get Location & Check In"}
          </button>
        </div>
      </section>
    </div>
  );
}
