"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Employee = {
  user_id: string;
  firstname: string;
  middle_name?: string | null;
  lastname?: string | null;
  employee_code?: string | null;
  email?: string | null;
};

type Master = {
  id: string;
  code: string;
  name?: string | null;
};

type InboxItem = {
  id: string;
  notification_master_id: string;
  notification_code?: string | null;
  notification_name?: string | null;
  title: string;
  message: string;
  reference_table?: string | null;
  is_read: boolean;
  read_date?: string | null;
  created_at: string;
};

type InboxPage = {
  items: InboxItem[];
  total: number;
  unread: number;
  limit: number;
  offset: number;
  next_offset?: number | null;
};

function displayName(employee: Employee) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ");
}

function fmt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function categoryName(item: InboxItem) {
  return item.notification_name || item.notification_code || "Notification";
}

export function NotificationInboxSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Inbox</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Notification Inbox</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to review employee notification inboxes.</p>
        </div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => (
                  <tr className="hover:bg-[#f8faf9]" key={row.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Inbox</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  return <NotificationInboxManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function NotificationInboxManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [page, setPage] = useState<InboxPage>({ items: [], total: 0, unread: 0, limit: 25, offset: 0 });
  const [selectedUserID, setSelectedUserID] = useState("");
  const [readFilter, setReadFilter] = useState("");
  const [notificationCode, setNotificationCode] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const limit = 25;
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const loadSetup = useCallback(async () => {
    setError("");
    try {
      const [employeeRows, masterRows] = await Promise.all([
        apiRequest<Employee[]>(`${basePath}/employees`).catch(() => []),
        apiRequest<Master[]>(`${basePath}/notification-masters`),
      ]);
      setEmployees(employeeRows);
      setMasters(masterRows);
      if (isSuperAdmin && !selectedUserID && employeeRows.length > 0) setSelectedUserID(employeeRows[0].user_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox setup.");
    }
  }, [basePath, isSuperAdmin, selectedUserID]);

  const loadInbox = useCallback(async () => {
    if (isSuperAdmin && !selectedUserID) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (selectedUserID) params.set("user_id", selectedUserID);
      if (readFilter) params.set("is_read", readFilter);
      if (notificationCode) params.set("notification_code", notificationCode);
      if (search.trim()) params.set("search", search.trim());
      setPage(await apiRequest<InboxPage>(`${basePath}/notifications/inbox/page?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notification inbox.");
    } finally {
      setLoading(false);
    }
  }, [basePath, isSuperAdmin, notificationCode, offset, readFilter, search, selectedUserID]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSetup(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSetup]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInbox(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInbox]);

  function resetFilters() {
    setReadFilter("");
    setNotificationCode("");
    setSearch("");
    setOffset(0);
  }

  async function mutateNotification(id: string, action: "read" | "unread" | "archive") {
    setError("");
    setNotice("");
    try {
      if (action === "archive") {
        await apiRequest(`${basePath}/notifications/inbox/${id}`, { method: "DELETE" });
        setNotice("Notification archived.");
      } else {
        await apiRequest(`${basePath}/notifications/inbox/${id}/${action}`, { method: "PUT" });
        setNotice(action === "read" ? "Notification marked as read." : "Notification marked as unread.");
      }
      await loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notification.");
    }
  }

  async function markAllRead() {
    if (isSuperAdmin && !selectedUserID) return;
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams();
      if (selectedUserID) params.set("user_id", selectedUserID);
      await apiRequest(`${basePath}/notifications/inbox/read-all${params.toString() ? `?${params.toString()}` : ""}`, { method: "PUT" });
      setNotice("All visible user's notifications marked as read.");
      await loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all notifications read.");
    }
  }

  const start = page.total === 0 ? 0 : page.offset + 1;
  const end = Math.min(page.offset + page.items.length, page.total);

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Inbox</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Notification Inbox` : "Notification Inbox"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Review policy, celebration, leave, and general notifications with persistent read state.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
          <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={loading || (isSuperAdmin && !selectedUserID)} onClick={markAllRead} type="button">Mark all read</button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">Total</p><strong className="mt-3 block text-3xl text-[#111827]">{page.total}</strong></div>
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">Unread</p><strong className="mt-3 block text-3xl text-[#0369a1]">{page.unread}</strong></div>
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">Window</p><strong className="mt-3 block text-3xl text-[#111827]">{start}-{end}</strong></div>
      </section>

      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_160px_220px_220px_auto]">
          <input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search title or message" value={search} />
          <select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setReadFilter(event.target.value); setOffset(0); }} value={readFilter}>
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setNotificationCode(event.target.value); setOffset(0); }} value={notificationCode}>
            <option value="">All categories</option>
            {masters.map((master) => <option key={master.id} value={master.code}>{master.name || master.code}</option>)}
          </select>
          <select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setSelectedUserID(event.target.value); setOffset(0); }} value={selectedUserID}>
            <option value="">{isSuperAdmin ? "Select employee" : "Current user"}</option>
            {employees.map((employee) => <option key={employee.user_id} value={employee.user_id}>{displayName(employee)}{employee.employee_code ? ` (${employee.employee_code})` : ""}</option>)}
          </select>
          <button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={resetFilters} type="button">Reset</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-black text-[#111827]">Messages</h2><p className="mt-1 text-sm font-semibold text-[#6b7280]">{loading ? "Loading..." : `${start}-${end} of ${page.total}`}</p></div>
          <button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" disabled={loading} onClick={() => void loadInbox()} type="button">Refresh</button>
        </div>
        <div className="divide-y divide-[#edf1ef]">
          {page.items.length === 0 ? <div className="p-10 text-center text-sm font-semibold text-[#6b7280]">{loading ? "Loading inbox..." : "No notifications match the current filters."}</div> : page.items.map((item) => (
            <article className={`p-5 ${item.is_read ? "bg-white" : "bg-[#f7fbff]"}`} key={item.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${item.is_read ? "bg-[#f3f4f6] text-[#6b7280]" : "bg-[#e0f2fe] text-[#0369a1]"}`}>{item.is_read ? "Read" : "Unread"}</span>
                    <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{categoryName(item)}</span>
                    <span className="text-xs font-bold text-[#6b7280]">{fmt(item.created_at)}</span>
                  </div>
                  <h3 className="mt-3 text-base font-black text-[#111827]">{item.title}</h3>
                  <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-[#4b5563]">{item.message}</p>
                  {item.reference_table ? <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#9ca3af]">{item.reference_table}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-xs font-black text-[#374151]" onClick={() => void mutateNotification(item.id, item.is_read ? "unread" : "read")} type="button">{item.is_read ? "Mark unread" : "Mark read"}</button>
                  <button className="rounded-xl border border-[#fee2e2] px-4 py-2 text-xs font-black text-[#b91c1c]" onClick={() => void mutateNotification(item.id, "archive")} type="button">Archive</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#6b7280]">{start}-{end} of {page.total}</p>
          <div className="flex gap-3">
            <button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151] disabled:opacity-50" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - limit))} type="button">Previous</button>
            <button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!page.next_offset || loading} onClick={() => setOffset(page.next_offset || offset)} type="button">Next</button>
          </div>
        </div>
      </section>
    </main>
  );
}
