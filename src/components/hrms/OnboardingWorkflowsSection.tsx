"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Workflow = { id: string; name: string; description?: string | null; is_default: boolean; is_active: boolean; tasks?: Task[] };
type Task = { id: string; workflow_id: string; title: string; description?: string | null; due_days: number; is_required: boolean; sort_order: number };
type Assignment = { id: string; workflow_id: string; workflow_name?: string | null; name: string; job_posting_id?: string | null; job_posting_title?: string | null; job_position_id?: string | null; job_position_title?: string | null; department_id?: string | null; department_name?: string | null; employment_type_id?: string | null; employment_type_name?: string | null; priority: number };
type Option = { id: string; name?: string | null; title?: string | null; code?: string | null };
type Page<T> = { items: T[] };

const emptyWorkflow = { name: "", description: "", is_default: false, is_active: true };
const emptyTask = { workflow_id: "", title: "", description: "", due_days: "0", is_required: true, sort_order: "0" };
const emptyAssignment = { workflow_id: "", name: "", job_posting_id: "", job_position_id: "", department_id: "", employment_type_id: "", priority: "100" };

function optionLabel(item: Option) {
  return item.name || item.title || item.code || item.id;
}

export function OnboardingWorkflowsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Onboarding</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Workflow Templates</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to configure candidate onboarding workflows, task steps, and assignment rules.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Workflows</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <WorkflowManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function WorkflowManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [jobPostings, setJobPostings] = useState<Option[]>([]);
  const [jobPositions, setJobPositions] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<Option[]>([]);
  const [workflowForm, setWorkflowForm] = useState(emptyWorkflow);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignment);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";

  const load = useCallback(async () => {
    const [workflowRows, assignmentRows, postingPage, positionPage, deptRows, typeRows] = await Promise.all([
      apiRequest<Workflow[]>(`${basePath}/onboarding-workflows`),
      apiRequest<Assignment[]>(`${basePath}/onboarding-workflow-assignments`),
      apiRequest<Page<Option>>(`${basePath}/job-postings?limit=200`).catch(() => ({ items: [] })),
      apiRequest<Page<Option>>(`${basePath}/job-positions?limit=200`).catch(() => ({ items: [] })),
      apiRequest<Option[]>(`${basePath}/departments`).catch(() => []),
      apiRequest<Option[]>(`${basePath}/employment-types`).catch(() => []),
    ]);
    setWorkflows(workflowRows);
    setAssignments(assignmentRows);
    setJobPostings(postingPage.items || []);
    setJobPositions(positionPage.items || []);
    setDepartments(deptRows);
    setEmploymentTypes(typeRows);
    if (!selected && workflowRows.length) setSelected(workflowRows[0]);
  }, [basePath, selected]);

  useEffect(() => { const timer = window.setTimeout(() => { void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load workflows.")); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function saveWorkflow() {
    setError(""); setNotice("");
    try {
      const saved = await apiRequest<Workflow>(`${basePath}/onboarding-workflows`, { method: "POST", body: workflowForm });
      setWorkflowForm(emptyWorkflow);
      setSelected(saved);
      setNotice("Workflow saved.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save workflow."); }
  }

  async function saveTask() {
    setError(""); setNotice("");
    try {
      const workflowID = taskForm.workflow_id || selected?.id || "";
      await apiRequest<Task>(`${basePath}/onboarding-workflows/${workflowID}/tasks`, { method: "POST", body: { title: taskForm.title, description: taskForm.description || null, due_days: Number(taskForm.due_days), is_required: taskForm.is_required, sort_order: Number(taskForm.sort_order) } });
      setTaskForm({ ...emptyTask, workflow_id: workflowID });
      setNotice("Task added.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save task."); }
  }

  async function saveAssignment() {
    setError(""); setNotice("");
    try {
      await apiRequest<Assignment>(`${basePath}/onboarding-workflow-assignments`, { method: "POST", body: { workflow_id: assignmentForm.workflow_id, name: assignmentForm.name, job_posting_id: assignmentForm.job_posting_id || null, job_position_id: assignmentForm.job_position_id || null, department_id: assignmentForm.department_id || null, employment_type_id: assignmentForm.employment_type_id || null, priority: Number(assignmentForm.priority) } });
      setAssignmentForm(emptyAssignment);
      setNotice("Assignment template saved.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save assignment."); }
  }

  async function deleteWorkflow(id: string) {
    await apiRequest<void>(`${basePath}/onboarding-workflows/${id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  async function deleteTask(id: string) {
    await apiRequest<void>(`${basePath}/onboarding-tasks/${id}`, { method: "DELETE" });
    await load();
  }

  async function deleteAssignment(id: string) {
    await apiRequest<void>(`${basePath}/onboarding-workflow-assignments/${id}`, { method: "DELETE" });
    await load();
  }

  const taskCount = workflows.reduce((sum, item) => sum + (item.tasks?.length || 0), 0);
  const selectedTasks = workflows.find((item) => item.id === selected?.id)?.tasks || selected?.tasks || [];

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Onboarding</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Workflow Templates` : "Workflow Templates"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Build reusable candidate onboarding workflows, task checklists, and assignment templates for roles, departments, and job postings.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{[{ label: "Workflows", value: workflows.length }, { label: "Tasks", value: taskCount }, { label: "Assignments", value: assignments.length }, { label: "Default", value: workflows.find((item) => item.is_default)?.name || "-" }].map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.label}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item.label}</p><strong className="mt-3 block text-2xl text-[#111827]">{item.value}</strong></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <section className="grid gap-4 lg:grid-cols-2">{workflows.map((workflow) => <article className={`rounded-2xl border bg-white p-5 shadow-sm ${selected?.id === workflow.id ? "border-[#588368]" : "border-[#edf1ef]"}`} key={workflow.id}><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black text-[#111827]">{workflow.name}</h2><p className="mt-2 text-sm font-semibold text-[#6b7280]">{workflow.description || "No description"}</p></div><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => { setSelected(workflow); setTaskForm({ ...emptyTask, workflow_id: workflow.id }); }} type="button">Open</button></div><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{workflow.tasks?.length || 0} tasks</span>{workflow.is_default ? <span className="rounded-full bg-[#e0f2fe] px-3 py-1 text-xs font-black text-[#0369a1]">Default</span> : null}{workflow.is_active ? <span className="rounded-full bg-[#e7f6ed] px-3 py-1 text-xs font-black text-[#237a45]">Active</span> : <span className="rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-black text-[#b91c1c]">Inactive</span>}</div></article>)}</section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">{selected?.name || "Tasks"}</h2>{selected ? <button className="rounded-lg border border-[#fee2e2] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => void deleteWorkflow(selected.id)} type="button">Delete workflow</button> : null}</div><div className="mt-4 divide-y divide-[#edf1ef]">{selectedTasks.length === 0 ? <p className="py-6 text-sm font-semibold text-[#6b7280]">No tasks yet.</p> : selectedTasks.map((task) => <div className="flex items-start justify-between gap-3 py-4" key={task.id}><div><strong className="text-sm text-[#111827]">{task.sort_order}. {task.title}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">Due in {task.due_days} days - {task.is_required ? "Required" : "Optional"}</p>{task.description ? <p className="mt-2 text-sm text-[#4b5563]">{task.description}</p> : null}</div><button className="rounded-lg border border-[#fee2e2] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => void deleteTask(task.id)} type="button">Delete</button></div>)}</div></section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Assignment Templates</h2><div className="mt-4 divide-y divide-[#edf1ef]">{assignments.length === 0 ? <p className="py-6 text-sm font-semibold text-[#6b7280]">No assignment templates yet.</p> : assignments.map((assignment) => <div className="flex items-start justify-between gap-3 py-4" key={assignment.id}><div><strong className="text-sm text-[#111827]">{assignment.name}</strong><p className="mt-1 text-xs font-semibold text-[#6b7280]">{assignment.workflow_name || "Workflow"} - priority {assignment.priority}</p><p className="mt-2 text-sm text-[#4b5563]">{[assignment.job_posting_title, assignment.job_position_title, assignment.department_name, assignment.employment_type_name].filter(Boolean).join(" / ") || "Fallback assignment"}</p></div><button className="rounded-lg border border-[#fee2e2] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => void deleteAssignment(assignment.id)} type="button">Delete</button></div>)}</div></section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">New Workflow</h2><div className="mt-5 grid gap-3"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })} placeholder="Workflow name" value={workflowForm.name} /><textarea className="min-h-[80px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })} placeholder="Description" value={workflowForm.description} /><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={workflowForm.is_default} onChange={(e) => setWorkflowForm({ ...workflowForm, is_default: e.target.checked })} type="checkbox" /> Default workflow</label><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={workflowForm.is_active} onChange={(e) => setWorkflowForm({ ...workflowForm, is_active: e.target.checked })} type="checkbox" /> Active</label><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!workflowForm.name.trim()} onClick={() => void saveWorkflow()} type="button">Save Workflow</button></div></section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Add Task</h2><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTaskForm({ ...taskForm, workflow_id: e.target.value })} value={taskForm.workflow_id || selected?.id || ""}><option value="">Select workflow</option>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" value={taskForm.title} /><textarea className="min-h-[70px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Instructions" value={taskForm.description} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTaskForm({ ...taskForm, due_days: e.target.value })} placeholder="Due days" type="number" value={taskForm.due_days} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setTaskForm({ ...taskForm, sort_order: e.target.value })} placeholder="Sort" type="number" value={taskForm.sort_order} /></div><label className="flex items-center gap-2 text-sm font-bold text-[#374151]"><input checked={taskForm.is_required} onChange={(e) => setTaskForm({ ...taskForm, is_required: e.target.checked })} type="checkbox" /> Required</label><button className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!taskForm.title.trim() || !(taskForm.workflow_id || selected?.id)} onClick={() => void saveTask()} type="button">Add Task</button></div></section>
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Assignment Rule</h2><div className="mt-5 grid gap-3"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setAssignmentForm({ ...assignmentForm, name: e.target.value })} placeholder="Rule name" value={assignmentForm.name} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setAssignmentForm({ ...assignmentForm, workflow_id: e.target.value })} value={assignmentForm.workflow_id}><option value="">Select workflow</option>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setAssignmentForm({ ...assignmentForm, job_posting_id: e.target.value })} value={assignmentForm.job_posting_id}><option value="">Any job posting</option>{jobPostings.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setAssignmentForm({ ...assignmentForm, job_position_id: e.target.value })} value={assignmentForm.job_position_id}><option value="">Any job position</option>{jobPositions.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setAssignmentForm({ ...assignmentForm, department_id: e.target.value })} value={assignmentForm.department_id}><option value="">Any department</option>{departments.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setAssignmentForm({ ...assignmentForm, employment_type_id: e.target.value })} value={assignmentForm.employment_type_id}><option value="">Any type</option>{employmentTypes.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></div><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setAssignmentForm({ ...assignmentForm, priority: e.target.value })} placeholder="Priority" type="number" value={assignmentForm.priority} /><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151] disabled:opacity-60" disabled={!assignmentForm.name.trim() || !assignmentForm.workflow_id} onClick={() => void saveAssignment()} type="button">Save Assignment</button></div></section>
        </aside>
      </section>
    </main>
  );
}
