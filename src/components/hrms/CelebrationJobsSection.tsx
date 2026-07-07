"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type JobRun = {
  id: string;
  tenant_id: string;
  job_key: string;
  run_date: string;
  status: "running" | "succeeded" | "failed" | "skipped" | string;
  owner_id?: string | null;
  started_at: string;
  finished_at?: string | null;
  processed_count: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
};

type RegisteredJob = {
  key: string;
  name: string;
  description: string;
  schedule: string;
  timezone: string;
  default_run_time: string;
  recommended_mode: string;
  idempotency_key: string;
  backfill_ready: boolean;
  channels: string[];
};

type JobResult = {
  job_key?: string;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusClass(status: string) {
  if (status === "succeeded") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "failed") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "running") return "bg-[#e0f2fe] text-[#0369a1]";
  return "bg-[#f3f4f6] text-[#4b5563]";
}

export function CelebrationJobsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const filteredTenants = useMemo(() => tenants.filter((tenant) => tenant.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Automation</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Scheduled Jobs</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to run or inspect HRMS automation jobs.</p>
          </div>
        </div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Open Jobs</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  return <CelebrationJobManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function CelebrationJobManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [jobs, setJobs] = useState<RegisteredJob[]>([]);
  const [selectedJobKey, setSelectedJobKey] = useState("celebration_daily");
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [date, setDate] = useState(todayISO());
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const selectedJob = jobs.find((job) => job.key === selectedJobKey);

  const loadJobs = useCallback(async () => {
    try {
      const items = await apiRequest<RegisteredJob[]>(`${basePath}/jobs`);
      setJobs(items);
      if (items.length > 0 && !items.some((job) => job.key === selectedJobKey)) {
        setSelectedJobKey(items[0].key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scheduled jobs.");
    }
  }, [basePath, selectedJobKey]);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRuns(await apiRequest<JobRun[]>(`${basePath}/jobs/${selectedJobKey}/runs?limit=25`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job runs.");
    } finally {
      setLoading(false);
    }
  }, [basePath, selectedJobKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadJobs();
      void loadRuns();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadJobs, loadRuns]);

  async function runJob() {
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<JobResult>(`${basePath}/jobs/${selectedJobKey}/run`, { method: "POST", body: { date, force } });
      setMessage(`${selectedJob?.name || result.job_key || "Job"} processed ${result.processed}, succeeded ${result.succeeded}, skipped ${result.skipped}, failed ${result.failed}.`);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run job.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Automation</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Scheduled Jobs` : "Scheduled Jobs"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Run tenant automation jobs and inspect persisted execution status, locks, idempotent skips, failures, and metadata.</p>
        </div>
        {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      </div>

      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {message ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{message}</div> : null}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#111827]">Manual Run</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-black text-[#374151]">Job<select className="mt-2 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSelectedJobKey(event.target.value)} value={selectedJobKey}>{jobs.map((job) => <option key={job.key} value={job.key}>{job.name}</option>)}</select></label>
            {selectedJob ? (
              <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4">
                <p className="text-sm font-bold text-[#111827]">{selectedJob.description}</p>
                <div className="mt-3 grid gap-2 text-xs font-bold text-[#6b7280]">
                  <span>Schedule: {selectedJob.schedule} at {selectedJob.default_run_time}</span>
                  <span>Mode: {selectedJob.recommended_mode}</span>
                  <span>Idempotency: {selectedJob.idempotency_key}</span>
                </div>
              </div>
            ) : null}
            <label className="block text-sm font-black text-[#374151]">Run Date<input className="mt-2 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label>
            <label className="flex min-h-[48px] items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]"><input checked={force} onChange={(event) => setForce(event.target.checked)} type="checkbox" />Force retry for completed date</label>
            <button className="w-full rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={running || jobs.length === 0} onClick={runJob} type="button">{running ? "Running..." : "Run Job"}</button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf1ef] p-5">
            <div><h2 className="text-xl font-black text-[#111827]">Run History</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : `${runs.length} recent runs`}</p></div>
            <button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={() => void loadRuns()} type="button">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Processed</th><th className="px-5 py-4">Sent</th><th className="px-5 py-4">Failed</th><th className="px-5 py-4">Skipped</th><th className="px-5 py-4">Finished</th></tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {!loading && runs.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No runs yet.</td></tr> : runs.map((run) => (
                  <tr className="align-top hover:bg-[#f8faf9]" key={run.id}>
                    <td className="px-5 py-5"><span className="block text-sm font-bold text-[#111827]">{formatDate(run.run_date)}</span><span className="mt-1 block text-xs font-bold text-[#6b7280]">{run.job_key}</span></td>
                    <td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(run.status)}`}>{run.status}</span>{run.error_message ? <p className="mt-2 max-w-[220px] text-xs font-semibold text-[#b91c1c]">{run.error_message}</p> : null}</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#374151]">{run.processed_count}</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#237a45]">{run.success_count}</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#b91c1c]">{run.failed_count}</td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{run.skipped_count}</td>
                    <td className="px-5 py-5 text-sm font-semibold text-[#6b7280]">{formatDateTime(run.finished_at || run.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
