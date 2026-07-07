"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name: string; worker_code?: string | null };
type AssetItem = { id: string; asset_code: string; asset_name: string; asset_type: string; category: string; serial_number?: string | null; vendor?: string | null; status: string; location_label?: string | null; custodian_worker_profile_id?: string | null; custodian_name?: string | null; custodian_code?: string | null; notes?: string | null };
type AccessCatalog = { id: string; access_code: string; access_name: string; access_type: string; system_name?: string | null; provisioning_method: string; requires_approval: boolean; default_for_onboarding: boolean; default_for_exit_revocation: boolean; status: string; notes?: string | null };
type Assignment = { id: string; asset_id: string; worker_profile_id: string; expected_return_on?: string | null; issued_on?: string | null; returned_on?: string | null; issue_condition: string; return_condition?: string | null; damage_status: string; recovery_amount: number; status: string; notes?: string | null; asset_code?: string | null; asset_name?: string | null; asset_type?: string | null; category?: string | null; worker_display_name?: string | null; worker_code?: string | null; exit_request_id?: string | null };
type AccessTask = { id: string; access_item_id: string; worker_profile_id: string; task_type: string; due_date?: string | null; completed_at?: string | null; external_reference?: string | null; status: string; notes?: string | null; access_code?: string | null; access_name?: string | null; access_type?: string | null; system_name?: string | null; worker_display_name?: string | null; worker_code?: string | null; exit_request_id?: string | null };
type EventRow = { id: string; source_type: string; action: string; from_status?: string | null; to_status?: string | null; remarks?: string | null; created_at: string };
type SummaryRow = { metric: string; metric_count: number };
type Tab = "assets" | "access" | "assignments" | "tasks" | "clearance" | "audit";
type Modal = "" | "asset" | "access" | "assignment" | "task" | "assetStatus" | "assignmentStatus" | "taskStatus";

const inputClass = "w-full rounded-xl border border-[#dbe8e1] bg-white px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]";
const assetStatuses = ["available", "reserved", "issued", "return_due", "returned", "maintenance", "damaged", "lost", "retired"];
const assignmentStatuses = ["requested", "approved", "issued", "return_due", "returned", "damaged", "lost", "cancelled"];
const accessStatuses = ["active", "inactive", "deprecated"];
const taskTypes = ["provision", "deprovision", "review", "change"];
const taskStatuses = ["requested", "approved", "provisioned", "revoked", "reviewed", "rejected", "cancelled", "blocked"];

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function datePayload(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function workerLabel(worker: Worker) {
  return `${worker.display_name}${worker.worker_code ? ` (${worker.worker_code})` : ""}`;
}

function badge(status: string) {
  if (["available", "active", "approved", "issued", "provisioned", "revoked", "reviewed", "returned"].includes(status)) return "bg-[#e7f6ed] text-[#237a45]";
  if (["damaged", "lost", "blocked", "rejected", "cancelled", "inactive", "deprecated"].includes(status)) return "bg-[#fee2e2] text-[#b91c1c]";
  if (["return_due", "requested", "reserved"].includes(status)) return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#eef4f1] text-[#456d58]";
}

function defaultAsset() {
  return { asset_code: "", asset_name: "", asset_type: "hardware", category: "laptop", serial_number: "", vendor: "", status: "available", location_label: "", custodian_worker_profile_id: "", notes: "" };
}

function defaultAccess() {
  return { access_code: "", access_name: "", access_type: "software", system_name: "", provisioning_method: "manual", requires_approval: true, default_for_onboarding: false, default_for_exit_revocation: true, status: "active", notes: "" };
}

function defaultAssignment(assetID = "", workerID = "") {
  return { asset_id: assetID, worker_profile_id: workerID, expected_return_on: "", issue_condition: "good", return_condition: "", damage_status: "none", recovery_amount: "0", status: "requested", notes: "", exit_request_id: "" };
}

function defaultTask(accessID = "", workerID = "") {
  return { access_item_id: accessID, worker_profile_id: workerID, task_type: "provision", due_date: "", external_reference: "", status: "requested", notes: "", exit_request_id: "" };
}

export function AssetAccessLifecycleSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Asset & Access" subtitle="Open a tenant to manage issue, return, clearance, and access tasks." />
        {tenantsError ? <Alert text={tenantsError} /> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => (
                <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.plan}</td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setTenant(row)} type="button">Open</button></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  }

  return <AssetAccessWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function AssetAccessWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("assets");
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [accessCatalog, setAccessCatalog] = useState<AccessCatalog[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<AccessTask[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<Modal>("");
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<AccessCatalog | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedTask, setSelectedTask] = useState<AccessTask | null>(null);
  const [assetForm, setAssetForm] = useState(defaultAsset());
  const [accessForm, setAccessForm] = useState(defaultAccess());
  const [assignmentForm, setAssignmentForm] = useState(defaultAssignment());
  const [taskForm, setTaskForm] = useState(defaultTask());
  const [statusForm, setStatusForm] = useState({ status: "available", remarks: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (status) query.set("status", status);
    const queryText = query.toString() ? `?${query.toString()}` : "";
    const [assetRows, accessRows, assignmentRows, taskRows, eventRows, summaryRows, workerRows] = await Promise.all([
      apiRequest<AssetItem[]>(`${basePath}/asset-items${queryText}`).catch(() => []),
      apiRequest<AccessCatalog[]>(`${basePath}/access-catalog${queryText}`).catch(() => []),
      apiRequest<Assignment[]>(`${basePath}/asset-assignments${queryText}`).catch(() => []),
      apiRequest<AccessTask[]>(`${basePath}/access-tasks${queryText}`).catch(() => []),
      apiRequest<EventRow[]>(`${basePath}/asset-access-events`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/asset-access-summary`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
    ]);
    setAssets(assetRows);
    setAccessCatalog(accessRows);
    setAssignments(assignmentRows);
    setTasks(taskRows);
    setEvents(eventRows);
    setSummary(summaryRows);
    setWorkers(workerRows);
    setAssignmentForm((current) => ({ ...current, asset_id: current.asset_id || assetRows[0]?.id || "", worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "" }));
    setTaskForm((current) => ({ ...current, access_item_id: current.access_item_id || accessRows[0]?.id || "", worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "" }));
  }, [basePath, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load asset and access data."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const map = new Map(summary.map((item) => [item.metric, item.metric_count]));
    return [
      ["Assets", map.get("assets_total") || assets.length],
      ["Issued", map.get("assets_issued") || assignments.filter((item) => ["issued", "return_due"].includes(item.status)).length],
      ["Due Return", map.get("assets_due_return") || assignments.filter((item) => item.status === "return_due").length],
      ["Open Access", map.get("open_access_tasks") || tasks.filter((item) => ["requested", "approved", "blocked"].includes(item.status)).length],
      ["Revocations", map.get("revocation_tasks") || tasks.filter((item) => item.task_type === "deprovision" && !["revoked", "cancelled", "rejected"].includes(item.status)).length],
    ] as Array<[string, number]>;
  }, [assets.length, assignments, summary, tasks]);

  function openAsset(item?: AssetItem) {
    setSelectedAsset(item || null);
    setAssetForm(item ? { asset_code: item.asset_code, asset_name: item.asset_name, asset_type: item.asset_type, category: item.category, serial_number: item.serial_number || "", vendor: item.vendor || "", status: item.status, location_label: item.location_label || "", custodian_worker_profile_id: item.custodian_worker_profile_id || "", notes: item.notes || "" } : defaultAsset());
    setModal("asset");
  }

  function openAccess(item?: AccessCatalog) {
    setSelectedAccess(item || null);
    setAccessForm(item ? { access_code: item.access_code, access_name: item.access_name, access_type: item.access_type, system_name: item.system_name || "", provisioning_method: item.provisioning_method, requires_approval: item.requires_approval, default_for_onboarding: item.default_for_onboarding, default_for_exit_revocation: item.default_for_exit_revocation, status: item.status, notes: item.notes || "" } : defaultAccess());
    setModal("access");
  }

  function openAssignment(item?: Assignment) {
    setSelectedAssignment(item || null);
    setAssignmentForm(item ? { asset_id: item.asset_id, worker_profile_id: item.worker_profile_id, expected_return_on: dateOnly(item.expected_return_on), issue_condition: item.issue_condition, return_condition: item.return_condition || "", damage_status: item.damage_status, recovery_amount: String(item.recovery_amount || 0), status: item.status, notes: item.notes || "", exit_request_id: item.exit_request_id || "" } : defaultAssignment(assets[0]?.id || "", workers[0]?.id || ""));
    setModal("assignment");
  }

  function openTask(item?: AccessTask, taskType?: string) {
    setSelectedTask(item || null);
    const form = item ? { access_item_id: item.access_item_id, worker_profile_id: item.worker_profile_id, task_type: item.task_type, due_date: dateOnly(item.due_date), external_reference: item.external_reference || "", status: item.status, notes: item.notes || "", exit_request_id: item.exit_request_id || "" } : defaultTask(accessCatalog[0]?.id || "", workers[0]?.id || "");
    setTaskForm(taskType ? { ...form, task_type: taskType } : form);
    setModal("task");
  }

  function openStatus(kind: Modal, statusValue: string) {
    setStatusForm({ status: statusValue, remarks: "" });
    setModal(kind);
  }

  async function saveAsset() {
    const body = { ...assetForm, serial_number: assetForm.serial_number || null, vendor: assetForm.vendor || null, location_label: assetForm.location_label || null, custodian_worker_profile_id: assetForm.custodian_worker_profile_id || null, notes: assetForm.notes || null };
    await apiRequest(`${basePath}/asset-items${selectedAsset ? `/${selectedAsset.id}` : ""}`, { method: selectedAsset ? "PUT" : "POST", body });
    setNotice("Asset saved."); closeModal(); await load();
  }

  async function saveAccess() {
    const body = { ...accessForm, system_name: accessForm.system_name || null, notes: accessForm.notes || null };
    await apiRequest(`${basePath}/access-catalog${selectedAccess ? `/${selectedAccess.id}` : ""}`, { method: selectedAccess ? "PUT" : "POST", body });
    setNotice("Access item saved."); closeModal(); await load();
  }

  async function saveAssignment() {
    const body = { ...assignmentForm, expected_return_on: datePayload(assignmentForm.expected_return_on), return_condition: assignmentForm.return_condition || null, recovery_amount: Number(assignmentForm.recovery_amount || 0), notes: assignmentForm.notes || null, exit_request_id: assignmentForm.exit_request_id || null };
    await apiRequest(`${basePath}/asset-assignments${selectedAssignment ? `/${selectedAssignment.id}` : ""}`, { method: selectedAssignment ? "PUT" : "POST", body });
    setNotice("Asset assignment saved."); closeModal(); await load();
  }

  async function saveTask() {
    const body = { ...taskForm, due_date: datePayload(taskForm.due_date), external_reference: taskForm.external_reference || null, notes: taskForm.notes || null, exit_request_id: taskForm.exit_request_id || null };
    await apiRequest(`${basePath}/access-tasks${selectedTask ? `/${selectedTask.id}` : ""}`, { method: selectedTask ? "PUT" : "POST", body });
    setNotice("Access task saved."); closeModal(); await load();
  }

  async function saveStatus() {
    if (modal === "assetStatus" && selectedAsset) await apiRequest(`${basePath}/asset-items/${selectedAsset.id}/status`, { method: "POST", body: statusForm });
    if (modal === "assignmentStatus" && selectedAssignment) await apiRequest(`${basePath}/asset-assignments/${selectedAssignment.id}/status`, { method: "POST", body: statusForm });
    if (modal === "taskStatus" && selectedTask) await apiRequest(`${basePath}/access-tasks/${selectedTask.id}/status`, { method: "POST", body: statusForm });
    setNotice("Status updated."); closeModal(); await load();
  }

  function closeModal() {
    setModal("");
    setSelectedAsset(null);
    setSelectedAccess(null);
    setSelectedAssignment(null);
    setSelectedTask(null);
    setError("");
  }

  const clearanceRows = useMemo(() => {
    const byWorker = new Map<string, { worker: string; assets: number; returns: number; access: number; revocations: number }>();
    for (const item of assignments) {
      const worker = item.worker_display_name || item.worker_code || item.worker_profile_id;
      const row = byWorker.get(item.worker_profile_id) || { worker, assets: 0, returns: 0, access: 0, revocations: 0 };
      row.assets += ["issued", "return_due", "damaged", "lost"].includes(item.status) ? 1 : 0;
      row.returns += ["return_due", "damaged", "lost"].includes(item.status) ? 1 : 0;
      byWorker.set(item.worker_profile_id, row);
    }
    for (const item of tasks) {
      const worker = item.worker_display_name || item.worker_code || item.worker_profile_id;
      const row = byWorker.get(item.worker_profile_id) || { worker, assets: 0, returns: 0, access: 0, revocations: 0 };
      row.access += ["requested", "approved", "blocked"].includes(item.status) ? 1 : 0;
      row.revocations += item.task_type === "deprovision" && !["revoked", "cancelled", "rejected"].includes(item.status) ? 1 : 0;
      byWorker.set(item.worker_profile_id, row);
    }
    return Array.from(byWorker.values());
  }, [assignments, tasks]);

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header onBack={onBack} title="Asset & Access" subtitle="Track assets, software access, onboarding issue tasks, and exit clearance." />
      {notice ? <Alert kind="success" text={notice} /> : null}
      {error ? <Alert text={error} /> : null}

      <section className="grid gap-3 md:grid-cols-5">
        {metrics.map(([name, count]) => <MetricCard count={count} key={name} name={name} />)}
      </section>

      <section className="rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["assets", "access", "assignments", "tasks", "clearance", "audit"] as Tab[]).map((item) => <button className={`rounded-xl px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#588368] text-white" : "bg-[#eef4f1] text-[#456d58]"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={inputClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} />
            <select className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All status</option>{[...new Set([...assetStatuses, ...assignmentStatuses, ...taskStatuses, ...accessStatuses])].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          </div>
        </div>
      </section>

      {tab === "assets" ? <WorkspacePanel actionLabel="New Asset" onAction={() => openAsset()} title="Asset Inventory"><AssetTable assets={assets} onEdit={openAsset} onStatus={(item) => { setSelectedAsset(item); openStatus("assetStatus", item.status); }} /></WorkspacePanel> : null}
      {tab === "access" ? <WorkspacePanel actionLabel="New Access" onAction={() => openAccess()} title="Access Catalog"><AccessTable items={accessCatalog} onEdit={openAccess} /></WorkspacePanel> : null}
      {tab === "assignments" ? <WorkspacePanel actionLabel="Issue Asset" onAction={() => openAssignment()} title="Asset Issue & Return"><AssignmentTable items={assignments} onEdit={openAssignment} onStatus={(item) => { setSelectedAssignment(item); openStatus("assignmentStatus", item.status); }} /></WorkspacePanel> : null}
      {tab === "tasks" ? <WorkspacePanel actionLabel="New Task" onAction={() => openTask()} title="Access Tasks"><TaskTable items={tasks} onEdit={openTask} onStatus={(item) => { setSelectedTask(item); openStatus("taskStatus", item.status); }} /></WorkspacePanel> : null}
      {tab === "clearance" ? <WorkspacePanel actionLabel="Revocation Task" onAction={() => openTask(undefined, "deprovision")} title="Clearance Board"><ClearanceTable rows={clearanceRows} /></WorkspacePanel> : null}
      {tab === "audit" ? <WorkspacePanel title="Audit Trail"><AuditTable events={events} /></WorkspacePanel> : null}

      <HrmsModal onClose={closeModal} open={modal === "asset"} title={selectedAsset ? "Edit Asset" : "New Asset"}><AssetForm form={assetForm} setForm={setAssetForm} workers={workers} onCancel={closeModal} onSave={saveAsset} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "access"} title={selectedAccess ? "Edit Access" : "New Access"}><AccessForm form={accessForm} setForm={setAccessForm} onCancel={closeModal} onSave={saveAccess} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "assignment"} title={selectedAssignment ? "Edit Assignment" : "Issue Asset"}><AssignmentForm assets={assets} form={assignmentForm} setForm={setAssignmentForm} workers={workers} onCancel={closeModal} onSave={saveAssignment} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={modal === "task"} title={selectedTask ? "Edit Access Task" : "New Access Task"}><TaskForm accessCatalog={accessCatalog} form={taskForm} setForm={setTaskForm} workers={workers} onCancel={closeModal} onSave={saveTask} /></HrmsModal>
      <HrmsModal onClose={closeModal} open={["assetStatus", "assignmentStatus", "taskStatus"].includes(modal)} title="Update Status"><StatusForm allowed={modal === "assetStatus" ? assetStatuses : modal === "assignmentStatus" ? assignmentStatuses : taskStatuses} form={statusForm} setForm={setStatusForm} onCancel={closeModal} onSave={saveStatus} /></HrmsModal>
    </main>
  );
}

function Header({ onBack, subtitle, title }: { onBack?: () => void; subtitle: string; title: string }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Lifecycle Controls</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">{subtitle}</p></div>{onBack ? <button className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm font-black text-[#456d58]" onClick={onBack} type="button">Back</button> : null}</div>;
}

function Alert({ kind = "error", text }: { kind?: "error" | "success"; text: string }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${kind === "success" ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]" : "border-[#fca5a5] bg-[#fff1f2] text-[#b91c1c]"}`}>{text}</div>;
}

function MetricCard({ count, name }: { count: number; name: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{name}</p><strong className="mt-2 block text-3xl font-black text-[#111827]">{count}</strong></div>;
}

function WorkspacePanel({ actionLabel, children, onAction, title }: { actionLabel?: string; children: ReactNode; onAction?: () => void; title: string }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#edf1ef] px-5 py-4"><h2 className="text-lg font-black text-[#111827]">{title}</h2>{actionLabel && onAction ? <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onAction} type="button">{actionLabel}</button> : null}</div><div className="overflow-x-auto">{children}</div></section>;
}

function AssetTable({ assets, onEdit, onStatus }: { assets: AssetItem[]; onEdit: (item: AssetItem) => void; onStatus: (item: AssetItem) => void }) {
  return <table className="w-full min-w-[920px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Asset</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Custodian</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{assets.map((item) => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{item.asset_name}</strong><span className="text-xs font-bold text-[#6b7280]">{item.asset_code}{item.serial_number ? ` - ${item.serial_number}` : ""}</span></td><td className="px-5 py-4 text-sm font-bold capitalize text-[#4b5563]">{label(item.category)}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{item.custodian_name || "-"}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{item.location_label || "-"}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${badge(item.status)}`}>{label(item.status)}</span></td><td className="px-5 py-4 text-right"><RowActions onEdit={() => onEdit(item)} onStatus={() => onStatus(item)} /></td></tr>)}</tbody></table>;
}

function AccessTable({ items, onEdit }: { items: AccessCatalog[]; onEdit: (item: AccessCatalog) => void }) {
  return <table className="w-full min-w-[820px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Access</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Provisioning</th><th className="px-5 py-4">Defaults</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{item.access_name}</strong><span className="text-xs font-bold text-[#6b7280]">{item.access_code}{item.system_name ? ` - ${item.system_name}` : ""}</span></td><td className="px-5 py-4 text-sm font-bold capitalize text-[#4b5563]">{label(item.access_type)}</td><td className="px-5 py-4 text-sm font-bold capitalize text-[#4b5563]">{label(item.provisioning_method)}</td><td className="px-5 py-4 text-xs font-black text-[#6b7280]">{item.default_for_onboarding ? "Onboarding " : ""}{item.default_for_exit_revocation ? "Exit revocation" : ""}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${badge(item.status)}`}>{label(item.status)}</span></td><td className="px-5 py-4 text-right"><button className="rounded-xl border border-[#dbe8e1] px-3 py-2 text-xs font-black text-[#456d58]" onClick={() => onEdit(item)} type="button">Edit</button></td></tr>)}</tbody></table>;
}

function AssignmentTable({ items, onEdit, onStatus }: { items: Assignment[]; onEdit: (item: Assignment) => void; onStatus: (item: Assignment) => void }) {
  return <table className="w-full min-w-[980px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Asset</th><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Due</th><th className="px-5 py-4">Damage</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{item.asset_name || item.asset_id}</strong><span className="text-xs font-bold text-[#6b7280]">{item.asset_code || "-"}</span></td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{item.worker_display_name || item.worker_code || "-"}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{dateOnly(item.expected_return_on) || "-"}</td><td className="px-5 py-4 text-sm font-bold capitalize text-[#4b5563]">{label(item.damage_status)}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${badge(item.status)}`}>{label(item.status)}</span></td><td className="px-5 py-4 text-right"><RowActions onEdit={() => onEdit(item)} onStatus={() => onStatus(item)} /></td></tr>)}</tbody></table>;
}

function TaskTable({ items, onEdit, onStatus }: { items: AccessTask[]; onEdit: (item: AccessTask) => void; onStatus: (item: AccessTask) => void }) {
  return <table className="w-full min-w-[980px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Access</th><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Task</th><th className="px-5 py-4">Due</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{item.access_name || item.access_item_id}</strong><span className="text-xs font-bold text-[#6b7280]">{item.access_code || item.system_name || "-"}</span></td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{item.worker_display_name || item.worker_code || "-"}</td><td className="px-5 py-4 text-sm font-bold capitalize text-[#4b5563]">{label(item.task_type)}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{dateOnly(item.due_date) || "-"}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${badge(item.status)}`}>{label(item.status)}</span></td><td className="px-5 py-4 text-right"><RowActions onEdit={() => onEdit(item)} onStatus={() => onStatus(item)} /></td></tr>)}</tbody></table>;
}

function ClearanceTable({ rows }: { rows: Array<{ worker: string; assets: number; returns: number; access: number; revocations: number }> }) {
  return <table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Worker</th><th className="px-5 py-4">Issued Assets</th><th className="px-5 py-4">Return Exceptions</th><th className="px-5 py-4">Open Access</th><th className="px-5 py-4">Revocations</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.map((row) => <tr key={row.worker}><td className="px-5 py-4 text-sm font-black text-[#111827]">{row.worker}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{row.assets}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{row.returns}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{row.access}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{row.revocations}</td></tr>)}</tbody></table>;
}

function AuditTable({ events }: { events: EventRow[] }) {
  return <table className="w-full min-w-[820px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Source</th><th className="px-5 py-4">Action</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Remarks</th><th className="px-5 py-4">When</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{events.map((event) => <tr key={event.id}><td className="px-5 py-4 text-sm font-black capitalize text-[#111827]">{label(event.source_type)}</td><td className="px-5 py-4 text-sm font-bold capitalize text-[#4b5563]">{label(event.action)}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{label(event.from_status)} {"->"} {label(event.to_status)}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{event.remarks || "-"}</td><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{new Date(event.created_at).toLocaleString()}</td></tr>)}</tbody></table>;
}

function RowActions({ onEdit, onStatus }: { onEdit: () => void; onStatus: () => void }) {
  return <div className="flex justify-end gap-2"><button className="rounded-xl border border-[#dbe8e1] px-3 py-2 text-xs font-black text-[#456d58]" onClick={onEdit} type="button">Edit</button><button className="rounded-xl border border-[#dbe8e1] px-3 py-2 text-xs font-black text-[#456d58]" onClick={onStatus} type="button">Status</button></div>;
}

function AssetForm({ form, onCancel, onSave, setForm, workers }: { form: ReturnType<typeof defaultAsset>; onCancel: () => void; onSave: () => void; setForm: (value: ReturnType<typeof defaultAsset>) => void; workers: Worker[] }) {
  return <FormShell onCancel={onCancel} onSave={onSave}><TextField label="Code" value={form.asset_code} onChange={(value) => setForm({ ...form, asset_code: value })} /><TextField label="Name" value={form.asset_name} onChange={(value) => setForm({ ...form, asset_name: value })} /><TextField label="Type" value={form.asset_type} onChange={(value) => setForm({ ...form, asset_type: value })} /><TextField label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} /><TextField label="Serial" value={form.serial_number} onChange={(value) => setForm({ ...form, serial_number: value })} /><TextField label="Vendor" value={form.vendor} onChange={(value) => setForm({ ...form, vendor: value })} /><SelectField label="Status" value={form.status} options={assetStatuses} onChange={(value) => setForm({ ...form, status: value })} /><SelectField label="Custodian" value={form.custodian_worker_profile_id} options={workers.map((item) => ({ value: item.id, label: workerLabel(item) }))} includeBlank onChange={(value) => setForm({ ...form, custodian_worker_profile_id: value })} /><TextField label="Location" value={form.location_label} onChange={(value) => setForm({ ...form, location_label: value })} /><TextArea label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} /></FormShell>;
}

function AccessForm({ form, onCancel, onSave, setForm }: { form: ReturnType<typeof defaultAccess>; onCancel: () => void; onSave: () => void; setForm: (value: ReturnType<typeof defaultAccess>) => void }) {
  return <FormShell onCancel={onCancel} onSave={onSave}><TextField label="Code" value={form.access_code} onChange={(value) => setForm({ ...form, access_code: value })} /><TextField label="Name" value={form.access_name} onChange={(value) => setForm({ ...form, access_name: value })} /><TextField label="Type" value={form.access_type} onChange={(value) => setForm({ ...form, access_type: value })} /><TextField label="System" value={form.system_name} onChange={(value) => setForm({ ...form, system_name: value })} /><TextField label="Provisioning" value={form.provisioning_method} onChange={(value) => setForm({ ...form, provisioning_method: value })} /><SelectField label="Status" value={form.status} options={accessStatuses} onChange={(value) => setForm({ ...form, status: value })} /><CheckField label="Approval required" checked={form.requires_approval} onChange={(value) => setForm({ ...form, requires_approval: value })} /><CheckField label="Onboarding default" checked={form.default_for_onboarding} onChange={(value) => setForm({ ...form, default_for_onboarding: value })} /><CheckField label="Exit revocation default" checked={form.default_for_exit_revocation} onChange={(value) => setForm({ ...form, default_for_exit_revocation: value })} /><TextArea label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} /></FormShell>;
}

function AssignmentForm({ assets, form, onCancel, onSave, setForm, workers }: { assets: AssetItem[]; form: ReturnType<typeof defaultAssignment>; onCancel: () => void; onSave: () => void; setForm: (value: ReturnType<typeof defaultAssignment>) => void; workers: Worker[] }) {
  return <FormShell onCancel={onCancel} onSave={onSave}><SelectField label="Asset" value={form.asset_id} options={assets.map((item) => ({ value: item.id, label: `${item.asset_name} (${item.asset_code})` }))} onChange={(value) => setForm({ ...form, asset_id: value })} /><SelectField label="Worker" value={form.worker_profile_id} options={workers.map((item) => ({ value: item.id, label: workerLabel(item) }))} onChange={(value) => setForm({ ...form, worker_profile_id: value })} /><TextField label="Expected Return" type="date" value={form.expected_return_on} onChange={(value) => setForm({ ...form, expected_return_on: value })} /><TextField label="Issue Condition" value={form.issue_condition} onChange={(value) => setForm({ ...form, issue_condition: value })} /><TextField label="Return Condition" value={form.return_condition} onChange={(value) => setForm({ ...form, return_condition: value })} /><TextField label="Damage" value={form.damage_status} onChange={(value) => setForm({ ...form, damage_status: value })} /><TextField label="Recovery" type="number" value={form.recovery_amount} onChange={(value) => setForm({ ...form, recovery_amount: value })} /><SelectField label="Status" value={form.status} options={assignmentStatuses} onChange={(value) => setForm({ ...form, status: value })} /><TextArea label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} /></FormShell>;
}

function TaskForm({ accessCatalog, form, onCancel, onSave, setForm, workers }: { accessCatalog: AccessCatalog[]; form: ReturnType<typeof defaultTask>; onCancel: () => void; onSave: () => void; setForm: (value: ReturnType<typeof defaultTask>) => void; workers: Worker[] }) {
  return <FormShell onCancel={onCancel} onSave={onSave}><SelectField label="Access" value={form.access_item_id} options={accessCatalog.map((item) => ({ value: item.id, label: `${item.access_name} (${item.access_code})` }))} onChange={(value) => setForm({ ...form, access_item_id: value })} /><SelectField label="Worker" value={form.worker_profile_id} options={workers.map((item) => ({ value: item.id, label: workerLabel(item) }))} onChange={(value) => setForm({ ...form, worker_profile_id: value })} /><SelectField label="Task" value={form.task_type} options={taskTypes} onChange={(value) => setForm({ ...form, task_type: value })} /><TextField label="Due Date" type="date" value={form.due_date} onChange={(value) => setForm({ ...form, due_date: value })} /><TextField label="Reference" value={form.external_reference} onChange={(value) => setForm({ ...form, external_reference: value })} /><SelectField label="Status" value={form.status} options={taskStatuses} onChange={(value) => setForm({ ...form, status: value })} /><TextArea label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} /></FormShell>;
}

function StatusForm({ allowed, form, onCancel, onSave, setForm }: { allowed: string[]; form: { status: string; remarks: string }; onCancel: () => void; onSave: () => void; setForm: (value: { status: string; remarks: string }) => void }) {
  return <FormShell onCancel={onCancel} onSave={onSave}><SelectField label="Status" value={form.status} options={allowed} onChange={(value) => setForm({ ...form, status: value })} /><TextArea label="Remarks" value={form.remarks} onChange={(value) => setForm({ ...form, remarks: value })} /></FormShell>;
}

function FormShell({ children, onCancel, onSave }: { children: ReactNode; onCancel: () => void; onSave: () => void }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2">{children}</div><div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5"><button className="rounded-xl border border-[#dbe8e1] px-4 py-3 text-sm font-black text-[#456d58]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onSave} type="button">Save</button></div></div>;
}

function TextField({ label: fieldLabel, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}<input className={`${inputClass} mt-2`} onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function TextArea({ label: fieldLabel, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="md:col-span-2 text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}<textarea className={`${inputClass} mt-2 min-h-[90px]`} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function SelectField({ includeBlank, label: fieldLabel, onChange, options, value }: { includeBlank?: boolean; label: string; onChange: (value: string) => void; options: Array<string | { value: string; label: string }>; value: string }) {
  return <label className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}<select className={`${inputClass} mt-2`} onChange={(event) => onChange(event.target.value)} value={value}>{includeBlank ? <option value="">None</option> : null}{options.map((option) => typeof option === "string" ? <option key={option} value={option}>{label(option)}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function CheckField({ checked, label: fieldLabel, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-xl border border-[#dbe8e1] px-3 py-3 text-sm font-black text-[#456d58]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{fieldLabel}</label>;
}
