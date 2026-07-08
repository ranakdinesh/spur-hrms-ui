"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  Calendar,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Folder,
  Gift,
  HelpCircle,
  Landmark,
  MapPin,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";

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

function fmtDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-IN", options || { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function fmtLongToday() {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", weekday: "long", year: "numeric" }).format(new Date());
}

function fmtTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", hour12: false, minute: "2-digit" }).format(date);
}

function fmtMinutes(value = 0) {
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function titleCase(value?: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(value || 0);
}

function monthName(month: number) {
  return new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(2026, Math.max(0, month - 1), 1));
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
  const hasOnboardingWork = Boolean((dashboard?.onboarding.required_documents || 0) > 0 || (dashboard?.onboarding.missing_required_documents || []).length > 0 || (dashboard?.onboarding.pending_review_documents || 0) > 0);
  const visibleQuickTools = useMemo(() => (dashboard?.quick_tools || []).filter((tool) => tool.section !== "my-onboarding" || hasOnboardingWork), [dashboard?.quick_tools, hasOnboardingWork]);
  const latestPayslip = dashboard?.payslips?.[0];
  const nextHoliday = dashboard?.celebrations?.find((event) => event.type_name.toLowerCase().includes("holiday") || event.title.toLowerCase().includes("holiday")) || dashboard?.celebrations?.[0];
  const missingDocuments = dashboard?.onboarding.missing_required_documents || [];
  const recentRequests = leave?.recent_requests || [];

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
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#fbfcfa] px-4 py-5 lg:px-6">
        <div className="rounded-2xl border border-[#dfe7df] bg-white p-8 text-sm font-semibold text-[#647067] shadow-[0_18px_55px_rgba(31,41,55,0.08)]">Loading employee dashboard...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#fbfcfa] px-4 py-5 lg:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm font-semibold text-red-700">{error || "Employee dashboard is unavailable."}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_left,rgba(88,131,104,0.12),transparent_34%),linear-gradient(180deg,#ffffff,#f8faf7)] px-4 py-5 text-[#101915] lg:px-6">
      <div className="mx-auto max-w-[1560px]">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111711] sm:text-3xl">Employee Dashboard</h1>
            <p className="mt-1 text-sm font-medium text-[#647067]">{fmtLongToday()}</p>
          </div>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9e3dc] bg-white px-4 py-3 text-sm font-extrabold text-[#17231a] shadow-[0_10px_28px_rgba(24,37,27,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(24,37,27,0.12)] md:w-auto" onClick={() => onNavigate?.("my-onboarding")} type="button">
            <UserRound className="h-4 w-4" />
            View My Profile
          </button>
        </div>

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {needsCheckIn ? <AttendancePrompt error={error} location={attendanceLocation} locationMessage={locationMessage} locationSaving={locationSaving} saving={attendanceSaving} onCaptureLocation={() => void captureAttendanceLocation()} onPunch={() => void punchAttendance("checkin")} /> : null}

        <NeedsAttentionStrip
          documentsMissing={missingDocuments.length}
          leaveAllocated={(leave?.available_days || 0) > 0}
          needsCheckOut={needsCheckOut}
          onDocuments={() => onNavigate?.("my-onboarding")}
          onLeave={() => onNavigate?.("leaves")}
          onPunch={() => void punchAttendance("checkout")}
          saving={attendanceSaving}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <TodayAttendanceCard
            attendanceRequiredToday={attendanceRequiredToday}
            needsCheckOut={needsCheckOut}
            needsRegularisation={needsRegularisation}
            onNavigate={onNavigate}
            onPunch={() => void punchAttendance(needsCheckOut ? "checkout" : "checkin")}
            saving={attendanceSaving}
            todayAttendance={todayAttendance}
            workedMinutes={attendance?.work_totals.today_worked_minutes || 0}
          />
          <LeaveSummaryCard leave={leave} nextHoliday={nextHoliday} onNavigate={onNavigate} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-4">
          <PayCard latestPayslip={latestPayslip} onDownload={downloadPayslip} onNavigate={onNavigate} />
          <DocumentsCard missingDocuments={missingDocuments} onboarding={dashboard.onboarding} onNavigate={onNavigate} />
          <RequestsCard recentRequests={recentRequests} onNavigate={onNavigate} />
          <CompanyUpdatesCard celebrations={dashboard.celebrations} policies={dashboard.policies} onNavigate={onNavigate} />
        </div>

        <section className="mt-5 rounded-2xl border border-[#dfe7df] bg-white/95 p-4 shadow-[0_18px_50px_rgba(31,41,55,0.08)] sm:p-5">
          <h2 className="text-base font-black text-[#121a14]">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ActionTile accent="green" icon={<CalendarCheck className="h-5 w-5" />} label="Apply Leave" note="Submit a new leave request" onClick={() => onNavigate?.("leaves")} />
            <ActionTile accent="blue" icon={<Clock3 className="h-5 w-5" />} label="Regularize Attendance" note="Request attendance correction" onClick={() => onNavigate?.("attendance")} />
            <ActionTile accent="orange" icon={<Download className="h-5 w-5" />} label="Download Payslip" note="View and download payslips" onClick={() => latestPayslip ? void downloadPayslip(latestPayslip.id) : onNavigate?.("payslips")} />
            <ActionTile accent="purple" icon={<Upload className="h-5 w-5" />} label="Upload Document" note="Upload required documents" onClick={() => onNavigate?.("my-onboarding")} />
            <ActionTile accent="teal" icon={<MessageCircle className="h-5 w-5" />} label="Ask HR" note="Raise a question or request" onClick={() => onNavigate?.("hr-helpdesk")} />
          </div>
          {visibleQuickTools.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleQuickTools.slice(0, 4).map((tool) => (
                <button className="rounded-full border border-[#dfe7df] bg-[#f8fbf8] px-3 py-1.5 text-xs font-extrabold text-[#31543d] transition hover:border-[#588368]" key={tool.key} onClick={() => onNavigate?.(tool.section)} type="button">
                  {tool.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function NeedsAttentionStrip({
  documentsMissing,
  leaveAllocated,
  needsCheckOut,
  onDocuments,
  onLeave,
  onPunch,
  saving,
}: {
  documentsMissing: number;
  leaveAllocated: boolean;
  needsCheckOut: boolean;
  onDocuments: () => void;
  onLeave: () => void;
  onPunch: () => void;
  saving: boolean;
}) {
  return (
    <section className="grid overflow-hidden rounded-2xl border border-[#cfe0d5] bg-[#f7fbf7] shadow-[0_18px_45px_rgba(31,41,55,0.07)] lg:grid-cols-[1.15fr_1fr_1fr_1fr]">
      <div className="flex items-center px-5 py-4">
        <h2 className="text-base font-black text-[#17231a]">Needs attention</h2>
      </div>
      <AttentionItem action={needsCheckOut ? onPunch : undefined} icon={<Clock3 className="h-5 w-5" />} label={needsCheckOut ? "Check-out pending" : "Attendance updated"} note={needsCheckOut ? "You are currently checked in" : "No action required now"} tone={needsCheckOut ? "orange" : "green"} disabled={saving} />
      <AttentionItem action={onDocuments} icon={<FileText className="h-5 w-5" />} label={documentsMissing > 0 ? `${documentsMissing} documents missing` : "Documents complete"} note={documentsMissing > 0 ? "Upload your documents" : "No document action pending"} tone={documentsMissing > 0 ? "red" : "green"} />
      <AttentionItem action={onLeave} icon={<Calendar className="h-5 w-5" />} label={leaveAllocated ? "Leave balance available" : "No leave allocation yet"} note={leaveAllocated ? "Plan upcoming time off" : "Contact HR for details"} tone={leaveAllocated ? "green" : "orange"} />
    </section>
  );
}

function AttentionItem({ action, disabled, icon, label, note, tone }: { action?: () => void; disabled?: boolean; icon: ReactNode; label: string; note: string; tone: "green" | "orange" | "red" }) {
  const toneClass = {
    green: "text-[#237344] bg-[#e9f7ee]",
    orange: "text-[#d35f00] bg-[#fff3e8]",
    red: "text-[#cf2f24] bg-[#fff0ed]",
  }[tone];

  return (
    <button className="flex items-center gap-4 border-t border-[#dfe7df] px-5 py-4 text-left transition hover:bg-white disabled:cursor-default lg:border-l lg:border-t-0" disabled={disabled || !action} onClick={action} type="button">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-black ${toneClass.split(" ")[0]}`}>{label}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-[#647067]">{note}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#17231a]" />
    </button>
  );
}

function TodayAttendanceCard({
  attendanceRequiredToday,
  needsCheckOut,
  needsRegularisation,
  onNavigate,
  onPunch,
  saving,
  todayAttendance,
  workedMinutes,
}: {
  attendanceRequiredToday: boolean;
  needsCheckOut: boolean;
  needsRegularisation: boolean;
  onNavigate?: (section: string) => void;
  onPunch: () => void;
  saving: boolean;
  todayAttendance?: AttendanceStatus | null;
  workedMinutes: number;
}) {
  const checkedIn = Boolean(todayAttendance?.first_check_in);
  return (
    <section className="rounded-2xl border border-[#dfe7df] bg-white/95 shadow-[0_18px_50px_rgba(31,41,55,0.08)]">
      <div className="flex items-center justify-between border-b border-[#edf2ee] px-4 py-4 sm:px-5">
        <h2 className="text-base font-black text-[#121a14]">Today <span className="text-sm font-medium text-[#647067]">({fmtDate(todayKey(), { day: "numeric", month: "short", year: "numeric" })})</span></h2>
        <span className="rounded-full bg-[#e9f7ee] px-3 py-1 text-xs font-black text-[#237344]">{titleCase(todayAttendance?.status || "Pending")}</span>
      </div>
      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-center">
        <div className="flex items-center gap-4">
          <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white shadow-[0_14px_30px_rgba(35,115,68,0.25)] ${checkedIn ? "bg-[#2d8a46]" : "bg-[#e87839]"}`}>
            {checkedIn ? <Check className="h-8 w-8" /> : <Clock3 className="h-8 w-8" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#121a14]">{checkedIn ? "Checked in at" : "Check-in pending"}</p>
            <p className="mt-1 text-3xl font-black text-[#237344]">{fmtTime(todayAttendance?.first_check_in)}</p>
          </div>
        </div>
        <InfoStack label="Worked Time (Live)" value={fmtMinutes(workedMinutes)} sub={checkedIn && !todayAttendance?.last_check_out ? "In Progress" : "Recorded"} />
        <InfoStack label="Expected Check-out" value="06:00 PM" sub={needsCheckOut ? "Pending" : "Done"} />
      </div>
      <div className="grid border-t border-[#edf2ee] px-4 py-4 sm:grid-cols-4 sm:px-5">
        <MiniFact icon={<BriefcaseBusiness className="h-5 w-5" />} label="Work Mode" value="Office" />
        <MiniFact icon={<MapPin className="h-5 w-5" />} label="Location Captured" value="Office" />
        <MiniFact icon={<Clock3 className="h-5 w-5" />} label="First In" value={fmtTime(todayAttendance?.first_check_in)} />
        <MiniFact icon={<Clock3 className="h-5 w-5" />} label="Last Out" value={fmtTime(todayAttendance?.last_check_out)} />
      </div>
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5">
        {attendanceRequiredToday ? (
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#06451f] px-4 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(6,69,31,0.18)] disabled:opacity-60" disabled={saving} onClick={onPunch} type="button">
            <Clock3 className="h-4 w-4" />
            {saving ? "Saving..." : needsCheckOut ? "Check Out" : "Check In"}
          </button>
        ) : (
          <span className="inline-flex items-center justify-center rounded-xl bg-[#f2f5f2] px-4 py-3 text-sm font-black text-[#647067]">Attendance not required</span>
        )}
        <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe7df] bg-white px-4 py-3 text-sm font-black text-[#17231a]" onClick={() => onNavigate?.(needsRegularisation ? "attendance" : "attendance")} type="button">
          <CalendarCheck className="h-4 w-4" />
          {needsRegularisation ? "Regularize Attendance" : "View My Attendance"}
        </button>
      </div>
    </section>
  );
}

function LeaveSummaryCard({ leave, nextHoliday, onNavigate }: { leave?: EmployeeDashboard["leave"] | null; nextHoliday?: Celebration; onNavigate?: (section: string) => void }) {
  return (
    <section className="rounded-2xl border border-[#dfe7df] bg-white/95 p-4 shadow-[0_18px_50px_rgba(31,41,55,0.08)] sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-[#121a14]">Leave Summary</h2>
        <button className="text-sm font-extrabold text-[#06451f]" onClick={() => onNavigate?.("leaves")} type="button">View Leave</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LeaveNumber label="Available" tone="green" value={`${(leave?.available_days || 0).toFixed(1)}`} />
        <LeaveNumber label="Used" tone="blue" value={`${(leave?.used_days || 0).toFixed(1)}`} />
        <LeaveNumber label="Pending" tone="orange" value={`${leave?.pending_requests || 0}`} suffix="requests" />
        <div className="rounded-xl border border-[#dfe7df] bg-[#f9fcfa] p-4">
          <p className="text-sm font-semibold text-[#121a14]">Next Holiday</p>
          <p className="mt-2 text-xl font-black text-[#237344]">{nextHoliday ? fmtDate(nextHoliday.date, { day: "numeric", month: "short", year: "numeric" }) : "-"}</p>
          <p className="mt-1 text-xs font-medium text-[#647067]">{nextHoliday ? dashboardEventTitle(nextHoliday) : "No upcoming holiday"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-[#647067]">{(leave?.available_days || 0) > 0 ? "Your current leave allocation is available for planning." : "No leave allocation is available yet."}</p>
      <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#dfe7df] bg-white px-4 py-3 text-sm font-black text-[#17231a] sm:w-auto sm:min-w-[220px]" onClick={() => onNavigate?.("leaves")} type="button">
        <Calendar className="h-4 w-4" />
        Apply Leave
      </button>
    </section>
  );
}

function PayCard({ latestPayslip, onDownload, onNavigate }: { latestPayslip?: Payslip; onDownload: (id: string) => Promise<void>; onNavigate?: (section: string) => void }) {
  return (
    <PanelCard action="View Payslips" onAction={() => onNavigate?.("payslips")} title="Pay & Compensation">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        <div className="rounded-xl border border-[#dfe7df] bg-[#fafcfb] p-4">
          <p className="text-xs font-extrabold text-[#647067]">Latest Payslip</p>
          {latestPayslip ? (
            <>
              <p className="mt-3 text-lg font-black text-[#121a14]">{monthName(latestPayslip.month)} {latestPayslip.year}</p>
              <p className="mt-1 text-sm font-semibold text-[#647067]">{money(latestPayslip.net_salary)}</p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#dfe7df] px-3 py-2 text-xs font-black text-[#17231a]" onClick={() => void onDownload(latestPayslip.id)} type="button">
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
            </>
          ) : (
            <EmptyIllustration icon={<FileText className="h-9 w-9" />} label="No payslip yet" note="Payslips will appear here once generated." />
          )}
        </div>
        <div className="rounded-xl border border-[#dfe7df] bg-[#fbfdf9] p-4">
          <p className="text-xs font-extrabold text-[#647067]">Next Pay Date</p>
          <p className="mt-3 text-lg font-black text-[#121a14]">31 Jul 2026</p>
          <p className="mt-3 inline-flex rounded-full bg-[#e7f1fb] px-3 py-1 text-xs font-black text-[#1b5d8f]">Upcoming</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 divide-x divide-[#dfe7df] border-t border-[#edf2ee] pt-3">
        <SmallLink icon={<FileText className="h-4 w-4" />} label="Tax Declaration" onClick={() => onNavigate?.("payslips")} />
        <SmallLink icon={<Landmark className="h-4 w-4" />} label="Investment Proofs" onClick={() => onNavigate?.("payslips")} />
      </div>
    </PanelCard>
  );
}

function DocumentsCard({ missingDocuments, onboarding, onNavigate }: { missingDocuments: string[]; onboarding: EmployeeDashboard["onboarding"]; onNavigate?: (section: string) => void }) {
  const hasMissingDocuments = missingDocuments.length > 0;

  return (
    <PanelCard action="View All" onAction={() => onNavigate?.("my-onboarding")} title="Documents">
      <div className={`rounded-xl border p-4 ${hasMissingDocuments ? "border-red-100 bg-red-50" : "border-[#dfe7df] bg-[#f8fbf8]"}`}>
        <div className="flex items-start gap-3">
          <FileText className={`mt-0.5 h-5 w-5 ${hasMissingDocuments ? "text-[#cf2f24]" : "text-[#237344]"}`} />
          <div>
            <p className={`text-sm font-black ${hasMissingDocuments ? "text-[#cf2f24]" : "text-[#237344]"}`}>{hasMissingDocuments ? `${missingDocuments.length} documents missing` : "Documents complete"}</p>
            <p className="mt-1 text-xs font-medium text-[#647067]">{onboarding.pending_review_documents} pending review</p>
          </div>
        </div>
      </div>
      {hasMissingDocuments ? (
        <div className="mt-2 divide-y divide-[#edf2ee]">
          {missingDocuments.slice(0, 3).map((document, index) => (
            <div className="flex items-center justify-between gap-3 py-3" key={`${document}-${index}`}>
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-[#cf2f24]" />
                <span className="text-sm font-semibold text-[#121a14]">{document}</span>
              </div>
              <button className="rounded-lg border border-[#dfe7df] px-3 py-1.5 text-xs font-black text-[#17231a]" onClick={() => onNavigate?.("my-onboarding")} type="button">Upload</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-[#edf2ee] bg-white p-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-[#237344]" />
            <div>
              <p className="text-sm font-black text-[#121a14]">No document action pending</p>
              <p className="mt-1 text-xs font-medium text-[#647067]">{onboarding.approved_required_documents} required documents approved</p>
            </div>
          </div>
        </div>
      )}
      <SmallLink icon={<Folder className="h-4 w-4" />} label="Go to Documents" onClick={() => onNavigate?.("my-onboarding")} />
    </PanelCard>
  );
}

function RequestsCard({ recentRequests, onNavigate }: { recentRequests: LeaveRequest[]; onNavigate?: (section: string) => void }) {
  return (
    <PanelCard action="View All" onAction={() => onNavigate?.("inbox")} title="My Requests">
      <div className="divide-y divide-[#edf2ee]">
        <RequestRow icon={<CalendarCheck className="h-4 w-4" />} label="Leave Request" note={recentRequests[0] ? `${titleCase(recentRequests[0].status)} · ${recentRequests[0].days} day(s)` : "No recent requests"} tone="green" />
        <RequestRow icon={<Clock3 className="h-4 w-4" />} label="Attendance Regularization" note="No recent requests" tone="teal" />
        <RequestRow icon={<FileText className="h-4 w-4" />} label="Document Review" note="Pending items" tone="blue" />
        <RequestRow icon={<HelpCircle className="h-4 w-4" />} label="Help / HR Request" note="No recent requests" tone="purple" />
      </div>
      <SmallLink icon={<MessageCircle className="h-4 w-4" />} label="Raise a Request" onClick={() => onNavigate?.("hr-helpdesk")} />
    </PanelCard>
  );
}

function CompanyUpdatesCard({ celebrations, onNavigate, policies }: { celebrations: Celebration[]; policies: Policy[]; onNavigate?: (section: string) => void }) {
  const firstHoliday = celebrations.find((event) => event.type_name.toLowerCase().includes("holiday") || event.title.toLowerCase().includes("holiday"));
  const firstBirthday = celebrations.find((event) => event.type_name.toLowerCase().includes("birthday"));
  const firstAnniversary = celebrations.find((event) => event.type_name.toLowerCase().includes("anniversary"));
  return (
    <PanelCard action="View All" onAction={() => onNavigate?.("policies")} title="Company Updates">
      <div className="divide-y divide-[#edf2ee]">
        <UpdateRow icon={<Calendar className="h-5 w-5" />} label="Upcoming Holiday" primary={firstHoliday ? fmtDate(firstHoliday.date, { day: "numeric", month: "short", year: "numeric", weekday: "short" }) : "-"} secondary={firstHoliday ? dashboardEventTitle(firstHoliday) : "No holiday published"} tone="green" />
        <UpdateRow icon={<Megaphone className="h-5 w-5" />} label="Announcement" primary={policies[0]?.title || "Company policy updates"} secondary={policies[0] ? `Updated ${fmtDate(policies[0].updated_at)}` : "No announcements published"} tone="purple" />
        <UpdateRow icon={<Gift className="h-5 w-5" />} label="Birthdays" primary={firstBirthday ? dashboardEventTitle(firstBirthday) : "-"} secondary={firstBirthday ? fmtDate(firstBirthday.date, { day: "numeric", month: "short" }) : "No birthdays nearby"} tone="orange" />
        <UpdateRow icon={<ShieldCheck className="h-5 w-5" />} label="Work Anniversaries" primary={firstAnniversary ? dashboardEventTitle(firstAnniversary) : "-"} secondary={firstAnniversary ? fmtDate(firstAnniversary.date, { day: "numeric", month: "short" }) : "No anniversaries nearby"} tone="star" />
      </div>
    </PanelCard>
  );
}

function PanelCard({ action, children, onAction, title }: { action: string; children: ReactNode; onAction: () => void; title: string }) {
  return (
    <section className="rounded-2xl border border-[#dfe7df] bg-white/95 shadow-[0_18px_50px_rgba(31,41,55,0.08)]">
      <div className="flex items-center justify-between border-b border-[#edf2ee] px-4 py-3">
        <h2 className="text-base font-black text-[#121a14]">{title}</h2>
        <button className="text-xs font-black text-[#06451f]" onClick={onAction} type="button">{action}</button>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function LeaveNumber({ label, suffix = "days", tone, value }: { label: string; suffix?: string; tone: "green" | "blue" | "orange"; value: string }) {
  const toneClass = {
    blue: "border-[#dae8fb] bg-[#f6f9ff] text-[#124a85]",
    green: "border-[#d8e7dc] bg-[#f8fcf9] text-[#237344]",
    orange: "border-[#f3dfc5] bg-[#fffaf3] text-[#d35f00]",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm font-semibold text-[#121a14]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value} <span className="text-sm font-bold">{suffix}</span></p>
    </div>
  );
}

function InfoStack({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="border-t border-[#edf2ee] pt-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <p className="text-xs font-medium text-[#647067]">{label}</p>
      <p className="mt-1 text-xl font-black text-[#121a14]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#237344]">{sub}</p>
    </div>
  );
}

function MiniFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#edf2ee] py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:py-0 sm:last:border-r-0">
      <span className="text-[#17231a]">{icon}</span>
      <span>
        <span className="block text-xs font-medium text-[#647067]">{label}</span>
        <strong className="mt-1 block text-sm text-[#121a14]">{value}</strong>
      </span>
    </div>
  );
}

function EmptyIllustration({ icon, label, note }: { icon: ReactNode; label: string; note: string }) {
  return (
    <div className="mt-3 flex min-h-36 flex-col items-center justify-center rounded-xl bg-white text-center">
      <span className="text-[#b7c1b9]">{icon}</span>
      <strong className="mt-3 text-sm text-[#121a14]">{label}</strong>
      <span className="mt-2 max-w-40 text-xs font-medium text-[#647067]">{note}</span>
    </div>
  );
}

function SmallLink({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left text-sm font-black text-[#06451f]" onClick={onClick} type="button">
      <span className="flex items-center gap-2">{icon}{label}</span>
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function RequestRow({ icon, label, note, tone }: { icon: ReactNode; label: string; note: string; tone: "green" | "teal" | "blue" | "purple" }) {
  const toneClass = {
    blue: "bg-[#eaf4fb] text-[#1d638d]",
    green: "bg-[#e9f7ee] text-[#237344]",
    purple: "bg-[#f0ecff] text-[#5b3fb0]",
    teal: "bg-[#e8f7f4] text-[#197464]",
  }[tone];
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
        <span>
          <strong className="block text-sm text-[#121a14]">{label}</strong>
          <span className="text-xs font-medium text-[#647067]">{note}</span>
        </span>
      </div>
      <span className="rounded-full bg-[#e9f7ee] px-2 py-1 text-xs font-black text-[#237344]">-</span>
    </div>
  );
}

function UpdateRow({ icon, label, primary, secondary, tone }: { icon: ReactNode; label: string; primary: string; secondary: string; tone: "green" | "purple" | "orange" | "star" }) {
  const toneClass = {
    green: "text-[#237344]",
    orange: "text-[#e87839]",
    purple: "text-[#6a42b9]",
    star: "text-[#d98500]",
  }[tone];
  return (
    <div className="flex gap-3 py-3">
      <span className={toneClass}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-black text-[#121a14]">{label}</span>
        <strong className="mt-1 block truncate text-sm text-[#237344]">{primary}</strong>
        <span className="mt-0.5 block truncate text-xs font-medium text-[#647067]">{secondary}</span>
      </span>
    </div>
  );
}

function ActionTile({ accent, icon, label, note, onClick }: { accent: "green" | "blue" | "orange" | "purple" | "teal"; icon: ReactNode; label: string; note: string; onClick: () => void }) {
  const accentClass = {
    blue: "border-[#d9e8fb] bg-[#f3f8ff] text-[#1b5d8f]",
    green: "border-[#d8e7dc] bg-[#f4fbf6] text-[#237344]",
    orange: "border-[#f3dfc5] bg-[#fff8ee] text-[#b95d06]",
    purple: "border-[#e5ddfb] bg-[#f7f3ff] text-[#5b3fb0]",
    teal: "border-[#d9efeb] bg-[#f3fbf9] text-[#197464]",
  }[accent];
  return (
    <button className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border p-4 text-left shadow-[0_10px_28px_rgba(31,41,55,0.05)] transition hover:-translate-y-0.5 ${accentClass}`} onClick={onClick} type="button">
      <span className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/75">{icon}</span>
        <span>
          <strong className="block text-sm text-[#121a14]">{label}</strong>
          <span className="mt-1 block text-xs font-medium">{note}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#17231a]" />
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101915]/45 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Attendance Required</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[#121a14]">Mark today&apos;s attendance</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#6b7280]">You have not checked in today. Attendance must include your current location so payroll, leave, and attendance reports stay accurate.</p>
        <div className="mt-5 rounded-2xl border border-[#dfe6e2] bg-[#f8faf9] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#121a14]">Current location</p>
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
        <button className="mt-6 w-full rounded-xl bg-[#588368] px-5 py-4 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={onPunch} type="button">
          {saving ? "Marking..." : location ? "Check In Now" : "Get Location & Check In"}
        </button>
      </section>
    </div>
  );
}
