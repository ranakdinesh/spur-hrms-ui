"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Employee = { user_id: string; firstname: string; middle_name?: string | null; lastname?: string | null; employee_code?: string | null; email?: string | null };
type Master = { id: string; code: string; name?: string | null };
type InboxItem = { id: string; title: string; message: string; is_read: boolean; created_at: string; notification_master_id: string };
type LogItem = { id: string; channel: string; status: string; target_address: string; subject?: string | null; error_message?: string | null; bulk_id?: string | null; created_at: string };
type SendResult = { bulk_id: string; processed: number; inbox_count: number; log_count: number; sent: number; suppressed: number; failed: number; missing_master: boolean };

function displayName(employee: Employee) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ");
}

function fmt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function badge(status: string) {
  if (status === "Sent") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "Suppressed") return "bg-[#fef3c7] text-[#92400e]";
  if (status === "Failed") return "bg-[#fee2e2] text-[#b91c1c]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

export function NotificationCenterSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Notification Center</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to send notifications and inspect delivery logs.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Center</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <NotificationCenterManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function NotificationCenterManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [selectedUserID, setSelectedUserID] = useState("");
  const [recipientIDs, setRecipientIDs] = useState<string[]>([]);
  const [code, setCode] = useState("generalnotification");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<string[]>(["in_app", "Email", "Push"]);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const selectedQuery = selectedUserID ? `?user_id=${selectedUserID}` : "";

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [employeeRows, masterRows, logRows] = await Promise.all([
        apiRequest<Employee[]>(`${basePath}/employees`).catch(() => []),
        apiRequest<Master[]>(`${basePath}/notification-masters`),
        apiRequest<LogItem[]>(`${basePath}/notifications/logs${status ? `?status=${status}` : ""}`),
      ]);
      setEmployees(employeeRows);
      setMasters(masterRows);
      setLogs(logRows);
      if (isSuperAdmin && !selectedUserID && employeeRows.length > 0) setSelectedUserID(employeeRows[0].user_id);
      if (recipientIDs.length === 0 && employeeRows.length > 0) setRecipientIDs([employeeRows[0].user_id]);
      if (masterRows.length > 0 && !masterRows.some((master) => master.code === code)) setCode(masterRows[0].code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    }
  }, [basePath, code, isSuperAdmin, recipientIDs.length, selectedUserID, status]);

  const loadInbox = useCallback(async () => {
    if (isSuperAdmin && !selectedUserID) return;
    try {
      setInbox(await apiRequest<InboxItem[]>(`${basePath}/notifications/inbox${selectedQuery}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox.");
    }
  }, [basePath, isSuperAdmin, selectedQuery, selectedUserID]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInbox(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInbox]);

  function toggleChannel(channel: string) {
    setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);
  }

  async function send() {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<SendResult>(`${basePath}/notifications/send`, { method: "POST", body: { notification_code: code, user_ids: recipientIDs, title, message, channels } });
      setNotice(`Bulk ${result.bulk_id}: processed ${result.processed}, inbox ${result.inbox_count}, logs ${result.log_count}, suppressed ${result.suppressed}.`);
      setTitle("");
      setMessage("");
      await loadData();
      await loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notification.");
    } finally {
      setSending(false);
    }
  }

  async function markAllRead() {
    await apiRequest(`${basePath}/notifications/inbox/read-all${selectedQuery}`, { method: "PUT" });
    await loadInbox();
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Communication</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Notification Center` : "Notification Center"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Send preference-aware notifications, review inbox items, and audit channel delivery logs.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#111827]">Bulk Send</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-black text-[#374151]">Category<select className="mt-2 h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setCode(event.target.value)} value={code}>{masters.map((master) => <option key={master.id} value={master.code}>{master.name || master.code}</option>)}</select></label>
            <label className="block text-sm font-black text-[#374151]">Recipients<select className="mt-2 min-h-[132px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" multiple onChange={(event) => setRecipientIDs(Array.from(event.target.selectedOptions).map((option) => option.value))} value={recipientIDs}>{employees.map((employee) => <option key={employee.user_id} value={employee.user_id}>{displayName(employee)}{employee.employee_code ? ` (${employee.employee_code})` : ""}</option>)}</select></label>
            <input className="h-12 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setTitle(event.target.value)} placeholder="Title" value={title} />
            <textarea className="min-h-[110px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setMessage(event.target.value)} placeholder="Message" value={message} />
            <div className="grid gap-3 sm:grid-cols-3">{["in_app", "Email", "Push"].map((channel) => <label className="flex items-center gap-2 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-3 py-3 text-xs font-black text-[#374151]" key={channel}><input checked={channels.includes(channel)} onChange={() => toggleChannel(channel)} type="checkbox" />{channel === "in_app" ? "In-app" : channel}</label>)}</div>
            <button className="w-full rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={sending || recipientIDs.length === 0 || !title.trim() || !message.trim()} onClick={send} type="button">{sending ? "Sending..." : "Send Notification"}</button>
          </div>
        </div>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-black text-[#111827]">Inbox</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{inbox.filter((item) => !item.is_read).length} unread from {inbox.length}</p></div><div className="flex gap-3"><select className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setSelectedUserID(event.target.value)} value={selectedUserID}><option value="">{isSuperAdmin ? "Select employee" : "Current user"}</option>{employees.map((employee) => <option key={employee.user_id} value={employee.user_id}>{displayName(employee)}</option>)}</select><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={markAllRead} type="button">Mark all read</button></div></div>
            <div className="divide-y divide-[#edf1ef]">{inbox.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-[#6b7280]">No inbox notifications.</div> : inbox.map((item) => <div className="p-5" key={item.id}><div className="flex items-start justify-between gap-3"><strong className="text-sm text-[#111827]">{item.title}</strong><span className={`rounded-full px-3 py-1 text-xs font-black ${item.is_read ? "bg-[#f3f4f6] text-[#6b7280]" : "bg-[#e0f2fe] text-[#0369a1]"}`}>{item.is_read ? "Read" : "Unread"}</span></div><p className="mt-2 text-sm font-semibold text-[#4b5563]">{item.message}</p><p className="mt-2 text-xs font-bold text-[#6b7280]">{fmt(item.created_at)}</p></div>)}</div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-black text-[#111827]">Delivery Logs</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{logs.length} recent channel records</p></div><select className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option><option value="Pending">Pending</option><option value="Sent">Sent</option><option value="Suppressed">Suppressed</option><option value="Failed">Failed</option></select></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Channel</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Target</th><th className="px-5 py-4">Subject</th><th className="px-5 py-4">Time</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{logs.map((log) => <tr className="align-top hover:bg-[#f8faf9]" key={log.id}><td className="px-5 py-5 text-sm font-bold text-[#111827]">{log.channel}</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(log.status)}`}>{log.status}</span>{log.error_message ? <p className="mt-2 max-w-[220px] text-xs font-semibold text-[#92400e]">{log.error_message}</p> : null}</td><td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{log.target_address}</td><td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{log.subject || "-"}</td><td className="px-5 py-5 text-sm font-semibold text-[#6b7280]">{fmt(log.created_at)}</td></tr>)}</tbody></table></div>
          </section>
        </div>
      </section>
    </main>
  );
}
