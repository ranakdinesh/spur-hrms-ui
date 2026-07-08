"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { HrmsModal } from "@/components/hrms/HrmsModal";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";
import { requestAttendanceLocation, type AttendanceLocation } from "@/lib/geolocation";

type Employee = { user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null };
type Attendance = {
  id: string;
  user_id: string;
  date: string;
  time?: string | null;
  type?: string | null;
  status?: string | null;
  source?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  work_mode?: string | null;
  remarks?: string | null;
  created_at: string;
};

type AttendanceStatusRow = {
  user_id: string;
  employee_code?: string | null;
  firstname: string;
  lastname?: string | null;
  department_name?: string | null;
  branch_name?: string | null;
  date: string;
  status: string;
  reason: string;
  first_check_in?: string | null;
  last_check_out?: string | null;
  worked_minutes: number;
  working_hour?: { is_working_day: boolean; start_time: string; end_time: string; source?: string | null } | null;
  holiday?: { name: string } | null;
};
type AttendanceStatusSummary = {
  total_employees: number;
  present: number;
  leave: number;
  absent: number;
  holiday: number;
  weekoff: number;
  incomplete: number;
  empty: number;
  not_applicable: number;
  total_worked_minutes: number;
};
type AttendancePolicy = { id: string; name: string; code: string; schedule_type: string; is_default: boolean; grace_late_minutes: number; grace_early_minutes: number; allow_wfh: boolean; approval_mode: string; standard_work_minutes: number; min_half_day_minutes: number; min_full_day_minutes: number };
type AttendanceRequest = { id: string; user_id: string; date: string; request_type: string; requested_type?: string | null; requested_checkin_at?: string | null; requested_checkout_at?: string | null; requested_work_mode?: string | null; reason?: string | null; status: string; remarks?: string | null; workflow_id?: string | null; route_mode?: string | null; escalation_due_at?: string | null; payroll_blocking?: boolean };
type AttendanceExceptionWorkflow = { id: string; code: string; name: string; description?: string | null; request_type: string; route_mode: string; max_requests_per_month: number; escalation_hours: number; escalation_route_mode?: string | null; block_payroll_when_pending: boolean; auto_approve: boolean; is_active: boolean };
type AttendanceRoster = { id: string; user_id: string; policy_id?: string | null; date: string; start_time?: string | null; end_time?: string | null; work_mode: string; location_type: string; remarks?: string | null };
type AttendanceSite = { id: string; code: string; name: string; location_type: string; latitude?: number | null; longitude?: number | null; radius_meters: number; address?: string | null; inactive: boolean };
type AttendanceDevice = { id: string; attendance_location_id?: string | null; code: string; name: string; vendor?: string | null; model?: string | null; serial_number?: string | null; integration_type: string; direction_mode: string; timezone: string; status: string };
type EmployeeAttendanceDevice = { id: string; user_id: string; device_id: string; device_user_id: string; credential_type: string; card_number?: string | null };
type AttendanceReportRow = {
  user_id: string;
  employee_code?: string | null;
  firstname: string;
  lastname?: string | null;
  department_name?: string | null;
  branch_name?: string | null;
  date: string;
  status: string;
  reason: string;
  rule_outcome?: string | null;
  policy_name?: string | null;
  schedule_type?: string | null;
  work_mode?: string | null;
  first_check_in?: string | null;
  last_check_out?: string | null;
  worked_minutes: number;
  late_minutes: number;
  early_exit_minutes: number;
  punch_count: number;
};
type AttendanceReport = {
  summary: {
    employee_days: number;
    present_days: number;
    absent_days: number;
    leave_days: number;
    holiday_days: number;
    weekoff_days: number;
    incomplete_days: number;
    late_days: number;
    half_days: number;
    early_exit_days: number;
    total_worked_minutes: number;
    average_worked_minutes: number;
    attendance_rate: number;
    absenteeism_rate: number;
    late_rate: number;
    pending_requests: number;
  };
  rows: AttendanceReportRow[];
  departments: { department_name: string; employee_days: number; present_days: number; absent_days: number; incomplete_days: number; late_days: number; average_worked_minutes: number; attendance_rate: number }[];
  daily_trends: { date: string; employee_days: number; present_days: number; absent_days: number; late_days: number; average_worked_minutes: number }[];
  work_modes: { work_mode: string; days: number; worked_minutes: number; share_percent: number }[];
  late_employees: AttendanceReportRow[];
  absence_employees: AttendanceReportRow[];
  exception_employees: AttendanceReportRow[];
};
type LocationState = AttendanceLocation | null;

const workModes = [
  { value: "office", label: "Office" },
  { value: "remote", label: "Remote" },
  { value: "field", label: "Field" },
  { value: "hybrid", label: "Hybrid" },
];
const sources = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "kiosk", label: "Kiosk" },
  { value: "biometric", label: "Biometric" },
  { value: "api", label: "Integration" },
];
const locationTypes = [
  { value: "office", label: "Office" },
  { value: "branch", label: "Branch" },
  { value: "warehouse", label: "Warehouse" },
  { value: "client_site", label: "Client Site" },
  { value: "field_zone", label: "Field Zone" },
  { value: "project_site", label: "Project Site" },
  { value: "remote", label: "Remote" },
  { value: "other", label: "Other" },
];
const integrationTypes = [
  { value: "edge_agent", label: "Edge Agent" },
  { value: "push", label: "Push" },
  { value: "poll", label: "Poll" },
  { value: "file_import", label: "File Import" },
  { value: "api", label: "API" },
];
const directionModes = [
  { value: "auto", label: "Auto" },
  { value: "in_out", label: "In/Out" },
  { value: "entry_exit", label: "Entry/Exit" },
  { value: "checkin_only", label: "Check-in Only" },
  { value: "checkout_only", label: "Check-out Only" },
];
const credentialTypes = [
  { value: "biometric", label: "Biometric" },
  { value: "fingerprint", label: "Fingerprint" },
  { value: "face", label: "Face" },
  { value: "card", label: "Card" },
  { value: "pin", label: "PIN" },
  { value: "mobile", label: "Mobile" },
  { value: "other", label: "Other" },
];

function todayKey() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeLabel(item?: Employee) {
  if (!item) return "My attendance";
  return `${item.firstname} ${item.lastname || ""}`.trim() || item.employee_code || item.user_id;
}

function fmtTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function titleCase(value?: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function fmtMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

const emptySummary: AttendanceStatusSummary = { total_employees: 0, present: 0, leave: 0, absent: 0, holiday: 0, weekoff: 0, incomplete: 0, empty: 0, not_applicable: 0, total_worked_minutes: 0 };
const emptyReport: AttendanceReport = {
  summary: { employee_days: 0, present_days: 0, absent_days: 0, leave_days: 0, holiday_days: 0, weekoff_days: 0, incomplete_days: 0, late_days: 0, half_days: 0, early_exit_days: 0, total_worked_minutes: 0, average_worked_minutes: 0, attendance_rate: 0, absenteeism_rate: 0, late_rate: 0, pending_requests: 0 },
  rows: [],
  departments: [],
  daily_trends: [],
  work_modes: [],
  late_employees: [],
  absence_employees: [],
  exception_employees: [],
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeAttendanceReport(value: AttendanceReport | null | undefined): AttendanceReport {
  if (!value) return emptyReport;
  return {
    summary: value.summary || emptyReport.summary,
    rows: safeArray(value.rows),
    departments: safeArray(value.departments),
    daily_trends: safeArray(value.daily_trends),
    work_modes: safeArray(value.work_modes),
    late_employees: safeArray(value.late_employees),
    absence_employees: safeArray(value.absence_employees),
    exception_employees: safeArray(value.exception_employees),
  };
}

export function AttendanceSection({ isSuperAdmin, selfServiceOnly = false, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; selfServiceOnly?: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  if (selfServiceOnly) {
    return <MyAttendanceSelfService />;
  }
  return <AttendanceOperationsSection isSuperAdmin={isSuperAdmin} tenants={tenants} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />;
}

function MyAttendanceSelfService() {
  const [date, setDate] = useState(todayKey());
  const [workMode, setWorkMode] = useState("office");
  const [source, setSource] = useState("web");
  const [remarks, setRemarks] = useState("");
  const [location, setLocation] = useState<LocationState>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [items, setItems] = useState<Attendance[]>([]);
  const [statusRows, setStatusRows] = useState<AttendanceStatusRow[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [requestForm, setRequestForm] = useState({ request_type: "missed_punch", requested_type: "missed_punch", requested_checkin_at: "", requested_checkout_at: "", requested_work_mode: "office", reason: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedStatus = statusRows[0] || null;
  const attendanceRequired = selectedStatus?.status !== "not_applicable";
  const counts = useMemo(() => {
    const checkins = items.filter((item) => item.type === "checkin").length;
    const checkouts = items.filter((item) => item.type === "checkout").length;
    return { checkins, checkouts, open: checkins > checkouts };
  }, [items]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ date });
      const [attendanceData, statusData, requestData] = await Promise.all([
        apiRequest<Attendance[]>(`/hrms/attendances?${query.toString()}`),
        apiRequest<AttendanceStatusRow[]>(`/hrms/attendances/status?${query.toString()}`),
        apiRequest<AttendanceRequest[]>("/hrms/attendance-requests"),
      ]);
      setItems(attendanceData);
      setStatusRows(statusData);
      setRequests(requestData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load my attendance.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function captureLocation(): Promise<AttendanceLocation> {
    setLocationMessage("");
    setLocationLoading(true);
    try {
      const captured = await requestAttendanceLocation();
      setLocation(captured);
      setLocationMessage("Location ready for the next punch.");
      return captured;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Location permission is required to mark attendance.";
      setLocationMessage(message);
      throw new Error(message);
    } finally {
      setLocationLoading(false);
    }
  }

  async function punch(action: "checkin" | "checkout") {
    setMessage("");
    setError("");
    if (!attendanceRequired) {
      setError("Attendance is not required today.");
      return;
    }
    try {
      const punchLocation = location || await captureLocation();
      await apiRequest("/hrms/attendances/punch", {
        method: "POST",
        body: {
          action,
          date,
          time: new Date().toISOString(),
          source,
          work_mode: workMode,
          latitude: punchLocation.latitude,
          longitude: punchLocation.longitude,
          remarks: remarks || undefined,
        },
      });
      setMessage(action === "checkin" ? "Check-in captured." : "Check-out captured.");
      setRemarks("");
      setLocation(null);
      setLocationMessage("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to punch attendance.");
    }
  }

  async function createAttendanceRequest() {
    setMessage("");
    setError("");
    try {
      const toISO = (value: string) => value ? new Date(`${date}T${value}:00`).toISOString() : undefined;
      await apiRequest("/hrms/attendance-requests", {
        method: "POST",
        body: {
          ...requestForm,
          date,
          requested_checkin_at: toISO(requestForm.requested_checkin_at),
          requested_checkout_at: toISO(requestForm.requested_checkout_at),
          reason: requestForm.reason || undefined,
        },
      });
      setMessage("Attendance regularization request submitted.");
      setRequestForm((current) => ({ ...current, reason: "" }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit attendance request.");
    }
  }

  function prepareMissingCheckoutRequest() {
    const now = new Date();
    setRequestForm((current) => ({
      ...current,
      request_type: "missed_punch",
      requested_type: "checkout",
      requested_checkin_at: selectedStatus?.first_check_in ? new Date(selectedStatus.first_check_in).toTimeString().slice(0, 5) : current.requested_checkin_at,
      requested_checkout_at: now.toTimeString().slice(0, 5),
      requested_work_mode: workMode,
      reason: current.reason || "Forgot to check out. Please regularize the missing checkout.",
    }));
    setMessage("Missing checkout request is ready. Review it and submit.");
  }

  return (
    <section className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#588368]">Self Service</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#172033]">My Attendance</h1>
        </div>
        <button className="rounded-xl border border-[#dbe8e1] bg-white px-5 py-3 text-sm font-black text-[#588368]" onClick={() => void loadData()} type="button">Refresh</button>
      </div>

      {message ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.55fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#588368]">{fmtDate(date)}</p>
                <h2 className="mt-2 text-2xl font-black text-[#172033]">{selectedStatus ? titleCase(selectedStatus.status) : counts.open ? "Checked In" : "Not Checked In"}</h2>
                <p className="mt-1 text-sm font-semibold text-[#6b7280]">{selectedStatus?.reason || `${counts.checkins} check-in / ${counts.checkouts} check-out`}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${counts.open ? "bg-emerald-50 text-emerald-700" : "bg-[#eef4f1] text-[#588368]"}`}>{counts.open ? "Active" : "Idle"}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className="rounded-2xl bg-[#588368] px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9fb4a6]" disabled={loading || locationLoading || counts.open || !attendanceRequired} onClick={() => void punch("checkin")} type="button">{locationLoading ? "Locating..." : "Check In"}</button>
              <button className="rounded-2xl bg-[#e87839] px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#d1d5db]" disabled={loading || locationLoading || !counts.open || !attendanceRequired} onClick={() => void punch("checkout")} type="button">{locationLoading ? "Locating..." : "Check Out"}</button>
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl bg-[#f8faf9] p-4 text-xs font-semibold text-[#6b7280] sm:grid-cols-2">
              <span>Working hours: {selectedStatus?.working_hour ? `${selectedStatus.working_hour.start_time} - ${selectedStatus.working_hour.end_time}` : "-"}</span>
              <span>Worked: {selectedStatus ? fmtMinutes(selectedStatus.worked_minutes) : "-"}</span>
              <span>First in: {fmtTime(selectedStatus?.first_check_in)}</span>
              <span>Last out: {fmtTime(selectedStatus?.last_check_out)}</span>
            </div>
            {!attendanceRequired ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Attendance is not required for this date.</p> : null}
            {selectedStatus?.status === "incomplete" ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Checkout is missing for this day.</p><button className="mt-3 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white" onClick={prepareMissingCheckoutRequest} type="button">Prepare Regularization</button></div> : null}
          </section>

          <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#172033]">Punch Context</h2>
            <div className="mt-4 grid gap-3">
              <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
              <div className="grid gap-3 md:grid-cols-2">
                <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setWorkMode(event.target.value)} value={workMode}>{workModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setSource(event.target.value)} value={source}>{sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </div>
              <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks for this punch" value={remarks} />
              <button className="rounded-xl border border-[#dbe8e1] bg-[#f8faf9] px-5 py-3 text-sm font-black text-[#588368] disabled:opacity-60" disabled={locationLoading} onClick={() => void captureLocation().catch(() => undefined)} type="button">{locationLoading ? "Locating..." : location ? "Refresh current location" : "Use current location"}</button>
              <p className="text-xs font-semibold text-[#6b7280]">{location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : locationMessage || "Location is saved only with the punch record."}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#172033]">Punch Timeline</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Work Mode</th><th className="p-3">Source</th><th className="p-3">Remarks</th></tr></thead>
                <tbody>{items.map((item) => <tr className="border-t border-[#edf1ef]" key={item.id}><td className="p-3 font-black text-[#172033]">{fmtTime(item.time || item.created_at)}</td><td className="p-3"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{titleCase(item.type)}</span></td><td className="p-3">{titleCase(item.work_mode)}</td><td className="p-3">{titleCase(item.source)}</td><td className="p-3 text-[#6b7280]">{item.remarks || "-"}</td></tr>)}</tbody>
              </table>
            </div>
            {items.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8faf9] px-4 py-4 text-sm font-semibold text-[#6b7280]">No punches found for this date.</p> : null}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#172033]">Regularization</h2>
            <div className="mt-4 grid gap-3">
              <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, request_type: e.target.value, requested_type: e.target.value }))} value={requestForm.request_type}><option value="missed_punch">Missed punch</option><option value="late_exemption">Late exemption</option><option value="early_exit_exemption">Early exit exemption</option><option value="wfh">WFH</option><option value="halfday">Half day</option><option value="absent">Absent correction</option></select>
              <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, requested_work_mode: e.target.value }))} value={requestForm.requested_work_mode}>{workModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <div className="grid gap-3 sm:grid-cols-2"><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, requested_checkin_at: e.target.value }))} type="time" value={requestForm.requested_checkin_at} /><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, requested_checkout_at: e.target.value }))} type="time" value={requestForm.requested_checkout_at} /></div>
              <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-3 py-2 text-sm" onChange={(e) => setRequestForm((c) => ({ ...c, reason: e.target.value }))} placeholder="Reason for correction" value={requestForm.reason} />
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={() => void createAttendanceRequest()} type="button">Submit Request</button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#172033]">My Requests</h2>
            <div className="mt-4 space-y-3">{requests.map((item) => <article className="rounded-xl border border-[#edf1ef] p-4" key={item.id}><p className="text-sm font-black text-[#172033]">{titleCase(item.request_type)} · {fmtDate(item.date)}</p><p className="mt-1 text-xs font-semibold text-[#6b7280]">{item.reason || "No reason"} · {titleCase(item.status)}</p></article>)}</div>
            {requests.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8faf9] px-4 py-4 text-sm font-semibold text-[#6b7280]">No attendance requests found.</p> : null}
          </section>
        </aside>
      </div>
    </section>
  );
}

function AttendanceOperationsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [date, setDate] = useState(todayKey());
  const [workMode, setWorkMode] = useState("office");
  const [source, setSource] = useState("web");
  const [deviceID, setDeviceID] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [location, setLocation] = useState<LocationState>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [items, setItems] = useState<Attendance[]>([]);
  const [statusRows, setStatusRows] = useState<AttendanceStatusRow[]>([]);
  const [summary, setSummary] = useState<AttendanceStatusSummary>(emptySummary);
  const [reportStartDate, setReportStartDate] = useState(todayKey());
  const [reportEndDate, setReportEndDate] = useState(todayKey());
  const [report, setReport] = useState<AttendanceReport>(emptyReport);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [rosters, setRosters] = useState<AttendanceRoster[]>([]);
  const [attendanceLocations, setAttendanceLocations] = useState<AttendanceSite[]>([]);
  const [attendanceDevices, setAttendanceDevices] = useState<AttendanceDevice[]>([]);
  const [employeeDeviceMappings, setEmployeeDeviceMappings] = useState<EmployeeAttendanceDevice[]>([]);
  const [exceptionWorkflows, setExceptionWorkflows] = useState<AttendanceExceptionWorkflow[]>([]);
  const [payrollBlockers, setPayrollBlockers] = useState<AttendanceRequest[]>([]);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({ name: "General Attendance", code: "general", schedule_type: "fixed", is_default: true, grace_late_minutes: 10, grace_early_minutes: 10, standard_work_minutes: 480, min_half_day_minutes: 240, min_full_day_minutes: 420, allow_wfh: false, wfh_days_per_week: 0, approval_mode: "manager" });
  const [workflowForm, setWorkflowForm] = useState({ code: "missed-punch-manager", name: "Missed Punch Approval", description: "", request_type: "missed_punch", route_mode: "manager", max_requests_per_month: 3, escalation_hours: 24, escalation_route_mode: "hr", block_payroll_when_pending: true, auto_approve: false, is_active: true });
  const [requestForm, setRequestForm] = useState({ request_type: "missed_punch", requested_type: "missed_punch", requested_checkin_at: "", requested_checkout_at: "", requested_work_mode: "office", reason: "" });
  const [rosterForm, setRosterForm] = useState({ start_time: "09:00", end_time: "18:00", work_mode: "office", location_type: "office", policy_id: "", remarks: "" });
  const [locationForm, setLocationForm] = useState({ code: "", name: "", location_type: "office", latitude: "", longitude: "", radius_meters: 100, address: "" });
  const [deviceForm, setDeviceForm] = useState({ code: "", name: "", vendor: "", model: "", serial_number: "", attendance_location_id: "", integration_type: "edge_agent", direction_mode: "auto", timezone: "Asia/Kolkata", status: "active" });
  const [employeeDeviceForm, setEmployeeDeviceForm] = useState({ user_id: "", device_id: "", device_user_id: "", credential_type: "biometric", card_number: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const checkins = items.filter((item) => item.type === "checkin").length;
    const checkouts = items.filter((item) => item.type === "checkout").length;
    return { checkins, checkouts, open: checkins > checkouts };
  }, [items]);
  const selectedStatus = useMemo(() => {
    if (selectedUser) return statusRows.find((item) => item.user_id === selectedUser) || null;
    return statusRows.length === 1 ? statusRows[0] : null;
  }, [selectedUser, statusRows]);
  const selectedAttendanceRequired = selectedStatus?.status !== "not_applicable";
  const summaryCards = [
    { label: "Present", value: summary.present, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Incomplete", value: summary.incomplete || 0, tone: "bg-amber-50 text-amber-700" },
    { label: "Leave", value: summary.leave, tone: "bg-sky-50 text-sky-700" },
    { label: "Absent", value: summary.absent, tone: "bg-red-50 text-red-700" },
    { label: "Holiday", value: summary.holiday, tone: "bg-amber-50 text-amber-700" },
    { label: "Not required", value: summary.not_applicable || 0, tone: "bg-slate-100 text-slate-700" },
  ];
  const reportCards = [
    { label: "Attendance rate", value: `${report.summary.attendance_rate.toFixed(1)}%`, tone: "bg-[#eaf4ee] text-[#315f3d]" },
    { label: "Absenteeism", value: `${report.summary.absenteeism_rate.toFixed(1)}%`, tone: "bg-red-50 text-red-700" },
    { label: "Late rate", value: `${report.summary.late_rate.toFixed(1)}%`, tone: "bg-amber-50 text-amber-700" },
    { label: "Incomplete", value: report.summary.incomplete_days || 0, tone: "bg-orange-50 text-orange-700" },
    { label: "Avg worked", value: fmtMinutes(report.summary.average_worked_minutes), tone: "bg-sky-50 text-sky-700" },
    { label: "Pending requests", value: report.summary.pending_requests, tone: "bg-[#eef4f1] text-[#588368]" },
  ];

  const loadData = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ date });
      if (selectedUser) query.set("user_id", selectedUser);
      const reportQuery = new URLSearchParams({ start_date: reportStartDate, end_date: reportEndDate });
      if (selectedUser) reportQuery.set("user_id", selectedUser);
      const [employeeResult, attendanceData, statusData, summaryData, reportData, policyData, requestData, rosterData, locationData, deviceData, mappingData, workflowData, blockerData] = await Promise.allSettled([
        apiRequest<Employee[]>(`${basePath}/employees`),
        apiRequest<Attendance[]>(`${basePath}/attendances?${query.toString()}`),
        apiRequest<AttendanceStatusRow[]>(`${basePath}/attendances/status?${query.toString()}`),
        apiRequest<AttendanceStatusSummary>(`${basePath}/attendances/status/summary?date=${encodeURIComponent(date)}`),
        apiRequest<AttendanceReport>(`${basePath}/attendances/report?${reportQuery.toString()}`),
        apiRequest<AttendancePolicy[]>(`${basePath}/attendance-policies`),
        apiRequest<AttendanceRequest[]>(`${basePath}/attendance-requests${selectedUser ? `?user_id=${selectedUser}` : "?status=pending"}`),
        apiRequest<AttendanceRoster[]>(`${basePath}/attendance-rosters?start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}${selectedUser ? `&user_id=${selectedUser}` : ""}`),
        apiRequest<AttendanceSite[]>(`${basePath}/attendance-locations`),
        apiRequest<AttendanceDevice[]>(`${basePath}/attendance-devices`),
        apiRequest<EmployeeAttendanceDevice[]>(`${basePath}/employee-attendance-devices${selectedUser ? `?user_id=${selectedUser}` : ""}`),
        apiRequest<AttendanceExceptionWorkflow[]>(`${basePath}/attendance-exception-workflows`),
        apiRequest<AttendanceRequest[]>(`${basePath}/attendance-payroll-blockers?start_date=${reportStartDate}&end_date=${reportEndDate}`),
      ]);
      if (employeeResult.status === "fulfilled") {
        setEmployees(employeeResult.value);
      } else {
        setEmployees([]);
      }
      if (attendanceData.status === "fulfilled") {
        setItems(attendanceData.value);
      } else {
        throw attendanceData.reason;
      }
      if (statusData.status === "fulfilled") {
        setStatusRows(statusData.value);
      } else {
        setStatusRows([]);
      }
      if (summaryData.status === "fulfilled") {
        setSummary(summaryData.value);
      } else {
        setSummary(emptySummary);
      }
      setReport(reportData.status === "fulfilled" ? normalizeAttendanceReport(reportData.value) : emptyReport);
      setPolicies(policyData.status === "fulfilled" ? policyData.value : []);
      setRequests(requestData.status === "fulfilled" ? requestData.value : []);
      setRosters(rosterData.status === "fulfilled" ? rosterData.value : []);
      setAttendanceLocations(locationData.status === "fulfilled" ? locationData.value : []);
      setAttendanceDevices(deviceData.status === "fulfilled" ? deviceData.value : []);
      setEmployeeDeviceMappings(mappingData.status === "fulfilled" ? mappingData.value : []);
      setExceptionWorkflows(workflowData.status === "fulfilled" ? workflowData.value : []);
      setPayrollBlockers(blockerData.status === "fulfilled" ? blockerData.value : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, date, reportEndDate, reportStartDate, selectedUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function captureLocation(): Promise<AttendanceLocation> {
    setLocationMessage("");
    setLocationLoading(true);
    try {
      const captured = await requestAttendanceLocation();
      setLocation(captured);
      setLocationMessage("Location ready for the next punch.");
      return captured;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Location permission is required to mark attendance.";
      setLocationMessage(message);
      throw new Error(message);
    } finally {
      setLocationLoading(false);
    }
  }

  async function punch(action: "checkin" | "checkout") {
    setMessage("");
    setError("");
    if (!selectedAttendanceRequired) {
      setError("Attendance is not required for this employee designation.");
      return;
    }
    try {
      const punchLocation = location || await captureLocation();
      await apiRequest(`${basePath}/attendances/punch`, {
        method: "POST",
        body: {
          user_id: selectedUser || undefined,
          action,
          date,
          time: new Date().toISOString(),
          source,
          work_mode: workMode,
          latitude: punchLocation.latitude,
          longitude: punchLocation.longitude,
          device_id: deviceID || undefined,
          device_type: deviceType || undefined,
          remarks: remarks || undefined,
        },
      });
      setMessage(action === "checkin" ? "Check-in captured." : "Check-out captured.");
      setRemarks("");
      setLocation(null);
      setLocationMessage("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to punch attendance.");
    }
  }


  async function createPolicy() {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/attendance-policies`, { method: "POST", body: policyForm });
      setMessage("Attendance policy saved.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save attendance policy.");
    }
  }

  async function createRoster() {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/attendance-rosters`, { method: "POST", body: { ...rosterForm, user_id: selectedUser || undefined, date, policy_id: rosterForm.policy_id || undefined, break_minutes: 60 } });
      setMessage("Roster assigned.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign roster.");
    }
  }

  async function createAttendanceRequest() {
    setMessage("");
    setError("");
    try {
      const toISO = (value: string) => value ? new Date(`${date}T${value}:00`).toISOString() : undefined;
      await apiRequest(`${basePath}/attendance-requests`, { method: "POST", body: { ...requestForm, user_id: selectedUser || undefined, date, requested_checkin_at: toISO(requestForm.requested_checkin_at), requested_checkout_at: toISO(requestForm.requested_checkout_at), reason: requestForm.reason || undefined } });
      setMessage("Attendance request submitted.");
      setRequestForm((current) => ({ ...current, reason: "" }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit attendance request.");
    }
  }

  async function createAttendanceLocation() {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/attendance-locations`, {
        method: "POST",
        body: {
          ...locationForm,
          latitude: locationForm.latitude ? Number(locationForm.latitude) : undefined,
          longitude: locationForm.longitude ? Number(locationForm.longitude) : undefined,
          address: locationForm.address || undefined,
        },
      });
      setMessage("Attendance location saved.");
      setLocationForm({ code: "", name: "", location_type: "office", latitude: "", longitude: "", radius_meters: 100, address: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save attendance location.");
    }
  }

  async function createAttendanceDevice() {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/attendance-devices`, { method: "POST", body: { ...deviceForm, attendance_location_id: deviceForm.attendance_location_id || undefined, vendor: deviceForm.vendor || undefined, model: deviceForm.model || undefined, serial_number: deviceForm.serial_number || undefined } });
      setMessage("Attendance device saved.");
      setDeviceForm({ code: "", name: "", vendor: "", model: "", serial_number: "", attendance_location_id: "", integration_type: "edge_agent", direction_mode: "auto", timezone: "Asia/Kolkata", status: "active" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save attendance device.");
    }
  }

  async function createEmployeeAttendanceDevice() {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/employee-attendance-devices`, { method: "POST", body: { ...employeeDeviceForm, card_number: employeeDeviceForm.card_number || undefined } });
      setMessage("Employee device mapping saved.");
      setEmployeeDeviceForm({ user_id: "", device_id: "", device_user_id: "", credential_type: "biometric", card_number: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save employee device mapping.");
    }
  }

  function locationName(id?: string | null) {
    return attendanceLocations.find((item) => item.id === id)?.name || "-";
  }

  function deviceName(id?: string | null) {
    return attendanceDevices.find((item) => item.id === id)?.name || "-";
  }

  function prepareMissingCheckoutRequest() {
    const now = new Date();
    setRequestForm((current) => ({
      ...current,
      request_type: "missed_punch",
      requested_type: "checkout",
      requested_checkin_at: selectedStatus?.first_check_in ? new Date(selectedStatus.first_check_in).toTimeString().slice(0, 5) : current.requested_checkin_at,
      requested_checkout_at: now.toTimeString().slice(0, 5),
      requested_work_mode: workMode,
      reason: current.reason || "Forgot to check out. Please regularise the missing checkout.",
    }));
    setMessage("Missing checkout request is ready. Review the time and submit the attendance request.");
  }

  async function reviewRequest(id: string, status: "approved" | "rejected") {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/attendance-requests/${id}/review`, { method: "POST", body: { status, remarks: status === "approved" ? "Approved" : "Rejected" } });
      setMessage(`Attendance request ${status}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review attendance request.");
    }
  }

  function exportReportCSV() {
    const columns = ["Date", "Employee", "Department", "Branch", "Status", "Outcome", "First In", "Last Out", "Worked", "Late", "Early Exit", "Work Mode", "Policy", "Reason"];
    const rows = report.rows.map((row) => [
      fmtDate(row.date),
      employeeLabel(row),
      row.department_name || "",
      row.branch_name || "",
      titleCase(row.status),
      titleCase(row.rule_outcome),
      fmtTime(row.first_check_in),
      fmtTime(row.last_check_out),
      fmtMinutes(row.worked_minutes),
      fmtMinutes(row.late_minutes),
      fmtMinutes(row.early_exit_minutes),
      titleCase(row.work_mode),
      row.policy_name || "",
      row.reason,
    ]);
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${reportStartDate}-${reportEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAttendanceReport(format: "pdf" | "xlsx") {
    try {
      const params = new URLSearchParams({ format, start_date: reportStartDate, end_date: reportEndDate });
      const { blob, filename } = await apiDownload(`${basePath}/reports/code/attendance.exceptions/download?${params.toString()}`);
      saveBlobDownload(blob, filename);
      setMessage(`${format.toUpperCase()} report downloaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download attendance report.");
    }
  }

  async function createExceptionWorkflow() {
    try {
      await apiRequest(`${basePath}/attendance-exception-workflows`, { method: "POST", body: workflowForm });
      setWorkflowModal(false);
      setMessage("Attendance exception workflow saved.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save exception workflow.");
    }
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Attendance</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Employee Attendance</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Select a tenant to capture employee check-in and check-out events.</p>
          {tenantsError ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{tenantsError}</p> : null}
          <select className="mt-5 h-12 w-full rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={tenantsLoading} onChange={(event) => setSelectedTenantID(event.target.value)} value={selectedTenantID}>
            <option value="">Select tenant</option>
            {sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}
          </select>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Attendance</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Employee Attendance</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Capture timestamped punches and resolve daily status using leave approvals, holidays, weekoffs, explicit attendance, and joining dates.</p>
        </div>
        <button className="rounded-xl border border-[#dbe8e1] bg-white px-5 py-3 text-sm font-black text-[#588368]" onClick={loadData} type="button">Refresh</button>
      </div>

      {message ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => <article className={`rounded-2xl px-4 py-4 shadow-sm ${card.tone}`} key={card.label}><p className="text-xs font-black uppercase tracking-wide">{card.label}</p><strong className="mt-2 block text-3xl">{card.value}</strong></article>)}
      </div>

      <div className="mb-6 rounded-[2rem] border border-[#dfe6e2] bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Attendance report</p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">Attendance Overview</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">Review pending regularisation, department trends, work-mode split, late arrivals, absences, and employee-day details.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setReportStartDate(event.target.value)} type="date" value={reportStartDate} />
            <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setReportEndDate(event.target.value)} type="date" value={reportEndDate} />
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <button className="rounded-xl bg-[#111827] px-4 py-3 text-xs font-black text-white disabled:opacity-50" disabled={report.rows.length === 0} onClick={exportReportCSV} type="button">CSV</button>
              <button className="rounded-xl border border-[#588368] px-4 py-3 text-xs font-black text-[#588368] disabled:opacity-50" disabled={report.rows.length === 0} onClick={() => void downloadAttendanceReport("pdf")} type="button">PDF</button>
              <button className="rounded-xl border border-[#2f6f7d] px-4 py-3 text-xs font-black text-[#2f6f7d] disabled:opacity-50" disabled={report.rows.length === 0} onClick={() => void downloadAttendanceReport("xlsx")} type="button">Excel</button>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {reportCards.map((card) => <article className={`rounded-2xl px-4 py-4 ${card.tone}`} key={card.label}><p className="text-xs font-black uppercase tracking-wide">{card.label}</p><strong className="mt-2 block text-2xl">{card.value}</strong></article>)}
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-[#edf1ef] p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">Department rollup</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[#f8faf9] font-black uppercase text-[#6b7280]"><tr><th className="p-2">Department</th><th className="p-2">Rate</th><th className="p-2">Incomplete</th><th className="p-2">Absent</th><th className="p-2">Late</th><th className="p-2">Avg</th></tr></thead>
                <tbody>{report.departments.map((item) => <tr className="border-t border-[#edf1ef]" key={item.department_name}><td className="p-2 font-bold text-[#111827]">{item.department_name}</td><td className="p-2">{item.attendance_rate.toFixed(1)}%</td><td className="p-2">{item.incomplete_days || 0}</td><td className="p-2">{item.absent_days}</td><td className="p-2">{item.late_days}</td><td className="p-2">{fmtMinutes(item.average_worked_minutes)}</td></tr>)}</tbody>
              </table>
            </div>
            {report.departments.length === 0 ? <p className="mt-3 rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold text-[#6b7280]">No department data for this range.</p> : null}
          </div>
          <div className="rounded-2xl border border-[#edf1ef] p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">Daily trend</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[#f8faf9] font-black uppercase text-[#6b7280]"><tr><th className="p-2">Date</th><th className="p-2">Present</th><th className="p-2">Absent</th><th className="p-2">Late</th><th className="p-2">Avg</th></tr></thead>
                <tbody>{report.daily_trends.map((item) => <tr className="border-t border-[#edf1ef]" key={item.date}><td className="p-2 font-bold text-[#111827]">{fmtDate(item.date)}</td><td className="p-2">{item.present_days}</td><td className="p-2">{item.absent_days}</td><td className="p-2">{item.late_days}</td><td className="p-2">{fmtMinutes(item.average_worked_minutes)}</td></tr>)}</tbody>
              </table>
            </div>
            {report.daily_trends.length === 0 ? <p className="mt-3 rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold text-[#6b7280]">No daily trend data for this range.</p> : null}
          </div>
          <div className="rounded-2xl border border-[#edf1ef] p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">Work mode split</h3>
            <div className="mt-3 space-y-2">
              {report.work_modes.map((item) => <div className="rounded-xl bg-[#f8faf9] p-3" key={item.work_mode}><div className="flex justify-between text-xs font-black text-[#111827]"><span>{titleCase(item.work_mode)}</span><span>{item.share_percent.toFixed(1)}%</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{item.days} days · {fmtMinutes(item.worked_minutes)}</p></div>)}
            </div>
            {report.work_modes.length === 0 ? <p className="mt-3 rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold text-[#6b7280]">No work-mode data for this range.</p> : null}
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {[{ title: "Late arrivals", rows: report.late_employees }, { title: "Absence watch", rows: report.absence_employees }, { title: "Policy exceptions", rows: report.exception_employees }].map((group) => (
            <div className="rounded-2xl border border-[#edf1ef] p-4" key={group.title}>
              <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">{group.title}</h3>
              <div className="mt-3 space-y-2">{group.rows.map((row) => <div className="rounded-xl bg-[#f8faf9] p-3" key={`${group.title}-${row.user_id}-${row.date}`}><p className="text-sm font-black text-[#111827]">{employeeLabel(row)}</p><p className="mt-1 text-xs font-semibold text-[#6b7280]">{fmtDate(row.date)} · {titleCase(row.status)} · {titleCase(row.rule_outcome)} · Late {fmtMinutes(row.late_minutes)}</p></div>)}</div>
              {group.rows.length === 0 ? <p className="mt-3 rounded-xl bg-[#f8faf9] p-3 text-xs font-semibold text-[#6b7280]">No rows in this segment.</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]">
              <tr><th className="p-3">Date</th><th className="p-3">Employee</th><th className="p-3">Department</th><th className="p-3">Status</th><th className="p-3">Outcome</th><th className="p-3">First In</th><th className="p-3">Last Out</th><th className="p-3">Worked</th><th className="p-3">Late</th><th className="p-3">Early</th><th className="p-3">Work Mode</th><th className="p-3">Policy</th></tr>
            </thead>
            <tbody>{report.rows.map((row) => <tr className="border-t border-[#edf1ef]" key={`${row.user_id}-${row.date}`}><td className="p-3 font-bold text-[#111827]">{fmtDate(row.date)}</td><td className="p-3 font-bold text-[#111827]">{employeeLabel(row)}</td><td className="p-3 text-[#6b7280]">{row.department_name || "-"}</td><td className="p-3"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{titleCase(row.status)}</span></td><td className="p-3 text-[#6b7280]">{titleCase(row.rule_outcome)}</td><td className="p-3">{fmtTime(row.first_check_in)}</td><td className="p-3">{fmtTime(row.last_check_out)}</td><td className="p-3">{fmtMinutes(row.worked_minutes)}</td><td className="p-3">{fmtMinutes(row.late_minutes)}</td><td className="p-3">{fmtMinutes(row.early_exit_minutes)}</td><td className="p-3">{titleCase(row.work_mode)}</td><td className="p-3">{row.policy_name || "-"}</td></tr>)}</tbody>
          </table>
        </div>
        {report.rows.length === 0 ? <p className="mt-5 rounded-2xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">No attendance report rows found for this range.</p> : null}
      </div>

      <div className="grid gap-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#588368]">Today</p>
                <h2 className="mt-2 text-2xl font-black text-[#111827]">{selectedStatus ? titleCase(selectedStatus.status) : counts.open ? "Checked in" : "Not checked in"}</h2>
                <p className="mt-1 text-sm font-semibold text-[#6b7280]">{selectedStatus?.reason || `${counts.checkins} check-in · ${counts.checkouts} check-out`}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${counts.open ? "bg-emerald-50 text-emerald-700" : "bg-[#eef4f1] text-[#588368]"}`}>{counts.open ? "Active" : "Idle"}</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className="rounded-2xl bg-[#588368] px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9fb4a6]" disabled={loading || locationLoading || counts.open || !selectedAttendanceRequired} onClick={() => punch("checkin")} type="button">{locationLoading ? "Locating..." : "Check In"}</button>
              <button className="rounded-2xl border border-[#111827] bg-[#111827] px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:border-[#d1d5db] disabled:bg-[#d1d5db]" disabled={loading || locationLoading || !counts.open || !selectedAttendanceRequired} onClick={() => punch("checkout")} type="button">{locationLoading ? "Locating..." : "Check Out"}</button>
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl bg-[#f8faf9] p-4 text-xs font-semibold text-[#6b7280] sm:grid-cols-2">
              <span>Working hours: {selectedStatus?.working_hour ? `${selectedStatus.working_hour.start_time} - ${selectedStatus.working_hour.end_time}` : "-"}</span>
              <span>Worked: {selectedStatus ? fmtMinutes(selectedStatus.worked_minutes) : "-"}</span>
              <span>First in: {fmtTime(selectedStatus?.first_check_in)}</span>
              <span>Last out: {fmtTime(selectedStatus?.last_check_out)}</span>
            </div>
            {!selectedAttendanceRequired ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">Attendance is not required for this employee designation, so manual punch actions are disabled.</div> : null}
            {selectedStatus?.status === "incomplete" ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Check-out is missing for this day. Submit a missed-checkout request so it can be reviewed and regularised.</p><button className="mt-3 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white" onClick={prepareMissingCheckoutRequest} type="button">Prepare Request</button></div> : null}
            {selectedAttendanceRequired ? <p className="mt-4 text-xs font-semibold leading-5 text-[#6b7280]">Location is required for each punch and is saved only with the attendance record, not tracked continuously.</p> : null}
          </div>

          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Punch context</h2>
            <div className="mt-5 grid gap-4">
              <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setSelectedUser(event.target.value)} value={selectedUser}>
                <option value="">My attendance</option>
                {employees.map((item) => <option key={item.user_id} value={item.user_id}>{employeeLabel(item)}</option>)}
              </select>
              <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
              <div className="grid gap-3 md:grid-cols-2">
                <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setWorkMode(event.target.value)} value={workMode}>{workModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setSource(event.target.value)} value={source}>{sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setDeviceID(event.target.value)} placeholder="Device ID (optional)" value={deviceID} />
                <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setDeviceType(event.target.value)} placeholder="Device type (optional)" value={deviceType} />
              </div>
              <textarea className="min-h-24 rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks for this punch" value={remarks} />
              <button className="rounded-xl border border-[#dbe8e1] bg-[#f8faf9] px-5 py-3 text-sm font-black text-[#588368] disabled:opacity-60" disabled={locationLoading} onClick={() => void captureLocation().catch(() => undefined)} type="button">{locationLoading ? "Locating..." : location ? "Refresh current location" : "Use current location"}</button>
              <p className="text-xs font-semibold text-[#6b7280]">{location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : locationMessage || "Location will be requested when attendance is marked."}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Location & device setup</h2>
            <div className="mt-5 grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#edf1ef] p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">Attendance locations</h3>
                <div className="mt-4 grid gap-3">
                  <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setLocationForm((c) => ({ ...c, code: e.target.value }))} placeholder="Code" value={locationForm.code} />
                  <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setLocationForm((c) => ({ ...c, name: e.target.value }))} placeholder="Name" value={locationForm.name} />
                  <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setLocationForm((c) => ({ ...c, location_type: e.target.value }))} value={locationForm.location_type}>{locationTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setLocationForm((c) => ({ ...c, latitude: e.target.value }))} placeholder="Latitude" value={locationForm.latitude} />
                    <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setLocationForm((c) => ({ ...c, longitude: e.target.value }))} placeholder="Longitude" value={locationForm.longitude} />
                  </div>
                  <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setLocationForm((c) => ({ ...c, radius_meters: Number(e.target.value) }))} type="number" value={locationForm.radius_meters} />
                  <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-3 py-2 text-sm" onChange={(e) => setLocationForm((c) => ({ ...c, address: e.target.value }))} placeholder="Address" value={locationForm.address} />
                  <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:opacity-50" disabled={!locationForm.code || !locationForm.name} onClick={createAttendanceLocation} type="button">Save location</button>
                </div>
                <div className="mt-4 space-y-2">{attendanceLocations.slice(0, 5).map((item) => <p className="rounded-xl bg-[#f8faf9] px-3 py-2 text-xs font-bold text-[#6b7280]" key={item.id}>{item.name} · {titleCase(item.location_type)} · {item.radius_meters}m</p>)}</div>
              </div>

              <div className="rounded-2xl border border-[#edf1ef] p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">Biometric devices</h3>
                <div className="mt-4 grid gap-3">
                  <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, code: e.target.value }))} placeholder="Device code" value={deviceForm.code} />
                  <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, name: e.target.value }))} placeholder="Device name" value={deviceForm.name} />
                  <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, attendance_location_id: e.target.value }))} value={deviceForm.attendance_location_id}><option value="">Trusted location</option>{attendanceLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, vendor: e.target.value }))} placeholder="Vendor" value={deviceForm.vendor} />
                    <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, model: e.target.value }))} placeholder="Model" value={deviceForm.model} />
                  </div>
                  <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, serial_number: e.target.value }))} placeholder="Serial number" value={deviceForm.serial_number} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, integration_type: e.target.value }))} value={deviceForm.integration_type}>{integrationTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                    <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setDeviceForm((c) => ({ ...c, direction_mode: e.target.value }))} value={deviceForm.direction_mode}>{directionModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  </div>
                  <button className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white disabled:opacity-50" disabled={!deviceForm.code || !deviceForm.name} onClick={createAttendanceDevice} type="button">Save device</button>
                </div>
                <div className="mt-4 space-y-2">{attendanceDevices.slice(0, 5).map((item) => <p className="rounded-xl bg-[#f8faf9] px-3 py-2 text-xs font-bold text-[#6b7280]" key={item.id}>{item.name} · {titleCase(item.integration_type)} · {locationName(item.attendance_location_id)}</p>)}</div>
              </div>

              <div className="rounded-2xl border border-[#edf1ef] p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">Employee-device mappings</h3>
                <div className="mt-4 grid gap-3">
                  <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setEmployeeDeviceForm((c) => ({ ...c, user_id: e.target.value }))} value={employeeDeviceForm.user_id}><option value="">Employee</option>{employees.map((item) => <option key={item.user_id} value={item.user_id}>{employeeLabel(item)}</option>)}</select>
                  <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setEmployeeDeviceForm((c) => ({ ...c, device_id: e.target.value }))} value={employeeDeviceForm.device_id}><option value="">Device</option>{attendanceDevices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setEmployeeDeviceForm((c) => ({ ...c, device_user_id: e.target.value }))} placeholder="Device user ID" value={employeeDeviceForm.device_user_id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setEmployeeDeviceForm((c) => ({ ...c, credential_type: e.target.value }))} value={employeeDeviceForm.credential_type}>{credentialTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                    <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setEmployeeDeviceForm((c) => ({ ...c, card_number: e.target.value }))} placeholder="Card/PIN" value={employeeDeviceForm.card_number} />
                  </div>
                  <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:opacity-50" disabled={!employeeDeviceForm.user_id || !employeeDeviceForm.device_id || !employeeDeviceForm.device_user_id} onClick={createEmployeeAttendanceDevice} type="button">Save mapping</button>
                </div>
                <div className="mt-4 space-y-2">{employeeDeviceMappings.slice(0, 5).map((item) => <p className="rounded-xl bg-[#f8faf9] px-3 py-2 text-xs font-bold text-[#6b7280]" key={item.id}>{employeeLabel(employees.find((employee) => employee.user_id === item.user_id))} · {deviceName(item.device_id)} · {item.device_user_id}</p>)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Attendance policy</h2>
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2"><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setPolicyForm((c) => ({ ...c, name: e.target.value }))} placeholder="Policy name" value={policyForm.name} /><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setPolicyForm((c) => ({ ...c, code: e.target.value }))} placeholder="Code" value={policyForm.code} /></div>
              <div className="grid gap-3 md:grid-cols-2"><select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setPolicyForm((c) => ({ ...c, schedule_type: e.target.value }))} value={policyForm.schedule_type}><option value="fixed">Fixed time</option><option value="flexi">Flexi hours</option><option value="daily_roster">Daily roster</option><option value="weekly_roster">Weekly roster</option><option value="monthly_roster">Monthly roster</option></select><select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setPolicyForm((c) => ({ ...c, approval_mode: e.target.value }))} value={policyForm.approval_mode}><option value="manager">Manager approval</option><option value="hr">HR approval</option><option value="manager_hr">Manager + HR</option><option value="auto">Auto approve</option></select></div>
              <div className="grid gap-3 md:grid-cols-3"><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setPolicyForm((c) => ({ ...c, grace_late_minutes: Number(e.target.value) }))} type="number" value={policyForm.grace_late_minutes} /><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setPolicyForm((c) => ({ ...c, min_half_day_minutes: Number(e.target.value) }))} type="number" value={policyForm.min_half_day_minutes} /><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setPolicyForm((c) => ({ ...c, min_full_day_minutes: Number(e.target.value) }))} type="number" value={policyForm.min_full_day_minutes} /></div>
              <label className="flex items-center gap-2 text-sm font-bold text-[#6b7280]"><input checked={policyForm.allow_wfh} onChange={(e) => setPolicyForm((c) => ({ ...c, allow_wfh: e.target.checked }))} type="checkbox" /> Allow WFH/remote requests</label>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={createPolicy} type="button">Save policy</button>
            </div>
            <div className="mt-4 space-y-2">{policies.map((policy) => <p className="rounded-xl bg-[#f8faf9] px-3 py-2 text-xs font-bold text-[#6b7280]" key={policy.id}>{policy.name} · {titleCase(policy.schedule_type)} · Grace {policy.grace_late_minutes}m</p>)}</div>
          </div>

          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Roster & requests</h2>
            <div className="mt-5 grid gap-3">
              <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRosterForm((c) => ({ ...c, policy_id: e.target.value }))} value={rosterForm.policy_id}><option value="">Roster policy</option>{policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}</select>
              <div className="grid gap-3 md:grid-cols-2"><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRosterForm((c) => ({ ...c, start_time: e.target.value }))} type="time" value={rosterForm.start_time} /><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRosterForm((c) => ({ ...c, end_time: e.target.value }))} type="time" value={rosterForm.end_time} /></div>
              <button className="rounded-xl border border-[#dbe8e1] bg-[#f8faf9] px-5 py-3 text-sm font-black text-[#588368] disabled:opacity-50" disabled={!selectedUser} onClick={createRoster} type="button">Assign selected employee roster</button>
              <div className="grid gap-3 md:grid-cols-2"><select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, request_type: e.target.value, requested_type: e.target.value }))} value={requestForm.request_type}><option value="missed_punch">Missed punch</option><option value="late_exemption">Late exemption</option><option value="early_exit_exemption">Early exit exemption</option><option value="wfh">WFH</option><option value="halfday">Half day</option><option value="absent">Absent correction</option></select><select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, requested_work_mode: e.target.value }))} value={requestForm.requested_work_mode}>{workModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div className="grid gap-3 md:grid-cols-2"><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, requested_checkin_at: e.target.value }))} type="time" value={requestForm.requested_checkin_at} /><input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setRequestForm((c) => ({ ...c, requested_checkout_at: e.target.value }))} type="time" value={requestForm.requested_checkout_at} /></div>
              <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-3 py-2 text-sm" onChange={(e) => setRequestForm((c) => ({ ...c, reason: e.target.value }))} placeholder="Reason for exemption or correction" value={requestForm.reason} />
              <button className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white" onClick={createAttendanceRequest} type="button">Submit attendance request</button>
            </div>
            <p className="mt-4 text-xs font-bold text-[#6b7280]">Rosters today: {rosters.length}</p>
          </div>

          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-[#111827]">Exception workflows</h2>
              <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setWorkflowModal(true)} type="button">New workflow</button>
            </div>
            <div className="mt-4 space-y-2">{exceptionWorkflows.map((item) => <p className="rounded-xl bg-[#f8faf9] px-3 py-2 text-xs font-bold text-[#6b7280]" key={item.id}>{item.name} · {titleCase(item.request_type)} · {titleCase(item.route_mode)} · {item.block_payroll_when_pending ? "Blocks payroll" : "No payroll block"}</p>)}</div>
            {exceptionWorkflows.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8faf9] px-3 py-3 text-xs font-bold text-[#6b7280]">No exception workflows configured.</p> : null}
            <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-[#111827]">Payroll blockers</h3>
            <div className="mt-3 space-y-2">{payrollBlockers.map((item) => <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800" key={item.id}>{fmtDate(item.date)} · {titleCase(item.request_type)} · {item.reason || "Pending review"}</p>)}</div>
            {payrollBlockers.length === 0 ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700">No payroll-blocking attendance exceptions in the selected report range.</p> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#111827]">Punch timeline</h2>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">{fmtDate(date)} · {employeeLabel(employees.find((item) => item.user_id === selectedUser))}</p>
            </div>
            {loading ? <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">Loading</span> : null}
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]">
                <tr><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Work Mode</th><th className="p-3">Source</th><th className="p-3">Location</th><th className="p-3">Remarks</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t border-[#edf1ef]" key={item.id}>
                    <td className="p-3 font-black text-[#111827]">{fmtTime(item.time || item.created_at)}</td>
                    <td className="p-3"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{titleCase(item.type)}</span></td>
                    <td className="p-3 font-semibold text-[#374151]">{titleCase(item.work_mode)}</td>
                    <td className="p-3 text-[#6b7280]">{titleCase(item.source)}</td>
                    <td className="p-3 text-[#6b7280]">{item.latitude != null && item.longitude != null ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}` : "-"}</td>
                    <td className="p-3 text-[#6b7280]">{item.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 ? <p className="mt-5 rounded-2xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">No punches found for this date.</p> : null}
          </div>

          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Resolved daily status</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr><th className="p-3">Employee</th><th className="p-3">Status</th><th className="p-3">Reason</th><th className="p-3">First In</th><th className="p-3">Last Out</th><th className="p-3">Worked</th></tr></thead>
                <tbody>{statusRows.map((row) => <tr className="border-t border-[#edf1ef]" key={row.user_id}><td className="p-3 font-bold text-[#111827]">{employeeLabel(row)}</td><td className="p-3"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{titleCase(row.status)}</span></td><td className="p-3 text-[#6b7280]">{row.reason}</td><td className="p-3">{fmtTime(row.first_check_in)}</td><td className="p-3">{fmtTime(row.last_check_out)}</td><td className="p-3">{fmtMinutes(row.worked_minutes)}</td></tr>)}</tbody>
              </table>
            </div>
            {statusRows.length === 0 ? <p className="mt-5 rounded-2xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">No employees found for status resolution.</p> : null}
          </div>

          <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#111827]">Attendance requests</h2>
            <div className="mt-5 space-y-3">{requests.map((item) => <article className="rounded-2xl border border-[#edf1ef] p-4" key={item.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-[#111827]">{titleCase(item.request_type)} · {fmtDate(item.date)}</p><p className="mt-1 text-xs font-semibold text-[#6b7280]">{item.reason || "No reason"} · {titleCase(item.status)}</p></div>{item.status === "pending" ? <div className="flex gap-2"><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700" onClick={() => reviewRequest(item.id, "approved")} type="button">Approve</button><button className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700" onClick={() => reviewRequest(item.id, "rejected")} type="button">Reject</button></div> : null}</div></article>)}</div>
            {requests.length === 0 ? <p className="mt-5 rounded-2xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">No attendance requests found.</p> : null}
          </div>
        </div>
      </div>
      <HrmsModal onClose={() => setWorkflowModal(false)} open={workflowModal} title="Attendance Exception Workflow">
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setWorkflowForm((c) => ({ ...c, code: e.target.value }))} placeholder="Code" value={workflowForm.code} />
            <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setWorkflowForm((c) => ({ ...c, name: e.target.value }))} placeholder="Name" value={workflowForm.name} />
          </div>
          <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-3 py-2 text-sm" onChange={(e) => setWorkflowForm((c) => ({ ...c, description: e.target.value }))} placeholder="Description" value={workflowForm.description} />
          <div className="grid gap-3 md:grid-cols-2">
            <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setWorkflowForm((c) => ({ ...c, request_type: e.target.value }))} value={workflowForm.request_type}><option value="missed_punch">Missed punch</option><option value="regularization">Regularization</option><option value="late_exemption">Late exemption</option><option value="early_exit_exemption">Early exit exemption</option><option value="wfh">WFH</option><option value="remote_work">Remote work</option><option value="halfday">Half day</option><option value="absent">Absent correction</option><option value="overtime">Overtime</option></select>
            <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setWorkflowForm((c) => ({ ...c, route_mode: e.target.value }))} value={workflowForm.route_mode}><option value="manager">Manager</option><option value="hr">HR</option><option value="manager_hr">Manager + HR</option><option value="auto">Auto</option></select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setWorkflowForm((c) => ({ ...c, max_requests_per_month: Number(e.target.value) }))} type="number" value={workflowForm.max_requests_per_month} />
            <input className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setWorkflowForm((c) => ({ ...c, escalation_hours: Number(e.target.value) }))} type="number" value={workflowForm.escalation_hours} />
            <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold" onChange={(e) => setWorkflowForm((c) => ({ ...c, escalation_route_mode: e.target.value }))} value={workflowForm.escalation_route_mode}><option value="">No escalation</option><option value="manager">Manager</option><option value="hr">HR</option><option value="manager_hr">Manager + HR</option></select>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={workflowForm.block_payroll_when_pending} onChange={(e) => setWorkflowForm((c) => ({ ...c, block_payroll_when_pending: e.target.checked }))} type="checkbox" /> Block payroll while pending</label>
          <label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={workflowForm.auto_approve} onChange={(e) => setWorkflowForm((c) => ({ ...c, auto_approve: e.target.checked }))} type="checkbox" /> Auto approve</label>
          <div className="flex justify-end gap-2">
            <button className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setWorkflowModal(false)} type="button">Cancel</button>
            <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => void createExceptionWorkflow()} type="button">Save</button>
          </div>
        </div>
      </HrmsModal>
    </section>
  );
}
