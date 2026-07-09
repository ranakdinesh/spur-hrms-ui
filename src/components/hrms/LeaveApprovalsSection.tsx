"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Employee = { user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null };
type Approval = { id: string; leave_id: string; approver_id: string; status: string; remarks?: string | null; workflow_id?: string | null; workflow_step_id?: string | null; step_order: number; decision_rule: string; required_approvals: number; created_at: string };
type Leave = { id: string; user_id: string; leave_type_id: string; fy_id: string; start_date: string; end_date: string; start_day_type: "fullday" | "firsthalf" | "secondhalf"; end_day_type: "fullday" | "firsthalf" | "secondhalf"; days: number; reason?: string | null; status: string; is_sandwich: boolean; applied_date: string };
type LeavePreview = { allowed: boolean; total_days: number; base_days: number; sandwich_days: number; balance_after: number; pending_after: number; paid_leave: boolean; blocking_reasons?: string[]; warnings?: string[] };
type LeaveMessage = { id: string; sender_user_id: string; recipient_user_id?: string | null; message_type: string; body: string; created_at: string };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeLabel(item?: Employee) {
  if (!item) return "-";
  return `${item.firstname} ${item.lastname || ""}`.trim() || item.employee_code || item.user_id;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function formatDays(value = 0) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

export function LeaveApprovalsSection({ currentUserID, isSuperAdmin, tenants, tenantsLoading, tenantsError }: { currentUserID?: string; isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [approverID, setApproverID] = useState("");
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [leaveByID, setLeaveByID] = useState<Record<string, Leave>>({});
  const [previewByLeaveID, setPreviewByLeaveID] = useState<Record<string, LeavePreview>>({});
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [messages, setMessages] = useState<LeaveMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedLeave = selectedApproval ? leaveByID[selectedApproval.leave_id] : undefined;
  const selectedPreview = selectedApproval ? previewByLeaveID[selectedApproval.leave_id] : undefined;
  const effectiveApproverID = approverID || (!isSuperAdmin ? currentUserID || "" : "");

  const loadEmployees = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Employee[]>(`${basePath}/employees`);
      setEmployees(data);
      setApproverID((current) => current || (!isSuperAdmin ? currentUserID || "" : data[0]?.user_id || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load approvers.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, currentUserID, isSuperAdmin]);

  const loadApprovalContext = useCallback(async (items: Approval[]) => {
    const leaves = await Promise.all(items.map((item) => apiRequest<Leave>(`${basePath}/leaves/${item.leave_id}`).catch(() => null)));
    const nextLeaves: Record<string, Leave> = {};
    leaves.forEach((leave) => {
      if (leave) nextLeaves[leave.id] = leave;
    });
    setLeaveByID(nextLeaves);
    const previews = await Promise.all(Object.values(nextLeaves).map((leave) => apiRequest<LeavePreview>(`${basePath}/leaves/preview`, {
      method: "POST",
      body: {
        user_id: leave.user_id,
        leave_type_id: leave.leave_type_id,
        fy_id: leave.fy_id,
        start_date: dateOnly(leave.start_date),
        end_date: dateOnly(leave.end_date),
        start_day_type: leave.start_day_type,
        end_day_type: leave.end_day_type,
        reason: leave.reason || undefined,
        exclude_leave_id: leave.id,
      },
    }).then((preview) => [leave.id, preview] as const).catch(() => null)));
    const nextPreviews: Record<string, LeavePreview> = {};
    previews.forEach((entry) => {
      if (entry) nextPreviews[entry[0]] = entry[1];
    });
    setPreviewByLeaveID(nextPreviews);
  }, [basePath]);

  const loadApprovals = useCallback(async () => {
    if (!canLoad || !effectiveApproverID) {
      setApprovals([]);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const items = await apiRequest<Approval[]>(`${basePath}/leave-approvals?approver_id=${effectiveApproverID}`);
      setApprovals(items);
      await loadApprovalContext(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending approvals.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, effectiveApproverID, loadApprovalContext]);

  const loadMessages = useCallback(async (leaveID: string) => {
    setDetailLoading(true);
    try {
      setMessages(await apiRequest<LeaveMessage[]>(`${basePath}/leaves/${leaveID}/messages`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave conversation.");
      setMessages([]);
    } finally {
      setDetailLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEmployees(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEmployees]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadApprovals(), 0);
    return () => window.clearTimeout(timer);
  }, [loadApprovals]);

  async function openReview(item: Approval) {
    setSelectedApproval(item);
    setDecisionRemarks("");
    setMessageBody("");
    setMessage("");
    await loadMessages(item.leave_id);
  }

  async function approve(item: Approval) {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leave-approvals/${item.id}/approve`, { method: "POST", body: { approver_id: effectiveApproverID, remarks: decisionRemarks || undefined } });
      setSelectedApproval(null);
      setApprovals((items) => items.filter((approval) => approval.id !== item.id));
      setMessage("Leave approval completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve leave.");
    }
  }

  async function reject(item: Approval) {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leave-approvals/${item.id}/reject`, { method: "POST", body: { approver_id: effectiveApproverID, remarks: decisionRemarks || "Rejected" } });
      setSelectedApproval(null);
      setApprovals((items) => items.filter((approval) => approval.id !== item.id));
      setMessage("Leave request rejected and pending balance released.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject leave.");
    }
  }

  async function sendClarification(event: FormEvent) {
    event.preventDefault();
    if (!selectedApproval || !messageBody.trim()) return;
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leaves/${selectedApproval.leave_id}/messages`, {
        method: "POST",
        body: { message_type: "clarification_request", body: messageBody.trim() },
      });
      setMessageBody("");
      await loadMessages(selectedApproval.leave_id);
      setMessage("Clarification message sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send clarification.");
    }
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="rounded-2xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Approvals</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111711]">Approval queue</h1>
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
    <section className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_left,rgba(88,131,104,0.10),transparent_34%),linear-gradient(180deg,#ffffff,#f8faf7)] px-4 py-5 text-[#101915] lg:px-6">
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111711] sm:text-3xl">Leave Approvals</h1>
            <p className="mt-1 text-sm font-medium text-[#647067]">Review requests, warnings, and employee clarifications</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="h-11 rounded-xl border border-[#dbe8e1] bg-white px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setApproverID(e.target.value)} value={approverID}>
              <option value="">{isSuperAdmin ? "Select approver" : "My approval queue"}</option>
              {currentUserID && !employees.some((item) => item.user_id === currentUserID) ? <option value={currentUserID}>Current user</option> : null}
              {employees.map((item) => <option key={item.user_id} value={item.user_id}>{employeeLabel(item)}</option>)}
            </select>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9e3dc] bg-white px-4 py-3 text-sm font-extrabold text-[#17231a] shadow-[0_10px_28px_rgba(24,37,27,0.08)]" disabled={loading} onClick={loadApprovals} type="button">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="grid gap-3">
          {approvals.map((item) => {
            const leave = leaveByID[item.leave_id];
            const preview = previewByLeaveID[item.leave_id];
            const warningCount = (preview?.warnings?.length || 0) + (preview?.blocking_reasons?.length || 0);
            return (
              <article className="rounded-2xl border border-[#dfe7df] bg-white/95 p-4 shadow-[0_16px_42px_rgba(31,41,55,0.08)]" key={item.id}>
                <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-black text-[#121a14]">{employeeLabel(employees.find((employee) => employee.user_id === leave?.user_id))}</p>
                      {warningCount > 0 ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{warningCount} warning{warningCount === 1 ? "" : "s"}</span> : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#647067]">{leave ? `${formatDate(leave.start_date)} - ${formatDate(leave.end_date)} · ${formatDays(preview?.total_days ?? leave.days)} day${(preview?.total_days ?? leave.days) === 1 ? "" : "s"}` : item.leave_id}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-[#f8fbf8] p-3"><p className="text-[#647067]">Step</p><p className="mt-1 font-black text-[#121a14]">{item.step_order}</p></div>
                    <div className="rounded-xl bg-[#f8fbf8] p-3"><p className="text-[#647067]">Rule</p><p className="mt-1 font-black text-[#121a14]">{item.decision_rule}</p></div>
                    <div className="rounded-xl bg-[#f8fbf8] p-3"><p className="text-[#647067]">Pending</p><p className="mt-1 font-black text-[#121a14]">{formatDate(item.created_at)}</p></div>
                  </div>
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => void openReview(item)} type="button">
                    <MessageSquare className="h-4 w-4" />
                    Review
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {approvals.length === 0 ? <p className="rounded-xl bg-white px-4 py-8 text-center text-sm font-semibold text-[#647067]">{loading ? "Loading approvals..." : "No pending approvals for this approver."}</p> : null}
      </div>

      <HrmsModal description="Review the request, ask clarification, or complete the approval decision." onClose={() => setSelectedApproval(null)} open={Boolean(selectedApproval)} title="Review Leave Request">
        {selectedApproval && selectedLeave ? (
          <div className="grid gap-5">
            <section className="rounded-xl border border-[#e5ece7] bg-[#f8fbf8] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Summary label="Employee" value={employeeLabel(employees.find((employee) => employee.user_id === selectedLeave.user_id))} />
                <Summary label="Dates" value={`${formatDate(selectedLeave.start_date)} - ${formatDate(selectedLeave.end_date)}`} />
                <Summary label="Days" value={formatDays(selectedPreview?.total_days ?? selectedLeave.days)} />
                <Summary label="Status" value={selectedLeave.status} />
              </div>
              {selectedLeave.reason ? <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-[#647067]">{selectedLeave.reason}</p> : null}
            </section>

            {selectedPreview && ((selectedPreview.warnings?.length || 0) > 0 || (selectedPreview.blocking_reasons?.length || 0) > 0) ? (
              <section className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-800">Warnings for manager review</p>
                <ul className="mt-2 space-y-1 text-sm font-semibold leading-6 text-amber-800">
                  {[...(selectedPreview.warnings || []), ...(selectedPreview.blocking_reasons || [])].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ) : null}

            <section className="rounded-xl border border-[#e5ece7] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-[#121a14]">Conversation</p>
                {detailLoading ? <span className="text-xs font-bold text-[#647067]">Loading...</span> : null}
              </div>
              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {messages.map((item) => (
                  <div className={`rounded-xl p-3 ${item.sender_user_id === effectiveApproverID ? "bg-[#eef4f1]" : "bg-[#f8fbf8]"}`} key={item.id}>
                    <p className="text-xs font-black uppercase tracking-wide text-[#588368]">{item.sender_user_id === effectiveApproverID ? "Manager" : "Employee"} · {formatDate(item.created_at)}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#17231a]">{item.body}</p>
                  </div>
                ))}
                {messages.length === 0 ? <p className="rounded-xl bg-[#f8fbf8] px-4 py-5 text-center text-sm font-semibold text-[#647067]">No messages yet.</p> : null}
              </div>
              <form className="mt-4 grid gap-3" onSubmit={sendClarification}>
                <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setMessageBody(event.target.value)} placeholder="Ask for clarification or add a note" value={messageBody} />
                <button className="justify-self-end rounded-xl border border-[#dbe8e1] bg-white px-4 py-2 text-sm font-black text-[#588368]" disabled={!messageBody.trim()} type="submit">Send Message</button>
              </form>
            </section>

            <section className="grid gap-3 border-t border-[#edf1ef] pt-4">
              <textarea className="min-h-20 rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDecisionRemarks(event.target.value)} placeholder="Approval or rejection note" value={decisionRemarks} />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button className="rounded-xl border border-[#dbe8e1] bg-white px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setSelectedApproval(null)} type="button">Close</button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700" onClick={() => void reject(selectedApproval)} type="button">Reject</button>
                  <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => void approve(selectedApproval)} type="button">Approve</button>
                </div>
              </div>
            </section>
          </div>
        ) : <p className="rounded-xl bg-[#f8fbf8] px-4 py-6 text-center text-sm font-semibold text-[#647067]">Loading request...</p>}
      </HrmsModal>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-[#647067]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#121a14]">{value}</p>
    </div>
  );
}
