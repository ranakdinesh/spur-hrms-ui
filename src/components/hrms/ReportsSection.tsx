"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type ReportCatalogItem = {
  id: string;
  report_code: string;
  module: string;
  name: string;
  description?: string | null;
  category: string;
  scope: string;
  permission_key: string;
  supported_filters?: string[];
  output_columns?: string[];
  is_active: boolean;
  sort_order: number;
};

type ReportSavedView = {
  id: string;
  report_id: string;
  name: string;
  description?: string | null;
  visibility: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  is_favorite: boolean;
  updated_at?: string;
};

type ReportExportJob = {
  id: string;
  report_id: string;
  saved_view_id?: string | null;
  export_format: string;
  status: string;
  file_object_key?: string | null;
  error_message?: string | null;
  created_at?: string;
};

type ReportSchedule = {
  id: string;
  report_id: string;
  saved_view_id?: string | null;
  name: string;
  frequency: string;
  timezone: string;
  delivery_channels?: string[];
  recipient_emails?: string[];
  next_run_at?: string | null;
  is_active: boolean;
};

type ReportSnapshot = {
  id: string;
  report_id: string;
  snapshot_key: string;
  period_start: string;
  period_end: string;
  row_count: number;
  generated_at?: string;
};

type ModalMode = "saved" | "export" | "schedule" | "snapshot" | "";

const modules = ["employees", "attendance", "leave", "payroll", "recruitment", "compliance"];
const scopes = ["self", "team", "tenant", "system"];
const emptyJSON = "{}";
const emptyArrayJSON = "[]";

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString();
}

function reportName(reports: ReportCatalogItem[], id: string) {
  return reports.find((item) => item.id === id)?.name || id.slice(0, 8);
}

function parseJSONField(value: string, fallback: unknown) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed);
}

export function ReportsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [reports, setReports] = useState<ReportCatalogItem[]>([]);
  const [savedViews, setSavedViews] = useState<ReportSavedView[]>([]);
  const [exportJobs, setExportJobs] = useState<ReportExportJob[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [tab, setTab] = useState<"catalog" | "saved" | "schedules" | "exports" | "snapshots">("catalog");
  const [moduleFilter, setModuleFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<ModalMode>("");
  const [selectedReportID, setSelectedReportID] = useState("");

  const [savedForm, setSavedForm] = useState({ name: "", description: "", visibility: "private", filters: emptyJSON, columns: emptyArrayJSON, isFavorite: true });
  const [exportForm, setExportForm] = useState({ savedViewID: "", exportFormat: "csv", filters: emptyJSON });
  const [scheduleForm, setScheduleForm] = useState({ savedViewID: "", name: "", frequency: "monthly", timezone: "Asia/Kolkata", recipientEmails: emptyArrayJSON, nextRunAt: "", isActive: true });
  const [snapshotForm, setSnapshotForm] = useState({ snapshotKey: "", periodStart: "", periodEnd: "", rowCount: "0", filters: emptyJSON, summary: emptyJSON });

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((item) => {
      if (moduleFilter && item.module !== moduleFilter) return false;
      if (scopeFilter && item.scope !== scopeFilter) return false;
      if (!term) return true;
      return `${item.name} ${item.report_code} ${item.category} ${item.module}`.toLowerCase().includes(term);
    });
  }, [moduleFilter, reports, scopeFilter, search]);
  const lifecycleReports = useMemo(() => reports.filter((item) => item.category === "Talent Lifecycle").sort((a, b) => a.sort_order - b.sort_order), [reports]);

  const selectedReport = reports.find((item) => item.id === selectedReportID);

  const loadReports = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const [catalog, views, jobs, scheduleRows, snapshotRows] = await Promise.all([
        apiRequest<ReportCatalogItem[]>(`${basePath}/reports/catalog`),
        apiRequest<ReportSavedView[]>(`${basePath}/reports/saved-views`),
        apiRequest<ReportExportJob[]>(`${basePath}/reports/export-jobs?limit=25`),
        apiRequest<ReportSchedule[]>(`${basePath}/reports/schedules`),
        apiRequest<ReportSnapshot[]>(`${basePath}/reports/snapshots?limit=25`),
      ]);
      setReports(catalog);
      setSavedViews(views);
      setExportJobs(jobs);
      setSchedules(scheduleRows);
      setSnapshots(snapshotRows);
      setSelectedReportID((current) => current || catalog[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReports(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  function openModal(mode: ModalMode, reportID?: string) {
    const nextReportID = reportID || selectedReportID || reports[0]?.id || "";
    setSelectedReportID(nextReportID);
    setMessage("");
    setError("");
    setModal(mode);
  }

  async function submitSavedView(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = await apiRequest<ReportSavedView>(`${basePath}/reports/saved-views`, { method: "POST", body: { report_id: selectedReportID, name: savedForm.name, description: savedForm.description || undefined, visibility: savedForm.visibility, filters: parseJSONField(savedForm.filters, {}), columns: parseJSONField(savedForm.columns, []), is_favorite: savedForm.isFavorite } });
      setSavedViews((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setModal("");
      setMessage("Saved view created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save view.");
    }
  }

  async function submitExportJob(event: FormEvent) {
    event.preventDefault();
    try {
      const job = await apiRequest<ReportExportJob>(`${basePath}/reports/export-jobs`, { method: "POST", body: { report_id: selectedReportID, saved_view_id: exportForm.savedViewID || undefined, export_format: exportForm.exportFormat, filters: parseJSONField(exportForm.filters, {}) } });
      setExportJobs((current) => [job, ...current]);
      setModal("");
      setTab("exports");
      setMessage("Export job queued.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to queue export.");
    }
  }

  async function submitSchedule(event: FormEvent) {
    event.preventDefault();
    try {
      const schedule = await apiRequest<ReportSchedule>(`${basePath}/reports/schedules`, { method: "POST", body: { report_id: selectedReportID, saved_view_id: scheduleForm.savedViewID || undefined, name: scheduleForm.name, frequency: scheduleForm.frequency, timezone: scheduleForm.timezone, delivery_channels: ["email"], recipient_emails: parseJSONField(scheduleForm.recipientEmails, []), next_run_at: scheduleForm.nextRunAt ? new Date(scheduleForm.nextRunAt).toISOString() : undefined, is_active: scheduleForm.isActive } });
      setSchedules((current) => [schedule, ...current.filter((item) => item.id !== schedule.id)]);
      setModal("");
      setTab("schedules");
      setMessage("Schedule saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save schedule.");
    }
  }

  async function submitSnapshot(event: FormEvent) {
    event.preventDefault();
    try {
      const snapshot = await apiRequest<ReportSnapshot>(`${basePath}/reports/snapshots`, { method: "POST", body: { report_id: selectedReportID, snapshot_key: snapshotForm.snapshotKey, period_start: snapshotForm.periodStart, period_end: snapshotForm.periodEnd, row_count: Number(snapshotForm.rowCount || 0), filters: parseJSONField(snapshotForm.filters, {}), summary: parseJSONField(snapshotForm.summary, {}) } });
      setSnapshots((current) => [snapshot, ...current]);
      setModal("");
      setTab("snapshots");
      setMessage("Snapshot recorded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record snapshot.");
    }
  }

  async function downloadReport(reportID: string, format: "pdf" | "xlsx") {
    try {
      const params = new URLSearchParams({ format });
      const { blob, filename } = await apiDownload(`${basePath}/reports/catalog/${reportID}/download?${params.toString()}`);
      saveBlobDownload(blob, filename);
      setMessage(`${format.toUpperCase()} downloaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download report.");
    }
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="rounded-2xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Reports</p>
            <InfoButton text="Select a tenant to load tenant-scoped report catalog, saved views, schedules, exports, and snapshots." />
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">Reporting workspace</h1>
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
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Reports</p>
            <InfoButton text="Catalog-driven reporting foundation for role-aware report discovery, saved views, export audit, schedules, and period snapshots." />
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">Reporting workspace</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-[#dbe8e1] bg-white px-4 py-2 text-sm font-black text-[#588368]" disabled={loading} onClick={loadReports} type="button">Refresh</button>
          <button className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={!selectedReportID} onClick={() => openModal("saved")} type="button">Saved View</button>
          <button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={!selectedReportID} onClick={() => openModal("export")} type="button">Export</button>
          <button className="rounded-xl border border-[#588368] bg-white px-4 py-2 text-sm font-black text-[#588368] disabled:opacity-50" disabled={!selectedReportID} onClick={() => void downloadReport(selectedReportID, "pdf")} type="button">PDF</button>
          <button className="rounded-xl border border-[#2f6f7d] bg-white px-4 py-2 text-sm font-black text-[#2f6f7d] disabled:opacity-50" disabled={!selectedReportID} onClick={() => void downloadReport(selectedReportID, "xlsx")} type="button">Excel</button>
          <button className="rounded-xl border border-[#111827] bg-white px-4 py-2 text-sm font-black text-[#111827] disabled:opacity-50" disabled={!selectedReportID} onClick={() => openModal("schedule")} type="button">Schedule</button>
        </div>
      </div>

      {message ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Metric label="Reports" value={reports.length} />
        <Metric label="Saved Views" value={savedViews.length} />
        <Metric label="Schedules" value={schedules.length} />
        <Metric label="Exports" value={exportJobs.length} />
      </div>

      {lifecycleReports.length ? (
        <section className="mb-5 rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#111827]">Talent lifecycle reports</h2>
                <InfoButton text="Recruitment, onboarding, probation, exit, and F&F packs are downloadable with tenant branding." />
              </div>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">Hiring funnel, source effectiveness, onboarding completion, probation due, exit pipeline, and F&F readiness.</p>
            </div>
            <button className="h-10 rounded-xl border border-[#dbe8e1] px-3 text-xs font-black text-[#374151]" onClick={() => { setModuleFilter(""); setScopeFilter(""); setSearch("Talent Lifecycle"); setTab("catalog"); }} type="button">Show in catalog</button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {lifecycleReports.map((item) => (
              <article className={`rounded-xl border p-4 ${selectedReportID === item.id ? "border-[#588368] bg-[#f7fbf8]" : "border-[#edf1ef] bg-white"}`} key={item.id}>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#588368]">{item.module}</p>
                <h3 className="mt-2 text-base font-black text-[#111827]">{item.name}</h3>
                <p className="mt-1 min-h-10 text-xs font-semibold leading-5 text-[#6b7280]">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-xl border border-[#dbe8e1] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => setSelectedReportID(item.id)} type="button">Select</button>
                  <button className="rounded-xl border border-[#588368] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => void downloadReport(item.id, "pdf")} type="button">PDF</button>
                  <button className="rounded-xl border border-[#2f6f7d] px-3 py-2 text-xs font-black text-[#2f6f7d]" onClick={() => void downloadReport(item.id, "xlsx")} type="button">Excel</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <input className="h-11 min-w-0 flex-1 rounded-xl border border-[#dbe8e1] px-3 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search reports" value={search} />
        <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setModuleFilter(event.target.value)} value={moduleFilter}>
          <option value="">All modules</option>
          {modules.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="h-11 rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setScopeFilter(event.target.value)} value={scopeFilter}>
          <option value="">All scopes</option>
          {scopes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(["catalog", "saved", "schedules", "exports", "snapshots"] as const).map((item) => (
          <button className={`rounded-xl px-4 py-2 text-sm font-black ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe8e1] bg-white text-[#374151]"}`} key={item} onClick={() => setTab(item)} type="button">{item[0].toUpperCase() + item.slice(1)}</button>
        ))}
      </div>

      {tab === "catalog" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredReports.map((item) => (
            <article className={`rounded-2xl border bg-white p-5 shadow-sm ${selectedReportID === item.id ? "border-[#588368]" : "border-[#dfe6e2]"}`} key={item.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#588368]">{item.category}</p>
                  <h2 className="mt-2 text-xl font-black text-[#111827]">{item.name}</h2>
                  <p className="mt-1 text-xs font-bold text-[#6b7280]">{item.report_code}</p>
                </div>
                <button className="rounded-xl border border-[#dbe8e1] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => setSelectedReportID(item.id)} type="button">Select</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-[#588368]">{item.module}</span>
                <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[#374151]">{item.scope}</span>
                <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[#374151]">{item.permission_key}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-xl bg-[#111827] px-3 py-2 text-xs font-black text-white" onClick={() => openModal("saved", item.id)} type="button">Saved View</button>
                <button className="rounded-xl border border-[#588368] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => openModal("export", item.id)} type="button">Export</button>
                <button className="rounded-xl border border-[#2f6f7d] px-3 py-2 text-xs font-black text-[#2f6f7d]" onClick={() => void downloadReport(item.id, "pdf")} type="button">PDF</button>
                <button className="rounded-xl border border-[#2f6f7d] px-3 py-2 text-xs font-black text-[#2f6f7d]" onClick={() => void downloadReport(item.id, "xlsx")} type="button">Excel</button>
                <button className="rounded-xl border border-[#111827] px-3 py-2 text-xs font-black text-[#111827]" onClick={() => openModal("schedule", item.id)} type="button">Schedule</button>
                <button className="rounded-xl border border-[#dbe8e1] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => openModal("snapshot", item.id)} type="button">Snapshot</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "saved" ? <DataTable headers={["Name", "Report", "Visibility", "Favorite", "Updated"]} rows={savedViews.map((item) => [item.name, reportName(reports, item.report_id), item.visibility, item.is_favorite ? "Yes" : "No", formatDate(item.updated_at)])} /> : null}
      {tab === "schedules" ? <DataTable headers={["Name", "Report", "Frequency", "Timezone", "Next Run", "Active"]} rows={schedules.map((item) => [item.name, reportName(reports, item.report_id), item.frequency, item.timezone, formatDate(item.next_run_at), item.is_active ? "Yes" : "No"])} /> : null}
      {tab === "exports" ? <DataTable headers={["Report", "Format", "Status", "File", "Created"]} rows={exportJobs.map((item) => [reportName(reports, item.report_id), item.export_format, item.status, item.file_object_key || "-", formatDate(item.created_at)])} /> : null}
      {tab === "snapshots" ? <DataTable headers={["Key", "Report", "Period", "Rows", "Generated"]} rows={snapshots.map((item) => [item.snapshot_key, reportName(reports, item.report_id), `${formatDate(item.period_start)} - ${formatDate(item.period_end)}`, item.row_count, formatDate(item.generated_at)])} /> : null}

      <ReportPicker reports={reports} selectedReportID={selectedReportID} setSelectedReportID={setSelectedReportID} selectedReport={selectedReport} />

      <HrmsModal open={modal === "saved"} onClose={() => setModal("")} title="Create Saved View">
        <form className="grid gap-4" onSubmit={submitSavedView}>
          <ReportSelect reports={reports} value={selectedReportID} onChange={setSelectedReportID} />
          <TextInput label="Name" value={savedForm.name} onChange={(value) => setSavedForm((current) => ({ ...current, name: value }))} required />
          <TextInput label="Description" value={savedForm.description} onChange={(value) => setSavedForm((current) => ({ ...current, description: value }))} />
          <SelectInput label="Visibility" value={savedForm.visibility} onChange={(value) => setSavedForm((current) => ({ ...current, visibility: value }))} options={["private", "team", "tenant"]} />
          <JSONInput label="Filters" value={savedForm.filters} onChange={(value) => setSavedForm((current) => ({ ...current, filters: value }))} help="JSON object storing date, FY, pay-cycle, branch, department, designation, employment-type, and other selected filters." />
          <JSONInput label="Columns" value={savedForm.columns} onChange={(value) => setSavedForm((current) => ({ ...current, columns: value }))} help="JSON array of column keys to show for this view." />
          <label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={savedForm.isFavorite} onChange={(event) => setSavedForm((current) => ({ ...current, isFavorite: event.target.checked }))} type="checkbox" /> Favorite</label>
          <ModalActions onCancel={() => setModal("")} submitLabel="Save View" />
        </form>
      </HrmsModal>

      <HrmsModal open={modal === "export"} onClose={() => setModal("")} title="Queue Export">
        <form className="grid gap-4" onSubmit={submitExportJob}>
          <ReportSelect reports={reports} value={selectedReportID} onChange={setSelectedReportID} />
          <SavedViewSelect savedViews={savedViews.filter((item) => item.report_id === selectedReportID)} value={exportForm.savedViewID} onChange={(value) => setExportForm((current) => ({ ...current, savedViewID: value }))} />
          <SelectInput label="Format" value={exportForm.exportFormat} onChange={(value) => setExportForm((current) => ({ ...current, exportFormat: value }))} options={["csv", "pdf", "xlsx"]} />
          <JSONInput label="Filters" value={exportForm.filters} onChange={(value) => setExportForm((current) => ({ ...current, filters: value }))} help="Runtime filters for this export job. Saved view filters can be copied here when needed." />
          <ModalActions onCancel={() => setModal("")} submitLabel="Queue Export" />
        </form>
      </HrmsModal>

      <HrmsModal open={modal === "schedule"} onClose={() => setModal("")} title="Create Schedule">
        <form className="grid gap-4" onSubmit={submitSchedule}>
          <ReportSelect reports={reports} value={selectedReportID} onChange={setSelectedReportID} />
          <SavedViewSelect savedViews={savedViews.filter((item) => item.report_id === selectedReportID)} value={scheduleForm.savedViewID} onChange={(value) => setScheduleForm((current) => ({ ...current, savedViewID: value }))} />
          <TextInput label="Name" value={scheduleForm.name} onChange={(value) => setScheduleForm((current) => ({ ...current, name: value }))} required />
          <SelectInput label="Frequency" value={scheduleForm.frequency} onChange={(value) => setScheduleForm((current) => ({ ...current, frequency: value }))} options={["daily", "weekly", "monthly"]} />
          <TextInput label="Timezone" value={scheduleForm.timezone} onChange={(value) => setScheduleForm((current) => ({ ...current, timezone: value }))} required />
          <TextInput label="Next Run" type="datetime-local" value={scheduleForm.nextRunAt} onChange={(value) => setScheduleForm((current) => ({ ...current, nextRunAt: value }))} />
          <JSONInput label="Recipient Emails" value={scheduleForm.recipientEmails} onChange={(value) => setScheduleForm((current) => ({ ...current, recipientEmails: value }))} help="JSON array of email addresses for scheduled delivery." />
          <label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={scheduleForm.isActive} onChange={(event) => setScheduleForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" /> Active</label>
          <ModalActions onCancel={() => setModal("")} submitLabel="Save Schedule" />
        </form>
      </HrmsModal>

      <HrmsModal open={modal === "snapshot"} onClose={() => setModal("")} title="Record Snapshot">
        <form className="grid gap-4" onSubmit={submitSnapshot}>
          <ReportSelect reports={reports} value={selectedReportID} onChange={setSelectedReportID} />
          <TextInput label="Snapshot Key" value={snapshotForm.snapshotKey} onChange={(value) => setSnapshotForm((current) => ({ ...current, snapshotKey: value }))} required />
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput label="Period Start" type="date" value={snapshotForm.periodStart} onChange={(value) => setSnapshotForm((current) => ({ ...current, periodStart: value }))} required />
            <TextInput label="Period End" type="date" value={snapshotForm.periodEnd} onChange={(value) => setSnapshotForm((current) => ({ ...current, periodEnd: value }))} required />
          </div>
          <TextInput label="Row Count" type="number" value={snapshotForm.rowCount} onChange={(value) => setSnapshotForm((current) => ({ ...current, rowCount: value }))} required />
          <JSONInput label="Filters" value={snapshotForm.filters} onChange={(value) => setSnapshotForm((current) => ({ ...current, filters: value }))} help="Filters used when this period-close snapshot was produced." />
          <JSONInput label="Summary" value={snapshotForm.summary} onChange={(value) => setSnapshotForm((current) => ({ ...current, summary: value }))} help="Summary metrics captured for the snapshot." />
          <ModalActions onCancel={() => setModal("")} submitLabel="Record Snapshot" />
        </form>
      </HrmsModal>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">{label}</p><p className="mt-2 text-3xl font-black text-[#111827]">{value}</p></div>;
}

function InfoButton({ text }: { text: string }) {
  return <button aria-label={text} className="grid h-6 w-6 place-items-center rounded-full border border-[#cfd8d3] text-xs font-black text-[#588368]" title={text} type="button">i</button>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#dfe6e2] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((header) => <th className="p-3" key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((row, rowIndex) => <tr className="border-t border-[#edf1ef]" key={rowIndex}>{row.map((cell, cellIndex) => <td className="p-3 font-semibold text-[#374151]" key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td className="p-5 text-sm font-bold text-[#6b7280]" colSpan={headers.length}>No rows</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportPicker({ reports, selectedReportID, setSelectedReportID, selectedReport }: { reports: ReportCatalogItem[]; selectedReportID: string; setSelectedReportID: (value: string) => void; selectedReport?: ReportCatalogItem }) {
  return (
    <div className="mt-5 rounded-2xl border border-[#dfe6e2] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><h2 className="text-lg font-black text-[#111827]">Selected report</h2><InfoButton text="The selected report is used as the default for saved view, export, schedule, and snapshot actions." /></div>
      <select className="mt-3 h-11 w-full rounded-xl border border-[#dbe8e1] px-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setSelectedReportID(event.target.value)} value={selectedReportID}>
        {reports.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {selectedReport ? <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#374151]"><span>{selectedReport.category}</span><span>{selectedReport.module}</span><span>{selectedReport.scope}</span></div> : null}
    </div>
  );
}

function ReportSelect({ reports, value, onChange }: { reports: ReportCatalogItem[]; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">Report<select className="h-11 rounded-xl border border-[#dbe8e1] px-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required value={value}>{reports.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function SavedViewSelect({ savedViews, value, onChange }: { savedViews: ReportSavedView[]; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">Saved View<select className="h-11 rounded-xl border border-[#dbe8e1] px-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}><option value="">None</option>{savedViews.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function TextInput({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{label}<input className="h-11 rounded-xl border border-[#dbe8e1] px-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} /></label>;
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]">{label}<select className="h-11 rounded-xl border border-[#dbe8e1] px-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}

function JSONInput({ label, value, onChange, help }: { label: string; value: string; onChange: (value: string) => void; help: string }) {
  return <label className="grid gap-2 text-sm font-bold text-[#374151]"><span className="flex items-center gap-2">{label}<InfoButton text={help} /></span><textarea className="min-h-28 rounded-xl border border-[#dbe8e1] p-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function ModalActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return <div className="flex justify-end gap-2 border-t border-[#edf1ef] pt-4"><button className="rounded-xl border border-[#dbe8e1] px-4 py-2 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white" type="submit">{submitLabel}</button></div>;
}
