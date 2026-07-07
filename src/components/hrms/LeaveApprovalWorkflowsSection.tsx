"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Employee = { user_id: string; firstname: string; lastname?: string | null; employee_code?: string | null; role?: string | null };
type Workflow = { id: string; name: string; code: string; description?: string | null; is_default: boolean };
type WorkflowStep = { id: string; workflow_id: string; step_order: number; name: string; approver_type: string; approver_user_id?: string | null; approver_role?: string | null; decision_rule: string; required_approvals: number; auto_approve: boolean; sla_hours: number };

const approverTypes = [
  { value: "reporting_manager", label: "Reporting manager" },
  { value: "manager_manager", label: "Manager's manager" },
  { value: "hr_user", label: "HR user" },
  { value: "specific_user", label: "Specific user" },
  { value: "role", label: "Role fallback user" },
  { value: "applicant", label: "Applicant self approval" },
];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function employeeLabel(item?: Employee) {
  if (!item) return "-";
  return `${item.firstname} ${item.lastname || ""}`.trim() || item.employee_code || item.user_id;
}

export function LeaveApprovalWorkflowsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/tenants/${selectedTenantID}` : "";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [selectedWorkflowID, setSelectedWorkflowID] = useState("");
  const [workflowForm, setWorkflowForm] = useState({ name: "", code: "", description: "", is_default: true });
  const [stepForm, setStepForm] = useState({ step_order: "1", name: "Reporting manager approval", approver_type: "reporting_manager", approver_user_id: "", approver_role: "", decision_rule: "all", required_approvals: "1", auto_approve: false, sla_hours: "24" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadWorkflows = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const [workflowData, employeeData] = await Promise.all([apiRequest<Workflow[]>(`${basePath}/leave-approval-workflows`), apiRequest<Employee[]>(`${basePath}/employees`)]);
      setWorkflows(workflowData);
      setEmployees(employeeData);
      setSelectedWorkflowID((current) => current || workflowData.find((item) => item.is_default)?.id || workflowData[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load approval workflows.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad]);

  const loadSteps = useCallback(async () => {
    if (!canLoad || !selectedWorkflowID) {
      setSteps([]);
      return;
    }
    try {
      setSteps(await apiRequest<WorkflowStep[]>(`${basePath}/leave-approval-workflows/${selectedWorkflowID}/steps`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workflow steps.");
    }
  }, [basePath, canLoad, selectedWorkflowID]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkflows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkflows]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSteps(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSteps]);

  async function createWorkflow(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const item = await apiRequest<Workflow>(`${basePath}/leave-approval-workflows`, { method: "POST", body: { ...workflowForm, description: workflowForm.description || undefined } });
      setWorkflows((items) => [item, ...items.map((existing) => (item.is_default ? { ...existing, is_default: false } : existing))]);
      setSelectedWorkflowID(item.id);
      setWorkflowForm({ name: "", code: "", description: "", is_default: false });
      setMessage("Approval workflow created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create approval workflow.");
    }
  }

  async function createStep(event: FormEvent) {
    event.preventDefault();
    if (!selectedWorkflowID) return;
    setMessage("");
    setError("");
    try {
      const body = {
        ...stepForm,
        step_order: Number(stepForm.step_order || 1),
        required_approvals: Number(stepForm.required_approvals || 1),
        sla_hours: Number(stepForm.sla_hours || 0),
        approver_user_id: stepForm.approver_user_id || undefined,
        approver_role: stepForm.approver_role || undefined,
      };
      const item = await apiRequest<WorkflowStep>(`${basePath}/leave-approval-workflows/${selectedWorkflowID}/steps`, { method: "POST", body });
      setSteps((items) => [...items, item].sort((a, b) => a.step_order - b.step_order));
      setStepForm((current) => ({ ...current, step_order: String(Number(current.step_order || 1) + 1), name: "Next approval step" }));
      setMessage("Workflow step added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add workflow step.");
    }
  }

  async function deleteStep(stepID: string) {
    setMessage("");
    setError("");
    try {
      await apiRequest(`${basePath}/leave-approval-workflow-steps/${stepID}`, { method: "DELETE" });
      setSteps((items) => items.filter((item) => item.id !== stepID));
      setMessage("Workflow step removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove workflow step.");
    }
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <section className="mt-8 rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Approval Settings</p>
        <h2 className="mt-2 text-3xl font-bold text-[#111827]">Leave approval workflows</h2>
        {tenantsError ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{tenantsError}</p> : null}
        <select className="mt-5 h-12 w-full rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" disabled={tenantsLoading} onChange={(event) => setSelectedTenantID(event.target.value)} value={selectedTenantID}>
          <option value="">Select tenant to configure approvals</option>
          {sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}
        </select>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-6 rounded-3xl border border-[#dfe6e2] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Approval Settings</p>
          <h2 className="mt-2 text-3xl font-bold text-[#111827]">Configurable leave approvals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">Build sequence or parallel approval steps: reporting manager, manager&apos;s manager, HR user, specific user, role fallback, or applicant self approval.</p>
        </div>
        <button className="rounded-xl border border-[#dbe8e1] bg-white px-5 py-3 text-sm font-black text-[#588368]" disabled={loading} onClick={loadWorkflows} type="button">Refresh</button>
      </div>
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="grid gap-8">
        <form className="rounded-2xl border border-[#e2e8e4] bg-[#fbfdfb] p-5" onSubmit={createWorkflow}>
          <h3 className="text-xl font-black text-[#111827]">Workflow</h3>
          <div className="mt-4 grid gap-3">
            <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setWorkflowForm((current) => ({ ...current, name: e.target.value }))} placeholder="Workflow name" required value={workflowForm.name} />
            <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold uppercase outline-none focus:border-[#588368]" onChange={(e) => setWorkflowForm((current) => ({ ...current, code: e.target.value.toUpperCase().replace(/\s+/g, "_") }))} placeholder="DEFAULT_LEAVE_APPROVAL" required value={workflowForm.code} />
            <textarea className="min-h-24 rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setWorkflowForm((current) => ({ ...current, description: e.target.value }))} placeholder="Description" value={workflowForm.description} />
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe8e1] bg-white px-4 py-3 text-sm font-bold text-[#4b5563]"><input checked={workflowForm.is_default} onChange={(e) => setWorkflowForm((current) => ({ ...current, is_default: e.target.checked }))} type="checkbox" /> Set as default workflow</label>
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" type="submit">Create workflow</button>
          </div>
        </form>

        <div className="rounded-2xl border border-[#e2e8e4] bg-[#fbfdfb] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-xl font-black text-[#111827]">Approval chain</h3>
            <select className="h-11 rounded-xl border border-[#dbe8e1] bg-white px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setSelectedWorkflowID(e.target.value)} value={selectedWorkflowID}>
              <option value="">Select workflow</option>
              {workflows.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_default ? " (default)" : ""}</option>)}
            </select>
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-2" onSubmit={createStep}>
            <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, step_order: e.target.value }))} placeholder="Order" type="number" value={stepForm.step_order} />
            <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, name: e.target.value }))} placeholder="Step name" value={stepForm.name} />
            <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, approver_type: e.target.value }))} value={stepForm.approver_type}>
              {approverTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, approver_user_id: e.target.value }))} value={stepForm.approver_user_id}>
              <option value="">No specific user</option>
              {employees.map((item) => <option key={item.user_id} value={item.user_id}>{employeeLabel(item)}</option>)}
            </select>
            <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, approver_role: e.target.value }))} placeholder="Role key, optional" value={stepForm.approver_role} />
            <select className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, decision_rule: e.target.value }))} value={stepForm.decision_rule}>
              <option value="all">All approvers must approve</option>
              <option value="any">Any approver can approve</option>
            </select>
            <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, required_approvals: e.target.value }))} placeholder="Required approvals" type="number" value={stepForm.required_approvals} />
            <input className="h-12 rounded-xl border border-[#dbe8e1] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => setStepForm((current) => ({ ...current, sla_hours: e.target.value }))} placeholder="SLA hours" type="number" value={stepForm.sla_hours} />
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe8e1] bg-white px-4 py-3 text-sm font-bold text-[#4b5563]"><input checked={stepForm.auto_approve} onChange={(e) => setStepForm((current) => ({ ...current, auto_approve: e.target.checked }))} type="checkbox" /> Auto approve this step</label>
            <button className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white" disabled={!selectedWorkflowID} type="submit">Add step</button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white text-xs font-black uppercase tracking-wide text-[#6b7280]"><tr><th className="p-3">Order</th><th className="p-3">Step</th><th className="p-3">Approver</th><th className="p-3">Rule</th><th className="p-3">SLA</th><th className="p-3">Action</th></tr></thead>
              <tbody>{steps.map((item) => <tr className="border-t border-[#edf1ef]" key={item.id}><td className="p-3 font-black">{item.step_order}</td><td className="p-3 font-bold">{item.name}</td><td className="p-3 text-[#4b5563]">{approverTypes.find((type) => type.value === item.approver_type)?.label || item.approver_type}{item.approver_user_id ? ` · ${employeeLabel(employees.find((employee) => employee.user_id === item.approver_user_id))}` : ""}</td><td className="p-3">{item.decision_rule} / {item.required_approvals}</td><td className="p-3">{item.sla_hours ? `${item.sla_hours}h` : "-"}</td><td className="p-3"><button className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600" onClick={() => deleteStep(item.id)} type="button">Remove</button></td></tr>)}</tbody>
            </table>
          </div>
          {steps.length === 0 ? <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#6b7280]">No approval steps yet. Add reporting manager as step 1 for a standard manager approval flow.</p> : null}
        </div>
      </div>
    </section>
  );
}
