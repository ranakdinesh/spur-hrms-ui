"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Employee = { user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null };
type Approval = { id: string; leave_id: string; approver_id: string; status: string; remarks?: string | null; workflow_id?: string | null; workflow_step_id?: string | null; step_order: number; decision_rule: string; required_approvals: number; created_at: string };

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeLabel(item?: Employee) {
  if (!item) return "-";
  return `${item.firstname} ${item.lastname || ""}`.trim() || item.employee_code || item.user_id;
}

export function LeaveApprovalsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [approverID, setApproverID] = useState("");
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Employee[]>(`${basePath}/employees`);
      setEmployees(data);
      setApproverID((current) => current || data[0]?.user_id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load approvers.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad]);

  const loadApprovals = useCallback(async () => {
    if (!canLoad || !approverID) {
      setApprovals([]);
      return;
    }
    setError("");
    try {
      setApprovals(await apiRequest<Approval[]>(`${basePath}/leave-approvals?approver_id=${approverID}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending approvals.");
    }
  }, [approverID, basePath, canLoad]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEmployees(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEmployees]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadApprovals(), 0);
    return () => window.clearTimeout(timer);
  }, [loadApprovals]);

  async function approve(item: Approval) {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leave-approvals/${item.id}/approve`, { method: "POST", body: { approver_id: approverID, remarks: remarks[item.id] || undefined } });
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
      await apiRequest(`${basePath}/leave-approvals/${item.id}/reject`, { method: "POST", body: { approver_id: approverID, remarks: remarks[item.id] || "Rejected" } });
      setApprovals((items) => items.filter((approval) => approval.id !== item.id));
      setMessage("Leave request rejected and pending balance released.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject leave.");
    }
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Approvals</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Approval queue</h1>
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
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Leave Approvals</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Approval queue</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Review pending leave approvals generated from tenant approval workflows. Approval moves reserved paid leave into used balance; rejection releases pending balance.</p>
        </div>
        <button className="rounded-xl border border-[#dbe8e1] bg-white px-5 py-3 text-sm font-black text-[#588368]" disabled={loading} onClick={loadApprovals} type="button">Refresh</button>
      </div>
      {message ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-black text-[#111827]">Pending approvals</h2>
          <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setApproverID(e.target.value)} value={approverID}>
            <option value="">Select approver</option>
            {employees.map((item) => <option key={item.user_id} value={item.user_id}>{employeeLabel(item)}</option>)}
          </select>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr><th className="p-3">Leave</th><th className="p-3">Approver</th><th className="p-3">Step</th><th className="p-3">Rule</th><th className="p-3">Created</th><th className="p-3">Remarks</th><th className="p-3">Action</th></tr></thead>
            <tbody>
              {approvals.map((item) => (
                <tr className="border-t border-[#edf1ef]" key={item.id}>
                  <td className="p-3 font-bold text-[#111827]">{item.leave_id.slice(0, 8)}</td>
                  <td className="p-3">{employeeLabel(employees.find((employee) => employee.user_id === item.approver_id))}</td>
                  <td className="p-3">Step {item.step_order}</td>
                  <td className="p-3">{item.decision_rule} / {item.required_approvals}</td>
                  <td className="p-3 text-[#6b7280]">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="p-3"><input className="h-10 w-full rounded-lg border border-[#dbe8e1] px-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setRemarks((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="Approval note" value={remarks[item.id] || ""} /></td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-[#588368] px-4 py-2 text-xs font-black text-white" onClick={() => approve(item)} type="button">Approve</button>
                      <button className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-700" onClick={() => reject(item)} type="button">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {approvals.length === 0 ? <p className="mt-5 rounded-xl bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#6b7280]">No pending approvals for this approver.</p> : null}
      </div>
    </section>
  );
}
