"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";

type Employee = { user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null };
type LeaveType = { id: string; name: string; shortcode?: string | null };
type FinancialYear = { id: string; name: string; is_active: boolean };
type Department = { id: string; name: string };
type LeaveReportRow = {
  id: string;
  user_id: string;
  employee_code?: string | null;
  firstname: string;
  lastname?: string | null;
  reporting_manager_id?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  designation_name?: string | null;
  leave_type_id: string;
  leave_type_name?: string | null;
  leave_type_shortcode?: string | null;
  fy_id: string;
  financial_year_name?: string | null;
  start_date: string;
  end_date: string;
  start_day_type: string;
  end_day_type: string;
  days: number;
  reason?: string | null;
  status: string;
  is_sandwich: boolean;
  applied_date: string;
};
type LeaveReportSummary = {
  total_requests: number;
  total_days: number;
  employee_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  canceled_count: number;
  pending_days: number;
  approved_days: number;
  rejected_days: number;
  canceled_days: number;
};

type Filters = {
  scope: "all" | "manager" | "selected_manager";
  managerID: string;
  fyID: string;
  userID: string;
  departmentID: string;
  leaveTypeID: string;
  status: string;
  startDate: string;
  endDate: string;
};

const emptySummary: LeaveReportSummary = { total_requests: 0, total_days: 0, employee_count: 0, pending_count: 0, approved_count: 0, rejected_count: 0, canceled_count: 0, pending_days: 0, approved_days: 0, rejected_days: 0, canceled_days: 0 };
const statusOptions = ["pending", "approved", "rejected", "canceled"];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeLabel(item?: Employee) {
  if (!item) return "-";
  return `${item.firstname} ${item.lastname || ""}`.trim() || item.employee_code || item.user_id;
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function csvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function LeaveReportsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rows, setRows] = useState<LeaveReportRow[]>([]);
  const [summary, setSummary] = useState<LeaveReportSummary>(emptySummary);
  const [filters, setFilters] = useState<Filters>({ scope: "all", managerID: "", fyID: "", userID: "", departmentID: "", leaveTypeID: "", status: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLookups = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const [employeeData, leaveTypeData, fyData, departmentData] = await Promise.all([
        apiRequest<Employee[]>(`${basePath}/employees`),
        apiRequest<LeaveType[]>(`${basePath}/leave-types`),
        apiRequest<FinancialYear[]>(`${basePath}/financial-years`),
        apiRequest<Department[]>(`${basePath}/departments`),
      ]);
      setEmployees(employeeData);
      setLeaveTypes(leaveTypeData);
      setFinancialYears(fyData);
      setDepartments(departmentData);
      setFilters((current) => ({ ...current, fyID: current.fyID || fyData.find((item) => item.is_active)?.id || fyData[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load report filters.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad]);

  const reportQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.scope === "manager") params.set("scope", "manager");
    if (filters.scope === "selected_manager" && filters.managerID) params.set("manager_id", filters.managerID);
    if (filters.fyID) params.set("fy_id", filters.fyID);
    if (filters.userID) params.set("user_id", filters.userID);
    if (filters.departmentID) params.set("department_id", filters.departmentID);
    if (filters.leaveTypeID) params.set("leave_type_id", filters.leaveTypeID);
    if (filters.status) params.set("status", filters.status);
    if (filters.startDate) params.set("start_date", filters.startDate);
    if (filters.endDate) params.set("end_date", filters.endDate);
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [filters]);

  const loadReport = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const [rowData, summaryData] = await Promise.all([
        apiRequest<LeaveReportRow[]>(`${basePath}/leaves/report${reportQuery}`),
        apiRequest<LeaveReportSummary>(`${basePath}/leaves/report/summary${reportQuery}`),
      ]);
      setRows(rowData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave report.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, reportQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLookups(), 0);
    return () => window.clearTimeout(timer);
  }, [loadLookups]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReport(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReport]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportCSV() {
    const header = ["Employee", "Code", "Department", "Designation", "Leave Type", "FY", "Start", "End", "Days", "Status", "Reason", "Applied"];
    const lines = rows.map((row) => [employeeLabel(row), row.employee_code || "", row.department_name || "", row.designation_name || "", row.leave_type_name || row.leave_type_id, row.financial_year_name || row.fy_id, fmtDate(row.start_date), fmtDate(row.end_date), row.days, row.status, row.reason || "", fmtDate(row.applied_date)].map(csvValue).join(","));
    const csv = [header.map(csvValue).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "leave-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadLeaveReport(format: "pdf" | "xlsx") {
    const query = new URLSearchParams({ format });
    if (filters.fyID) query.set("fy_id", filters.fyID);
    if (filters.startDate) query.set("start_date", filters.startDate);
    if (filters.endDate) query.set("end_date", filters.endDate);
    const { blob, filename } = await apiDownload(`${basePath}/reports/code/leave.liability/download?${query.toString()}`);
    saveBlobDownload(blob, filename);
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Reports</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Manager and HR leave reports</h1>
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
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Reports</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Manager and HR leave reports</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Track leave utilization, team availability, status bottlenecks, and department-level absence patterns for workforce planning.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl border border-[#dbe8e1] bg-white px-5 py-3 text-sm font-black text-[#588368]" disabled={loading} onClick={loadReport} type="button">Refresh</button>
          <button className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={rows.length === 0} onClick={exportCSV} type="button">Export CSV</button>
        </div>
      </div>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Requests" value={summary.total_requests} detail={`${summary.employee_count} employees`} />
        <MetricCard label="Total Days" value={summary.total_days} detail="all matching leave" />
        <MetricCard label="Pending" value={summary.pending_count} detail={`${summary.pending_days} days`} />
        <MetricCard label="Approved" value={summary.approved_count} detail={`${summary.approved_days} days`} />
        <MetricCard label="Rejected/Canceled" value={summary.rejected_count + summary.canceled_count} detail={`${summary.rejected_days + summary.canceled_days} days`} />
      </div>

      <div className="mb-6 rounded-3xl border border-[#dfe6e2] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-[#111827]">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select label="Scope" value={filters.scope} onChange={(value) => update("scope", value as Filters["scope"])} options={[{ id: "all", name: "All employees" }, { id: "manager", name: "My team" }, { id: "selected_manager", name: "Selected manager" }]} />
          {filters.scope === "selected_manager" ? <Select label="Manager" value={filters.managerID} onChange={(value) => update("managerID", value)} options={employees.map((item) => ({ id: item.user_id, name: employeeLabel(item) }))} placeholder="Select manager" /> : null}
          <Select label="Financial year" value={filters.fyID} onChange={(value) => update("fyID", value)} options={financialYears} placeholder="All years" />
          <Select label="Employee" value={filters.userID} onChange={(value) => update("userID", value)} options={employees.map((item) => ({ id: item.user_id, name: employeeLabel(item) }))} placeholder="All employees" />
          <Select label="Department" value={filters.departmentID} onChange={(value) => update("departmentID", value)} options={departments} placeholder="All departments" />
          <Select label="Leave type" value={filters.leaveTypeID} onChange={(value) => update("leaveTypeID", value)} options={leaveTypes.map((item) => ({ id: item.id, name: `${item.name}${item.shortcode ? ` (${item.shortcode})` : ""}` }))} placeholder="All types" />
          <Select label="Status" value={filters.status} onChange={(value) => update("status", value)} options={statusOptions.map((item) => ({ id: item, name: item }))} placeholder="All statuses" />
          <Input label="From" value={filters.startDate} onChange={(value) => update("startDate", value)} type="date" />
          <Input label="To" value={filters.endDate} onChange={(value) => update("endDate", value)} type="date" />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#dfe6e2] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-black text-[#111827]">Leave report rows</h2><p className="text-sm font-semibold text-[#6b7280]">{rows.length} matching requests</p></div>
          <div className="flex flex-wrap gap-2">{loading ? <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">Loading</span> : null}<button className="rounded-lg border border-[#dbe8e1] px-3 py-2 text-xs font-black text-[#374151]" onClick={exportCSV} type="button">CSV</button><button className="rounded-lg border border-[#588368] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => void downloadLeaveReport("pdf")} type="button">PDF</button><button className="rounded-lg border border-[#2f6f7d] px-3 py-2 text-xs font-black text-[#2f6f7d]" onClick={() => void downloadLeaveReport("xlsx")} type="button">Excel</button></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr><th className="p-3">Employee</th><th className="p-3">Department</th><th className="p-3">Leave type</th><th className="p-3">Dates</th><th className="p-3">Days</th><th className="p-3">Status</th><th className="p-3">Reason</th><th className="p-3">Applied</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-[#edf1ef] hover:bg-[#f8faf9]" key={row.id}>
                  <td className="p-3"><strong className="block text-[#111827]">{employeeLabel(row)}</strong><span className="text-xs font-semibold text-[#6b7280]">{row.employee_code || row.user_id.slice(0, 8)}</span></td>
                  <td className="p-3"><strong className="block text-[#374151]">{row.department_name || "-"}</strong><span className="text-xs text-[#6b7280]">{row.designation_name || "No designation"}</span></td>
                  <td className="p-3">{row.leave_type_name || row.leave_type_id.slice(0, 8)}</td>
                  <td className="p-3">{fmtDate(row.start_date)} - {fmtDate(row.end_date)}<span className="block text-xs text-[#6b7280]">{row.start_day_type} / {row.end_day_type}</span></td>
                  <td className="p-3 font-black text-[#111827]">{row.days}</td>
                  <td className="p-3"><StatusPill status={row.status} /></td>
                  <td className="max-w-[260px] p-3 text-[#6b7280]">{row.reason || "-"}{row.is_sandwich ? <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">Sandwich</span> : null}</td>
                  <td className="p-3 text-[#6b7280]">{fmtDate(row.applied_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className="m-5 rounded-xl bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#6b7280]">No leave report rows match the current filters.</p> : null}
      </div>
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#588368]">{label}</p><strong className="mt-2 block text-3xl text-[#111827]">{Number(value || 0).toLocaleString()}</strong><span className="mt-1 block text-xs font-bold text-[#6b7280]">{detail}</span></article>;
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }>; placeholder?: string }) {
  return <label className="block text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe8e1] bg-white px-4 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{placeholder ? <option value="">{placeholder}</option> : null}{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe8e1] px-4 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = { pending: "bg-amber-50 text-amber-700", approved: "bg-emerald-50 text-emerald-700", rejected: "bg-red-50 text-red-700", canceled: "bg-slate-100 text-slate-600" };
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tones[status] || "bg-[#eef4f1] text-[#588368]"}`}>{status}</span>;
}
