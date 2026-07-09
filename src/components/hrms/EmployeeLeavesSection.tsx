"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, RefreshCw } from "lucide-react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Employee = { user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null; probation_status?: string; probation_end_date?: string | null; is_payroll_staff?: boolean };
type LeaveType = { id: string; name: string; shortcode?: string | null; is_enabled?: boolean };
type FinancialYear = { id: string; name: string; is_active: boolean };
type LeaveBalance = { id?: string; leave_type_id: string; leave_type_name?: string; total_days: number; used_days: number; pending_days: number; balance_days: number };
type Leave = { id: string; user_id: string; leave_type_id: string; fy_id: string; start_date: string; end_date: string; start_day_type: DayType; end_day_type: DayType; days: number; reason?: string | null; status: string; is_sandwich: boolean; applied_date: string };
type EmployeeDashboard = { leave?: { balances: Array<LeaveBalance & { leave_type_name: string }>; recent_requests: Leave[] } | null };
type LeavePreview = { allowed: boolean; total_days: number; base_days: number; sandwich_days: number; is_sandwich: boolean; balance_before: number; balance_after: number; pending_after: number; paid_leave: boolean; blocking_reasons?: string[]; warnings?: string[]; requires_attachment: boolean; notice_required: boolean; notice_days: number; payroll_impact?: string; effective_policy?: { name: string; code: string } | null };
type LeaveMessage = { id: string; sender_user_id: string; message_type: string; body: string; created_at: string };
type DayType = "fullday" | "firsthalf" | "secondhalf";
type DurationMode = "full" | "half";

function employeeLabel(item?: Employee) {
  if (!item) return "-";
  return `${item.firstname} ${item.lastname || ""}`.trim() || item.employee_code || item.user_id;
}

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDays(value = 0) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

function parseLocalDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function estimateLeaveDays(startDate: string, endDate: string, startDayType: DayType, endDayType: DayType) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end || end < start) return null;
  if (start.getTime() === end.getTime()) {
    if (startDayType === "fullday" || endDayType === "fullday") return 1;
    return startDayType === endDayType ? 0.5 : 1;
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const startUnits = startDayType === "fullday" ? 1 : 0.5;
  const endUnits = endDayType === "fullday" ? 1 : 0.5;
  return Math.max(0.5, days - 2 + startUnits + endUnits);
}

function LeavePreviewPanel({ preview }: { preview: LeavePreview | null }) {
  if (!preview) return null;
  const blockingReasons = preview.blocking_reasons || [];
  const warnings = preview.warnings || [];
  const hasWarnings = warnings.length > 0 || blockingReasons.length > 0;
  const tone = !preview.allowed ? "red" : hasWarnings ? "amber" : "emerald";
  return (
    <div className={`rounded-xl border p-4 ${tone === "red" ? "border-red-100 bg-red-50" : tone === "amber" ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-black ${tone === "red" ? "text-red-800" : tone === "amber" ? "text-amber-800" : "text-emerald-800"}`}>{preview.allowed ? (hasWarnings ? "Review warning before submitting" : "No issues found") : "Cannot submit yet"}</p>
        <span className={`shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black ${tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-emerald-700"}`}>{formatDays(preview.total_days)} days</span>
      </div>
      <dl className="mt-3 divide-y divide-white/70 text-sm">
        <PreviewRow label="Base days" value={formatDays(preview.base_days)} />
        <PreviewRow label="Sandwich days" value={formatDays(preview.sandwich_days)} />
        <PreviewRow label="Balance after request" value={formatDays(preview.balance_after)} />
        <PreviewRow label="Pending after request" value={formatDays(preview.pending_after)} />
        <PreviewRow label="Leave pay type" value={preview.paid_leave ? "Paid" : "Unpaid"} />
        {preview.requires_attachment ? <PreviewRow label="Attachment" value="Required" /> : null}
        {preview.notice_required ? <PreviewRow label="Notice" value={`${preview.notice_days} day${preview.notice_days === 1 ? "" : "s"}`} /> : null}
        {preview.payroll_impact ? <PreviewRow label="Payroll impact" value={preview.payroll_impact} /> : null}
        {preview.effective_policy?.name ? <PreviewRow label="Policy" value={preview.effective_policy.name} /> : null}
      </dl>
      {blockingReasons.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm font-bold leading-6 text-red-800">
          {blockingReasons.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm font-bold leading-6 text-amber-800">
          {warnings.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {preview.allowed && hasWarnings ? <p className="mt-3 text-sm font-semibold leading-6 text-amber-800">You can still submit this request. Your manager will decide during approval.</p> : null}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-[#647067] sm:shrink-0">{label}</dt>
      <dd className="min-w-0 break-words font-black text-[#17231a] sm:max-w-[58%] sm:text-right">{value}</dd>
    </div>
  );
}

export function EmployeeLeavesSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedFY, setSelectedFY] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [durationMode, setDurationMode] = useState<DurationMode>("full");
  const [form, setForm] = useState({ leave_type_id: "", start_date: "", end_date: "", start_day_type: "fullday" as DayType, end_day_type: "fullday" as DayType, reason: "" });
  const [preview, setPreview] = useState<{ key: string; result: LeavePreview } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState<Record<string, string>>({});
  const [messageLeave, setMessageLeave] = useState<Leave | null>(null);
  const [leaveMessages, setLeaveMessages] = useState<LeaveMessage[]>([]);
  const [leaveMessageBody, setLeaveMessageBody] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const typeByID = useMemo(() => new Map(leaveTypes.map((item) => [item.id, item])), [leaveTypes]);
  const balanceByTypeID = useMemo(() => new Map(balances.map((item) => [item.leave_type_id, item])), [balances]);
  const selectedBalance = form.leave_type_id ? balanceByTypeID.get(form.leave_type_id) : undefined;
  const previewKey = useMemo(() => [selectedTenantID, selectedUser, selectedFY, form.leave_type_id, form.start_date, form.end_date, form.start_day_type, form.end_day_type, isSuperAdmin ? "admin" : "self"].join("|"), [form.end_date, form.end_day_type, form.leave_type_id, form.start_date, form.start_day_type, isSuperAdmin, selectedFY, selectedTenantID, selectedUser]);
  const currentPreview = preview?.key === previewKey ? preview.result : null;
  const estimatedDays = useMemo(() => estimateLeaveDays(form.start_date, form.end_date, form.start_day_type, form.end_day_type), [form.end_date, form.end_day_type, form.start_date, form.start_day_type]);
  const enabledLeaveTypes = useMemo(() => leaveTypes.filter((item) => item.is_enabled !== false), [leaveTypes]);
  const leaveOptions = useMemo(() => {
    if (isSuperAdmin) return enabledLeaveTypes;
    const configuredBalances = balances.filter((item) => item.total_days > 0 || item.balance_days > 0 || item.used_days > 0 || item.pending_days > 0);
    if (configuredBalances.length > 0) {
      return configuredBalances
        .map((item) => {
          const type = typeByID.get(item.leave_type_id);
          return { id: item.leave_type_id, name: item.leave_type_name || type?.name || "Leave", shortcode: type?.shortcode, is_enabled: type?.is_enabled !== false };
        })
        .filter((item, index, list) => item.is_enabled !== false && list.findIndex((other) => other.id === item.id) === index);
    }
    return enabledLeaveTypes;
  }, [balances, enabledLeaveTypes, isSuperAdmin, typeByID]);
  const visibleBalances = useMemo(() => {
    const configured = balances.filter((item) => isSuperAdmin || item.total_days > 0 || item.balance_days > 0 || item.used_days > 0 || item.pending_days > 0);
    return configured.length > 0 ? configured : balances;
  }, [balances, isSuperAdmin]);

  const leaveTypeName = useCallback((leaveTypeID: string) => balanceByTypeID.get(leaveTypeID)?.leave_type_name || typeByID.get(leaveTypeID)?.name || leaveTypeID.slice(0, 8), [balanceByTypeID, typeByID]);

  const loadSelfServiceData = useCallback(async () => {
    const [dashboardData, leaveData, leaveTypeData] = await Promise.all([
      apiRequest<EmployeeDashboard>("/hrms/dashboard/employee"),
      apiRequest<Leave[]>("/hrms/leaves"),
      apiRequest<LeaveType[]>("/hrms/leave-types"),
    ]);
    const dashboardBalances = dashboardData.leave?.balances || [];
    const configuredBalances = dashboardBalances.filter((item) => item.total_days > 0 || item.balance_days > 0 || item.used_days > 0 || item.pending_days > 0);
    const enabledTypes = leaveTypeData.filter((item) => item.is_enabled !== false);
    const firstTypeID = configuredBalances.find((item) => item.balance_days > 0)?.leave_type_id || configuredBalances[0]?.leave_type_id || enabledTypes[0]?.id || "";
    setBalances(dashboardBalances);
    setLeaves(leaveData);
    setLeaveTypes(leaveTypeData);
    setForm((current) => ({ ...current, leave_type_id: current.leave_type_id || dashboardBalances.find((item) => item.balance_days > 0)?.leave_type_id || firstTypeID }));
  }, []);

  const loadAdminData = useCallback(async () => {
    const [employeeData, leaveTypeData, fyData] = await Promise.all([
      apiRequest<Employee[]>(`${basePath}/employees`),
      apiRequest<LeaveType[]>(`${basePath}/leave-types`),
      apiRequest<FinancialYear[]>(`${basePath}/financial-years`),
    ]);
    const nextUser = selectedUser || employeeData[0]?.user_id || "";
    const nextFY = selectedFY || fyData.find((item) => item.is_active)?.id || fyData[0]?.id || "";
    setEmployees(employeeData);
    setLeaveTypes(leaveTypeData);
    setFinancialYears(fyData);
    setSelectedUser(nextUser);
    setSelectedFY(nextFY);
    setForm((current) => ({ ...current, leave_type_id: current.leave_type_id || leaveTypeData.find((item) => item.is_enabled !== false)?.id || "" }));
  }, [basePath, selectedFY, selectedUser]);

  const loadBase = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      if (isSuperAdmin) {
        await loadAdminData();
      } else {
        await loadSelfServiceData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave request data.");
    } finally {
      setLoading(false);
    }
  }, [canLoad, isSuperAdmin, loadAdminData, loadSelfServiceData]);

  const loadEmployeeLeaveData = useCallback(async () => {
    if (!canLoad) return;
    try {
      if (!isSuperAdmin) {
        await loadSelfServiceData();
        return;
      }
      if (!selectedUser) return;
      const [balanceData, leaveData] = await Promise.all([
        apiRequest<LeaveBalance[]>(`${basePath}/leave-balances?user_id=${selectedUser}`),
        apiRequest<Leave[]>(`${basePath}/leaves?user_id=${selectedUser}`),
      ]);
      setBalances(balanceData);
      setLeaves(leaveData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load employee leave data.");
    }
  }, [basePath, canLoad, isSuperAdmin, loadSelfServiceData, selectedUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBase();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBase]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const timer = window.setTimeout(() => {
      void loadEmployeeLeaveData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isSuperAdmin, loadEmployeeLeaveData]);

  function setDuration(nextMode: DurationMode) {
    setDurationMode(nextMode);
    setForm((current) => {
      if (nextMode === "full") return { ...current, start_day_type: "fullday", end_day_type: "fullday" };
      return { ...current, end_date: current.start_date || current.end_date, start_day_type: current.start_day_type === "secondhalf" ? "secondhalf" : "firsthalf", end_day_type: current.start_day_type === "secondhalf" ? "secondhalf" : "firsthalf" };
    });
  }

  function setStartDate(value: string) {
    setForm((current) => {
      const nextEndDate = durationMode === "half" || !current.end_date || current.end_date < value ? value : current.end_date;
      return { ...current, start_date: value, end_date: nextEndDate };
    });
  }

  function openApplyWizard() {
    setApplyOpen(true);
    setMessage("");
    setError("");
  }

  function closeApplyWizard() {
    setApplyOpen(false);
  }

  async function submitLeave(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (currentPreview && !currentPreview.allowed) {
      setError("Preview the leave request and resolve any blocking items before submitting.");
      return;
    }
    try {
      await apiRequest(`${basePath}/leaves`, {
        method: "POST",
        body: {
          ...form,
          user_id: isSuperAdmin ? selectedUser || undefined : undefined,
          fy_id: isSuperAdmin ? selectedFY || undefined : undefined,
          reason: form.reason || undefined,
        },
      });
      setMessage("Leave request submitted.");
      setForm((current) => ({ ...current, reason: "" }));
      setApplyOpen(false);
      setPreview(null);
      if (isSuperAdmin) {
        await loadEmployeeLeaveData();
      } else {
        await loadSelfServiceData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply leave.");
    }
  }

  const previewLeave = useCallback(async () => {
    setMessage("");
    setError("");
    setPreviewLoading(true);
    try {
      const result = await apiRequest<LeavePreview>(`${basePath}/leaves/preview`, {
        method: "POST",
        body: {
          ...form,
          user_id: isSuperAdmin ? selectedUser || undefined : undefined,
          fy_id: isSuperAdmin ? selectedFY || undefined : undefined,
          reason: form.reason || undefined,
        },
      });
      setPreview({ key: previewKey, result });
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Unable to preview leave.");
    } finally {
      setPreviewLoading(false);
    }
  }, [basePath, form, isSuperAdmin, previewKey, selectedFY, selectedUser]);

  async function cancelLeave(item: Leave) {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leaves/${item.id}/cancel`, {
        method: "POST",
        body: { user_id: isSuperAdmin ? item.user_id : undefined, remarks: cancelRemarks[item.id] || "Canceled by applicant" },
      });
      setMessage("Leave request canceled.");
      if (isSuperAdmin) {
        await loadEmployeeLeaveData();
      } else {
        await loadSelfServiceData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel leave.");
    }
  }

  async function openLeaveMessages(item: Leave) {
    setMessageLeave(item);
    setLeaveMessageBody("");
    setMessage("");
    setError("");
    setMessagesLoading(true);
    try {
      setLeaveMessages(await apiRequest<LeaveMessage[]>(`${basePath}/leaves/${item.id}/messages`));
    } catch (err) {
      setLeaveMessages([]);
      setError(err instanceof Error ? err.message : "Unable to load leave messages.");
    } finally {
      setMessagesLoading(false);
    }
  }

  async function sendLeaveMessage(event: FormEvent) {
    event.preventDefault();
    if (!messageLeave || !leaveMessageBody.trim()) return;
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leaves/${messageLeave.id}/messages`, {
        method: "POST",
        body: { message_type: "employee_reply", body: leaveMessageBody.trim() },
      });
      setLeaveMessageBody("");
      setLeaveMessages(await apiRequest<LeaveMessage[]>(`${basePath}/leaves/${messageLeave.id}/messages`));
      setMessage("Reply sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reply.");
    }
  }

  const formReady = !loading && Boolean(form.leave_type_id && form.start_date && form.end_date) && (!isSuperAdmin || Boolean(selectedUser && selectedFY));
  const submitDisabled = !formReady || previewLoading || currentPreview?.allowed === false;

  useEffect(() => {
    if (!applyOpen || !formReady || previewLoading || preview?.key === previewKey) return;
    const timer = window.setTimeout(() => {
      void previewLeave();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [applyOpen, formReady, preview?.key, previewKey, previewLeave, previewLoading]);

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="rounded-2xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Requests</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111827]">Apply Leave</h1>
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
    <section className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_left,rgba(88,131,104,0.12),transparent_34%),linear-gradient(180deg,#ffffff,#f8faf7)] px-4 py-5 text-[#101915] lg:px-6">
      <div className="mx-auto max-w-[1560px]">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111711] sm:text-3xl">Leave</h1>
            <p className="mt-1 text-sm font-medium text-[#647067]">Balances, requests, and approval status</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9e3dc] bg-white px-4 py-3 text-sm font-extrabold text-[#17231a] shadow-[0_10px_28px_rgba(24,37,27,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(24,37,27,0.12)]" onClick={() => { void loadBase(); }} type="button">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e87839] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(232,120,57,0.22)] transition hover:-translate-y-0.5 hover:bg-[#d96425]" onClick={openApplyWizard} type="button">
              <CalendarCheck className="h-4 w-4" />
              Apply Leave
            </button>
          </div>
        </div>

        {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <section className="rounded-2xl border border-[#dfe7df] bg-white/95 p-4 shadow-[0_18px_50px_rgba(31,41,55,0.08)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-[#121a14]">Leave Balance</h2>
              <p className="mt-1 text-xs font-semibold text-[#647067]">{visibleBalances.length} configured leave type{visibleBalances.length === 1 ? "" : "s"}</p>
            </div>
            {selectedBalance ? <span className="rounded-full bg-[#e9f7ee] px-3 py-1 text-xs font-black text-[#237344]">{formatDays(selectedBalance.balance_days)} available</span> : null}
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#edf2ee]">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-[#f8fbf8] text-xs font-black uppercase tracking-wide text-[#647067]">
                <tr>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3 text-right">Used</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ee]">
                {visibleBalances.map((item) => (
                  <tr className={form.leave_type_id === item.leave_type_id ? "bg-[#eef4f1]" : "bg-white"} key={item.id || item.leave_type_id}>
                    <td className="px-4 py-3 text-sm font-black text-[#121a14]">{item.leave_type_name || leaveTypeName(item.leave_type_id)}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-[#237344]">{formatDays(item.balance_days)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-[#647067]">{formatDays(item.used_days)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-[#647067]">{formatDays(item.pending_days)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-[#647067]">{formatDays(item.total_days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="divide-y divide-[#edf2ee] md:hidden">
              {visibleBalances.map((item) => (
                <div className={form.leave_type_id === item.leave_type_id ? "bg-[#eef4f1] p-4" : "bg-white p-4"} key={item.id || item.leave_type_id}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 text-sm font-black leading-5 text-[#121a14]">{item.leave_type_name || leaveTypeName(item.leave_type_id)}</p>
                    <p className="shrink-0 text-sm font-black text-[#237344]">{formatDays(item.balance_days)}</p>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div><dt className="text-[#647067]">Used</dt><dd className="mt-1 font-black text-[#17231a]">{formatDays(item.used_days)}</dd></div>
                    <div><dt className="text-[#647067]">Pending</dt><dd className="mt-1 font-black text-[#17231a]">{formatDays(item.pending_days)}</dd></div>
                    <div><dt className="text-[#647067]">Total</dt><dd className="mt-1 font-black text-[#17231a]">{formatDays(item.total_days)}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
          {visibleBalances.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8fbf8] px-4 py-3 text-sm font-semibold text-[#647067]">No leave balance is available yet.</p> : null}
        </section>

        <section className="mt-4 rounded-2xl border border-[#dfe7df] bg-white/95 p-4 shadow-[0_18px_50px_rgba(31,41,55,0.08)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-[#121a14]">Recent Requests</h2>
              <p className="mt-1 text-xs font-semibold text-[#647067]">Track status and cancel pending requests</p>
            </div>
            <span className="rounded-full bg-[#f8fbf8] px-3 py-1 text-xs font-black text-[#647067]">{leaves.length} request{leaves.length === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {leaves.map((item) => (
              <article className="rounded-xl border border-[#edf1ef] bg-[#fbfdfb] p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-5 text-[#121a14]">{leaveTypeName(item.leave_type_id)}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#647067]">{formatDate(item.start_date)} - {formatDate(item.end_date)} · {formatDays(item.days)} day{item.days === 1 ? "" : "s"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#e9f7ee] px-3 py-1 text-xs font-black capitalize text-[#237344]">{item.status}</span>
                </div>
                {item.reason ? <p className="mt-3 text-sm text-[#647067]">{item.reason}</p> : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  {item.status === "pending" ? (
                    <>
                      <input className="h-10 rounded-lg border border-[#dbe8e1] px-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setCancelRemarks((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="Cancel reason" value={cancelRemarks[item.id] || ""} />
                      <button className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700" onClick={() => void cancelLeave(item)} type="button">Cancel</button>
                    </>
                  ) : <span />}
                  <button className="rounded-lg border border-[#dbe8e1] bg-white px-4 py-2 text-xs font-black text-[#588368]" onClick={() => void openLeaveMessages(item)} type="button">Messages</button>
                </div>
              </article>
            ))}
          </div>
          {leaves.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8fbf8] px-4 py-6 text-center text-sm font-semibold text-[#647067]">No leave requests found.</p> : null}
        </section>
      </div>

      <HrmsModal description="Choose a leave type, day duration, and dates. Setika checks warnings before you submit." onClose={closeApplyWizard} open={applyOpen} title="Apply Leave">
        <form className="grid gap-5" onSubmit={submitLeave}>
          {isSuperAdmin ? (
            <div className="grid gap-3 md:grid-cols-2">
              <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={loading} onChange={(e) => setSelectedUser(e.target.value)} value={selectedUser}>
                <option value="">Select employee</option>
                {employees.map((item) => <option key={item.user_id} value={item.user_id}>{employeeLabel(item)}</option>)}
              </select>
              <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setSelectedFY(e.target.value)} value={selectedFY}>
                <option value="">Financial year</option>
                {financialYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-black text-[#374151]">
            Leave type
            <select className="h-12 rounded-xl border border-[#dbe8e1] bg-white px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, leave_type_id: event.target.value }))} required value={form.leave_type_id}>
              <option value="">Select leave type</option>
              {leaveOptions.map((item) => {
                const balance = balanceByTypeID.get(item.id);
                const label = `${item.name}${balance ? ` - ${formatDays(balance.balance_days)} available` : ""}`;
                return <option key={item.id} value={item.id}>{label}</option>;
              })}
            </select>
          </label>

          <div className="grid gap-2">
            <p className="text-sm font-black text-[#374151]">Day duration</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["full", "Full day"],
                ["half", "Half day"],
              ].map(([mode, label]) => <button className={`h-11 rounded-xl border px-3 text-sm font-black ${durationMode === mode ? "border-[#588368] bg-[#588368] text-white" : "border-[#dbe8e1] bg-white text-[#374151]"}`} key={mode} onClick={() => setDuration(mode as DurationMode)} type="button">{label}</button>)}
            </div>
          </div>

          {durationMode === "full" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-[#374151]">
              From
              <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStartDate(e.target.value)} required type="date" value={form.start_date} />
            </label>
            <label className="grid gap-2 text-sm font-black text-[#374151]">
              To
              <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" min={form.start_date || undefined} onChange={(e) => setForm((current) => ({ ...current, end_date: e.target.value }))} required type="date" value={form.end_date} />
            </label>
          </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#374151]">
                Date
                <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStartDate(e.target.value)} required type="date" value={form.start_date} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#374151]">
                Half
                <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setForm((current) => ({ ...current, end_date: current.start_date || current.end_date, start_day_type: e.target.value as DayType, end_day_type: e.target.value as DayType }))} value={form.start_day_type === "secondhalf" ? "secondhalf" : "firsthalf"}>
                  <option value="firsthalf">First half</option>
                  <option value="secondhalf">Second half</option>
                </select>
              </label>
            </div>
          )}

          <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Reason, optional" value={form.reason} />

          <div className="grid gap-3">
            {previewLoading ? <p className="rounded-xl bg-[#f8fbf8] px-4 py-3 text-sm font-semibold text-[#647067]">Checking leave warnings...</p> : null}
            <LeavePreviewPanel preview={currentPreview} />
            {!currentPreview && !previewLoading ? (
              <dl className="divide-y divide-[#edf2ee] rounded-xl bg-[#f8fbf8] px-4 py-2 text-sm">
                <PreviewRow label="Estimated days" value={`${estimatedDays ? formatDays(estimatedDays) : "-"} day${estimatedDays === 1 ? "" : "s"}`} />
                <PreviewRow label="Available balance" value={selectedBalance ? formatDays(selectedBalance.balance_days) : "-"} />
                <PreviewRow label="Warnings" value="Appear after dates" />
              </dl>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#edf1ef] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button className="rounded-xl border border-[#dbe8e1] bg-white px-4 py-3 text-sm font-black text-[#374151]" onClick={closeApplyWizard} type="button">Cancel</button>
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9ca3af]" disabled={submitDisabled} type="submit">Submit leave request</button>
          </div>
        </form>
      </HrmsModal>

      <HrmsModal description="Messages stay attached to this leave request." onClose={() => setMessageLeave(null)} open={Boolean(messageLeave)} title="Leave Messages">
        <div className="grid gap-4">
          {messageLeave ? (
            <section className="rounded-xl border border-[#e5ece7] bg-[#f8fbf8] p-4">
              <p className="text-sm font-black text-[#121a14]">{leaveTypeName(messageLeave.leave_type_id)}</p>
              <p className="mt-1 text-xs font-bold text-[#647067]">{formatDate(messageLeave.start_date)} - {formatDate(messageLeave.end_date)} · {formatDays(messageLeave.days)} day{messageLeave.days === 1 ? "" : "s"}</p>
            </section>
          ) : null}
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {messagesLoading ? <p className="rounded-xl bg-[#f8fbf8] px-4 py-5 text-center text-sm font-semibold text-[#647067]">Loading messages...</p> : null}
            {leaveMessages.map((item) => (
              <div className="rounded-xl bg-[#f8fbf8] p-3" key={item.id}>
                <p className="text-xs font-black uppercase tracking-wide text-[#588368]">{item.message_type === "employee_reply" ? "Employee" : "Manager"} · {formatDate(item.created_at)}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#17231a]">{item.body}</p>
              </div>
            ))}
            {!messagesLoading && leaveMessages.length === 0 ? <p className="rounded-xl bg-[#f8fbf8] px-4 py-5 text-center text-sm font-semibold text-[#647067]">No messages yet.</p> : null}
          </div>
          <form className="grid gap-3 border-t border-[#edf1ef] pt-4" onSubmit={sendLeaveMessage}>
            <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setLeaveMessageBody(event.target.value)} placeholder="Reply to your manager" value={leaveMessageBody} />
            <div className="flex justify-between gap-3">
              <button className="rounded-xl border border-[#dbe8e1] bg-white px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setMessageLeave(null)} type="button">Close</button>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#9ca3af]" disabled={!leaveMessageBody.trim()} type="submit">Send Reply</button>
            </div>
          </form>
        </div>
      </HrmsModal>
    </section>
  );
}
