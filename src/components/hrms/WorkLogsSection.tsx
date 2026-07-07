"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Engagement = {
  id: string;
  worker_profile_id: string;
  worker_display_name?: string;
  title: string;
  engagement_code?: string | null;
  project_label?: string | null;
  project_code?: string | null;
  cost_center?: string | null;
  hours_budget?: number | null;
  status: string;
};

type WorkLog = {
  id: string;
  engagement_id: string;
  engagement_title?: string;
  engagement_code?: string | null;
  project_label?: string | null;
  project_code?: string | null;
  cost_center?: string | null;
  worker_profile_id: string;
  worker_display_name?: string;
  worker_code?: string | null;
  department_name?: string | null;
  branch_name?: string | null;
  log_date: string;
  hours_worked: number;
  billable_hours?: number | null;
  work_summary?: string | null;
  deliverable_reference?: string | null;
  status: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
  metadata?: Record<string, unknown> | null;
};

type WorkLogRollup = {
  engagement_id: string;
  engagement_title: string;
  engagement_code?: string | null;
  worker_profile_id: string;
  worker_display_name: string;
  log_count: number;
  total_hours: number;
  billable_hours: number;
  approved_hours: number;
  submitted_hours: number;
  rejected_hours: number;
  hours_budget?: number | null;
  remaining_hours?: number | null;
};

type WorkLogForm = {
  engagement_id: string;
  log_date: string;
  hours_worked: string;
  billable_hours: string;
  work_summary: string;
  deliverable_reference: string;
  status: string;
  metadata: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";
type WorkLogTab = "logs" | "approvals" | "rollups";

const emptyForm: WorkLogForm = {
  engagement_id: "",
  log_date: new Date().toISOString().slice(0, 10),
  hours_worked: "",
  billable_hours: "",
  work_summary: "",
  deliverable_reference: "",
  status: "draft",
  metadata: "{\n  \"source\": \"work_logs\"\n}",
};

const statusOptions = [
  ["draft", "Draft"],
  ["submitted", "Submitted"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["cancelled", "Cancelled"],
];

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function optionalNumber(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Hours must be non-negative numbers.");
  return parsed;
}

function parseJSONObject(value: string) {
  const parsed = value.trim() ? JSON.parse(value) : {};
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Metadata must be a JSON object.");
  return parsed as Record<string, unknown>;
}

function prettyJSON(value: unknown) {
  if (!value || typeof value !== "object") return "{\n  \"source\": \"work_logs\"\n}";
  return JSON.stringify(value, null, 2);
}

function dateForInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function labelFor(options: string[][], value?: string | null) {
  if (!value) return "-";
  return options.find(([key]) => key === value)?.[1] || value.replaceAll("_", " ");
}

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function formFromWorkLog(item: WorkLog): WorkLogForm {
  return {
    engagement_id: item.engagement_id || "",
    log_date: dateForInput(item.log_date),
    hours_worked: item.hours_worked == null ? "" : String(item.hours_worked),
    billable_hours: item.billable_hours == null ? "" : String(item.billable_hours),
    work_summary: item.work_summary || "",
    deliverable_reference: item.deliverable_reference || "",
    status: item.status || "draft",
    metadata: prettyJSON(item.metadata),
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function WorkLogsSection({
  isSuperAdmin,
  tenants,
  tenantsLoading,
  tenantsError,
}: {
  isSuperAdmin: boolean;
  tenants: BranchTenantOption[];
  tenantsLoading: boolean;
  tenantsError: string;
}) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantSort, setTenantSort] = useState<TenantSortKey>("name");

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.subdomainUrl, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => tenantSortValue(a, tenantSort).localeCompare(tenantSortValue(b, tenantSort)));
  }, [tenantSearch, tenantSort, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Work Logs</h1>
        </div>
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
              <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}>
                <option value="name">Sort by name</option>
                <option value="status">Sort by status</option>
                <option value="plan">Sort by plan</option>
                <option value="joined">Sort by joined</option>
              </select>
            </div>
          </div>
          {tenantsError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Subdomain</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr>
                ) : filteredTenants.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No tenants match your search.</td></tr>
                ) : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} / {tenant.kind}</span></td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <WorkLogsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function WorkLogsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [rollups, setRollups] = useState<WorkLogRollup[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<WorkLogTab>("logs");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [engagementFilter, setEngagementFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<WorkLogForm>(emptyForm);
  const [reviewTarget, setReviewTarget] = useState<{ item: WorkLog; status: "approved" | "rejected" } | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (engagementFilter) params.set("engagement_id", engagementFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (search.trim()) params.set("search", search.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const [logData, rollupData, engagementData] = await Promise.all([
        apiRequest<WorkLog[]>(`${basePath}/work-logs${suffix}`),
        apiRequest<WorkLogRollup[]>(`${basePath}/work-logs/rollups${suffix}`),
        apiRequest<Engagement[]>(`${basePath}/engagements`),
      ]);
      setLogs(logData);
      setRollups(rollupData);
      setEngagements(engagementData);
      setForm((current) => ({ ...current, engagement_id: current.engagement_id || engagementData[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load work logs.");
    } finally {
      setLoading(false);
    }
  }, [basePath, dateFrom, dateTo, engagementFilter, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const summary = useMemo(() => {
    const submitted = logs.filter((item) => item.status === "submitted").length;
    const approvedHours = logs.filter((item) => item.status === "approved").reduce((sum, item) => sum + (item.hours_worked || 0), 0);
    const submittedHours = logs.filter((item) => item.status === "submitted").reduce((sum, item) => sum + (item.hours_worked || 0), 0);
    const rejected = logs.filter((item) => item.status === "rejected").length;
    return { total: logs.length, submitted, approvedHours, submittedHours, rejected };
  }, [logs]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, engagement_id: engagementFilter || engagements[0]?.id || "" });
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(item: WorkLog) {
    setEditing(item);
    setForm(formFromWorkLog(item));
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  async function saveWorkLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const hoursWorked = optionalNumber(form.hours_worked);
      if (!form.engagement_id) throw new Error("Engagement is required.");
      if (!form.log_date) throw new Error("Log date is required.");
      if (!hoursWorked || hoursWorked <= 0 || hoursWorked > 24) throw new Error("Hours worked must be greater than 0 and no more than 24.");
      const payload = {
        engagement_id: form.engagement_id,
        log_date: form.log_date,
        hours_worked: hoursWorked,
        billable_hours: optionalNumber(form.billable_hours),
        work_summary: optionalString(form.work_summary),
        deliverable_reference: optionalString(form.deliverable_reference),
        status: form.status,
        metadata: parseJSONObject(form.metadata),
      };
      if (editing) {
        await apiRequest<WorkLog>(`${basePath}/work-logs/${editing.id}`, { method: "PUT", body: payload });
        setMessage("Work log updated.");
      } else {
        await apiRequest<WorkLog>(`${basePath}/work-logs`, { method: "POST", body: payload });
        setMessage("Work log created.");
      }
      setFormOpen(false);
      setEditing(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save work log.");
    } finally {
      setSaving(false);
    }
  }

  async function submitWorkLog(item: WorkLog) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<WorkLog>(`${basePath}/work-logs/${item.id}/submit`, { method: "POST" });
      setMessage("Work log submitted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit work log.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReview() {
    if (!reviewTarget) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<WorkLog>(`${basePath}/work-logs/${reviewTarget.item.id}/review`, {
        method: "POST",
        body: { status: reviewTarget.status, review_comment: optionalString(reviewComment) },
      });
      setMessage(reviewTarget.status === "approved" ? "Work log approved." : "Work log rejected.");
      setReviewTarget(null);
      setReviewComment("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review work log.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateWorkLog(item: WorkLog) {
    if (!window.confirm(`Deactivate work log for ${formatDate(item.log_date)}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/work-logs/${item.id}`, { method: "DELETE" });
      setMessage("Work log deactivated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate work log.");
    }
  }

  const visibleLogs = activeTab === "approvals" ? logs.filter((item) => item.status === "submitted") : logs;

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Work Logs` : "Work Logs"}</h1>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreate} type="button">Add Work Log</button>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-5">
        <SummaryCard label="Logs" value={summary.total} />
        <SummaryCard label="Pending Review" value={summary.submitted} tone="warning" />
        <SummaryCard label="Approved Hours" value={summary.approvedHours} />
        <SummaryCard label="Submitted Hours" value={summary.submittedHours} />
        <SummaryCard label="Rejected" value={summary.rejected} tone="warning" />
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="border-b border-[#edf1ef] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#111827]">Timesheet Register</h2>
              <InfoButton text="Submitted and approved logs count against engagement hour budgets. Draft logs remain editable until submitted." />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["logs", "approvals", "rollups"] as WorkLogTab[]).map((tab) => (
                <button className={`rounded-xl px-4 py-2 text-sm font-black ${activeTab === tab ? "bg-[#588368] text-white" : "border border-[#dbe0e5] text-[#374151]"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
                  {tab === "logs" ? "Logs" : tab === "approvals" ? "Approvals" : "Rollups"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search logs" value={search} />
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setEngagementFilter(event.target.value)} value={engagementFilter}>
              <option value="">All engagements</option>
              {engagements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All statuses</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
          </div>
        </div>

        {activeTab === "rollups" ? (
          <RollupsTable loading={loading} rollups={rollups} />
        ) : (
          <LogsTable
            logs={visibleLogs}
            loading={loading}
            onApprove={(item) => setReviewTarget({ item, status: "approved" })}
            onDeactivate={deactivateWorkLog}
            onEdit={openEdit}
            onReject={(item) => setReviewTarget({ item, status: "rejected" })}
            onSubmit={submitWorkLog}
          />
        )}
      </section>

      {formOpen ? (
        <Modal title={editing ? "Edit Work Log" : "Add Work Log"} onClose={() => setFormOpen(false)}>
          <form className="grid gap-5 p-6" onSubmit={saveWorkLog}>
            <div className="grid gap-4 md:grid-cols-3">
              <FormSelect label="Engagement" onChange={(value) => setForm((current) => ({ ...current, engagement_id: value }))} value={form.engagement_id}>
                <option value="">Select engagement</option>
                {engagements.map((item) => <option key={item.id} value={item.id}>{item.title} {item.worker_display_name ? `- ${item.worker_display_name}` : ""}</option>)}
              </FormSelect>
              <FormInput label="Log date" onChange={(value) => setForm((current) => ({ ...current, log_date: value }))} required type="date" value={form.log_date} />
              <FormInput label="Hours worked" onChange={(value) => setForm((current) => ({ ...current, hours_worked: value }))} required type="number" value={form.hours_worked} />
              <FormInput label="Billable hours" onChange={(value) => setForm((current) => ({ ...current, billable_hours: value }))} type="number" value={form.billable_hours} />
              <FormInput label="Deliverable reference" onChange={(value) => setForm((current) => ({ ...current, deliverable_reference: value }))} value={form.deliverable_reference} />
              <FormSelect label="Status" onChange={(value) => setForm((current) => ({ ...current, status: value }))} value={form.status}>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </FormSelect>
            </div>
            <label className="grid gap-2 text-sm font-bold text-[#374151]">
              <span className="flex items-center gap-2">Work summary <InfoButton text="Summaries are required when a work log is submitted or approved." /></span>
              <textarea className="min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, work_summary: event.target.value }))} value={form.work_summary} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#374151]">
              <span className="flex items-center gap-2">Metadata <InfoButton text="Use JSON only for extra machine-readable fields such as source system or import batch." /></span>
              <textarea className="min-h-28 rounded-xl border border-[#dbe0e5] px-4 py-3 font-mono text-xs outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, metadata: event.target.value }))} value={form.metadata} />
            </label>
            <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
              <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setFormOpen(false)} type="button">Cancel</button>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Work Log"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {reviewTarget ? (
        <Modal title={reviewTarget.status === "approved" ? "Approve Work Log" : "Reject Work Log"} onClose={() => setReviewTarget(null)} size="sm">
          <div className="grid gap-5 p-6">
            <div>
              <p className="text-sm font-bold text-[#111827]">{reviewTarget.item.engagement_title || "Engagement"}</p>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">{reviewTarget.item.worker_display_name || "Worker"} / {formatDate(reviewTarget.item.log_date)} / {reviewTarget.item.hours_worked} hours</p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-[#374151]">
              Review comment
              <textarea className="min-h-24 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => setReviewComment(event.target.value)} value={reviewComment} />
            </label>
            <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5">
              <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setReviewTarget(null)} type="button">Cancel</button>
              <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} onClick={saveReview} type="button">{saving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function LogsTable({ logs, loading, onEdit, onSubmit, onApprove, onReject, onDeactivate }: { logs: WorkLog[]; loading: boolean; onEdit: (item: WorkLog) => void; onSubmit: (item: WorkLog) => void; onApprove: (item: WorkLog) => void; onReject: (item: WorkLog) => void; onDeactivate: (item: WorkLog) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1220px] text-left">
        <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
          <tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Engagement</th><th className="px-5 py-4">Hours</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Summary</th><th className="px-5 py-4 text-right">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-[#edf1ef]">
          {loading ? (
            <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading work logs...</td></tr>
          ) : logs.length === 0 ? (
            <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No work logs found.</td></tr>
          ) : logs.map((item) => (
            <tr className="hover:bg-[#f8faf9]" key={item.id}>
              <td className="px-5 py-5 text-sm font-bold text-[#111827]">{formatDate(item.log_date)}</td>
              <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.worker_display_name || "Worker"}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.worker_code || item.department_name || "No code"}</span></td>
              <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.engagement_title || "Engagement"}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.project_label || item.project_code || item.cost_center || item.engagement_code || "No project"}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{item.hours_worked} worked<span className="block text-xs font-semibold text-[#6b7280]">{item.billable_hours ?? "-"} billable</span></td>
              <td className="px-5 py-5"><StatusChip value={labelFor(statusOptions, item.status)} /></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]"><span className="line-clamp-2">{item.work_summary || "-"}</span><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.deliverable_reference || item.review_comment || ""}</span></td>
              <td className="px-5 py-5 text-right">
                <div className="flex justify-end gap-2">
                  {item.status !== "approved" ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => onEdit(item)} type="button">Edit</button> : null}
                  {item.status === "draft" || item.status === "rejected" ? <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#588368]" onClick={() => onSubmit(item)} type="button">Submit</button> : null}
                  {item.status === "submitted" ? <button className="rounded-lg border border-emerald-100 px-3 py-2 text-xs font-black text-emerald-700" onClick={() => onApprove(item)} type="button">Approve</button> : null}
                  {item.status === "submitted" ? <button className="rounded-lg border border-amber-100 px-3 py-2 text-xs font-black text-amber-700" onClick={() => onReject(item)} type="button">Reject</button> : null}
                  {item.status !== "approved" ? <button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50" onClick={() => onDeactivate(item)} type="button">Deactivate</button> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RollupsTable({ rollups, loading }: { rollups: WorkLogRollup[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
          <tr><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Engagement</th><th className="px-5 py-4">Logs</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4">Approved</th><th className="px-5 py-4">Budget</th><th className="px-5 py-4">Remaining</th></tr>
        </thead>
        <tbody className="divide-y divide-[#edf1ef]">
          {loading ? (
            <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading rollups...</td></tr>
          ) : rollups.length === 0 ? (
            <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No rollups found.</td></tr>
          ) : rollups.map((item) => (
            <tr className="hover:bg-[#f8faf9]" key={`${item.engagement_id}-${item.worker_profile_id}`}>
              <td className="px-5 py-5 text-sm font-bold text-[#111827]">{item.worker_display_name}</td>
              <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.engagement_title}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.engagement_code || "No code"}</span></td>
              <td className="px-5 py-5 text-sm text-[#4b5563]">{item.log_count}<span className="block text-xs font-semibold text-[#6b7280]">{item.total_hours} total / {item.billable_hours} billable</span></td>
              <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{item.submitted_hours}</td>
              <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{item.approved_hours}</td>
              <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{item.hours_budget ?? "-"}</td>
              <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{item.remaining_hours ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "warning" }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tone === "warning" ? "border-amber-100 bg-amber-50" : "border-[#edf1ef] bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p>
      <strong className="mt-3 block text-3xl font-black text-[#111827]">{value}</strong>
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  return <span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-black text-[#588368]">{value}</span>;
}

function InfoButton({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button aria-label={text} className="flex h-5 w-5 items-center justify-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" type="button">i</button>
      <span className="pointer-events-none absolute left-0 top-7 z-20 hidden w-64 rounded-xl border border-[#edf1ef] bg-white p-3 text-xs font-semibold leading-5 text-[#4b5563] shadow-xl group-hover:block">{text}</span>
    </span>
  );
}

function Modal({ title, onClose, children, size = "lg" }: { title: string; onClose: () => void; children: ReactNode; size?: "sm" | "lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 px-4 py-6">
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${size === "sm" ? "max-w-xl" : "max-w-5xl"}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf1ef] bg-white px-6 py-5">
          <h2 className="text-xl font-black text-[#111827]">{title}</h2>
          <button className="rounded-full border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={onClose} type="button">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#374151]">
      {label}
      <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-medium outline-none focus:border-[#588368]" min={type === "number" ? "0" : undefined} onChange={(event) => onChange(event.target.value)} required={required} step={type === "number" ? "0.01" : undefined} type={type} value={value} />
    </label>
  );
}

function FormSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#374151]">
      {label}
      <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-medium outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}
