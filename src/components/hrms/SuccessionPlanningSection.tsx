"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name: string; worker_code?: string | null };
type Department = { id: string; name: string };
type Designation = { id: string; name: string };
type Course = { id: string; title: string };
type Path = { id: string; title: string };
type Cycle = { id: string; code: string; name: string; status: string; starts_on?: string | null; ends_on?: string | null; confidentiality_level: string };
type CriticalRole = { id: string; cycle_id?: string | null; code: string; title: string; department_id?: string | null; designation_id?: string | null; incumbent_worker_profile_id?: string | null; emergency_cover_worker_profile_id?: string | null; criticality: string; impact_level: string; vacancy_risk: string; attrition_risk: string; readiness_target: string; successor_required_count: number; role_summary?: string | null; status: string; department_name?: string | null; designation_name?: string | null; incumbent_name?: string | null; incumbent_code?: string | null; emergency_cover_name?: string | null; emergency_cover_code?: string | null; successor_count?: number; ready_now_count?: number };
type Nomination = { id: string; critical_role_id: string; worker_profile_id: string; readiness_level: string; readiness_months: number; potential_rating?: string | null; performance_rating?: string | null; retention_risk: string; mobility_preference?: string | null; nomination_status: string; development_notes?: string | null; worker_display_name?: string | null; worker_code?: string | null; critical_role_title?: string | null };
type Action = { id: string; nomination_id?: string | null; critical_role_id?: string | null; worker_profile_id: string; action_type: string; title: string; learning_course_id?: string | null; learning_path_id?: string | null; owner_user_id?: string | null; due_date?: string | null; status: string; notes?: string | null; worker_display_name?: string | null; worker_code?: string | null; critical_role_title?: string | null; learning_course_title?: string | null; learning_path_title?: string | null };
type EventRow = { id: string; source_type: string; action: string; from_status?: string | null; to_status?: string | null; remarks?: string | null; created_at: string };
type SummaryRow = { metric: string; metric_count: number };
type Tab = "roles" | "cycles" | "successors" | "actions" | "heatmap" | "audit";
type Modal = "" | "cycle" | "role" | "nomination" | "action" | "cycleStatus" | "roleStatus" | "nominationStatus" | "actionStatus";

const inputClass = "w-full rounded-xl border border-[#dbe8e1] bg-white px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#588368]";
const cycleStatuses = ["draft", "active", "review", "closed", "archived", "cancelled"];
const roleStatuses = ["open", "covered", "at_risk", "closed", "archived"];
const riskLevels = ["low", "medium", "high", "critical"];
const readinessLevels = ["ready_now", "ready_soon", "ready_later", "emergency_cover"];
const nominationStatuses = ["draft", "nominated", "reviewed", "approved", "rejected", "withdrawn"];
const actionStatuses = ["open", "in_progress", "completed", "overdue", "cancelled"];

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function datePayload(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function workerName(worker: Worker) {
  return `${worker.display_name}${worker.worker_code ? ` (${worker.worker_code})` : ""}`;
}

function defaultCycle() {
  return { code: "", name: "", status: "draft", starts_on: "", ends_on: "", confidentiality_level: "hr_only", notes: "" };
}

function defaultRole(cycleID = "") {
  return { cycle_id: cycleID, code: "", title: "", department_id: "", designation_id: "", incumbent_worker_profile_id: "", emergency_cover_worker_profile_id: "", criticality: "high", impact_level: "high", vacancy_risk: "medium", attrition_risk: "medium", readiness_target: "ready_soon", successor_required_count: "2", role_summary: "", status: "open" };
}

function defaultNomination(roleID = "", workerID = "") {
  return { critical_role_id: roleID, worker_profile_id: workerID, readiness_level: "ready_soon", readiness_months: "6", potential_rating: "", performance_rating: "", retention_risk: "medium", mobility_preference: "", nomination_status: "nominated", development_notes: "" };
}

function defaultAction(roleID = "", workerID = "") {
  return { nomination_id: "", critical_role_id: roleID, worker_profile_id: workerID, action_type: "development", title: "", learning_course_id: "", learning_path_id: "", owner_user_id: "", due_date: "", status: "open", notes: "" };
}

export function SuccessionPlanningSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Succession Planning" subtitle="Open a tenant to review critical-role coverage and successor readiness." />
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

  return <SuccessionWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function SuccessionWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("roles");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [roles, setRoles] = useState<CriticalRole[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [cycleID, setCycleID] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>("");
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [selectedRole, setSelectedRole] = useState<CriticalRole | null>(null);
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [cycleForm, setCycleForm] = useState(defaultCycle());
  const [roleForm, setRoleForm] = useState(defaultRole());
  const [nominationForm, setNominationForm] = useState(defaultNomination());
  const [actionForm, setActionForm] = useState(defaultAction());
  const [statusForm, setStatusForm] = useState({ status: "open", remarks: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const searchQuery = new URLSearchParams();
    if (search) searchQuery.set("search", search);
    const query = searchQuery.toString() ? `?${searchQuery.toString()}` : "";
    const roleQuery = new URLSearchParams();
    if (cycleID) roleQuery.set("cycle_id", cycleID);
    if (search) roleQuery.set("search", search);
    const roleQueryText = roleQuery.toString() ? `?${roleQuery.toString()}` : "";
    const [cycleRows, roleRows, nominationRows, actionRows, eventRows, summaryRows, workerRows, departmentRows, designationRows, courseRows, pathRows] = await Promise.all([
      apiRequest<Cycle[]>(`${basePath}/succession-review-cycles${query}`).catch(() => []),
      apiRequest<CriticalRole[]>(`${basePath}/succession-critical-roles${roleQueryText}`).catch(() => []),
      apiRequest<Nomination[]>(`${basePath}/succession-successors`).catch(() => []),
      apiRequest<Action[]>(`${basePath}/succession-development-actions`).catch(() => []),
      apiRequest<EventRow[]>(`${basePath}/succession-events`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/succession-summary`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<Department[]>(`${basePath}/departments`).catch(() => []),
      apiRequest<Designation[]>(`${basePath}/designations`).catch(() => []),
      apiRequest<Course[]>(`${basePath}/learning-courses`).catch(() => []),
      apiRequest<Path[]>(`${basePath}/learning-paths`).catch(() => []),
    ]);
    const activeCycle = cycleID || cycleRows[0]?.id || "";
    setCycles(cycleRows);
    setRoles(roleRows);
    setNominations(nominationRows);
    setActions(actionRows);
    setEvents(eventRows);
    setSummary(summaryRows);
    setWorkers(workerRows);
    setDepartments(departmentRows);
    setDesignations(designationRows);
    setCourses(courseRows);
    setPaths(pathRows);
    setCycleID(activeCycle);
    setRoleForm((current) => ({ ...current, cycle_id: current.cycle_id || activeCycle }));
    setNominationForm((current) => ({ ...current, critical_role_id: current.critical_role_id || roleRows[0]?.id || "", worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "" }));
    setActionForm((current) => ({ ...current, critical_role_id: current.critical_role_id || roleRows[0]?.id || "", worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "" }));
  }, [basePath, cycleID, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load succession planning."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const map = new Map(summary.map((item) => [item.metric, item.metric_count]));
    return [
      ["Critical Roles", map.get("critical_roles") || roles.length],
      ["At Risk", map.get("at_risk_roles") || roles.filter((item) => item.status === "at_risk" || item.vacancy_risk === "high" || item.vacancy_risk === "critical").length],
      ["Ready Now", map.get("ready_now_successors") || nominations.filter((item) => item.readiness_level === "ready_now").length],
      ["No Successor", map.get("roles_without_successor") || roles.filter((item) => !item.successor_count).length],
    ];
  }, [nominations, roles, summary]);

  function openCycle(item?: Cycle) {
    setSelectedCycle(item || null);
    setCycleForm(item ? { code: item.code, name: item.name, status: item.status, starts_on: dateOnly(item.starts_on), ends_on: dateOnly(item.ends_on), confidentiality_level: item.confidentiality_level, notes: "" } : defaultCycle());
    setModal("cycle");
  }

  function openRole(item?: CriticalRole) {
    setSelectedRole(item || null);
    setRoleForm(item ? { cycle_id: item.cycle_id || "", code: item.code, title: item.title, department_id: item.department_id || "", designation_id: item.designation_id || "", incumbent_worker_profile_id: item.incumbent_worker_profile_id || "", emergency_cover_worker_profile_id: item.emergency_cover_worker_profile_id || "", criticality: item.criticality, impact_level: item.impact_level, vacancy_risk: item.vacancy_risk, attrition_risk: item.attrition_risk, readiness_target: item.readiness_target, successor_required_count: String(item.successor_required_count), role_summary: item.role_summary || "", status: item.status } : defaultRole(cycleID));
    setModal("role");
  }

  function openNomination(item?: Nomination) {
    setSelectedNomination(item || null);
    setNominationForm(item ? { critical_role_id: item.critical_role_id, worker_profile_id: item.worker_profile_id, readiness_level: item.readiness_level, readiness_months: String(item.readiness_months), potential_rating: item.potential_rating || "", performance_rating: item.performance_rating || "", retention_risk: item.retention_risk, mobility_preference: item.mobility_preference || "", nomination_status: item.nomination_status, development_notes: item.development_notes || "" } : defaultNomination(roles[0]?.id || "", workers[0]?.id || ""));
    setModal("nomination");
  }

  function openAction(item?: Action) {
    setSelectedAction(item || null);
    setActionForm(item ? { nomination_id: item.nomination_id || "", critical_role_id: item.critical_role_id || "", worker_profile_id: item.worker_profile_id, action_type: item.action_type, title: item.title, learning_course_id: item.learning_course_id || "", learning_path_id: item.learning_path_id || "", owner_user_id: item.owner_user_id || "", due_date: dateOnly(item.due_date), status: item.status, notes: item.notes || "" } : defaultAction(roles[0]?.id || "", workers[0]?.id || ""));
    setModal("action");
  }

  async function saveCycle() {
    await apiRequest(`${basePath}/succession-review-cycles${selectedCycle ? `/${selectedCycle.id}` : ""}`, { method: selectedCycle ? "PUT" : "POST", body: { ...cycleForm, starts_on: datePayload(cycleForm.starts_on), ends_on: datePayload(cycleForm.ends_on), notes: cycleForm.notes || null } });
    setNotice("Review cycle saved."); closeModal(); await load();
  }

  async function saveRole() {
    const body = { ...roleForm, cycle_id: roleForm.cycle_id || null, department_id: roleForm.department_id || null, designation_id: roleForm.designation_id || null, incumbent_worker_profile_id: roleForm.incumbent_worker_profile_id || null, emergency_cover_worker_profile_id: roleForm.emergency_cover_worker_profile_id || null, successor_required_count: Number(roleForm.successor_required_count), role_summary: roleForm.role_summary || null };
    await apiRequest(`${basePath}/succession-critical-roles${selectedRole ? `/${selectedRole.id}` : ""}`, { method: selectedRole ? "PUT" : "POST", body });
    setNotice("Critical role saved."); closeModal(); await load();
  }

  async function saveNomination() {
    const body = { ...nominationForm, readiness_months: Number(nominationForm.readiness_months), potential_rating: nominationForm.potential_rating || null, performance_rating: nominationForm.performance_rating || null, mobility_preference: nominationForm.mobility_preference || null, development_notes: nominationForm.development_notes || null };
    await apiRequest(`${basePath}/succession-successors${selectedNomination ? `/${selectedNomination.id}` : ""}`, { method: selectedNomination ? "PUT" : "POST", body });
    setNotice("Successor slate saved."); closeModal(); await load();
  }

  async function saveAction() {
    const body = { ...actionForm, nomination_id: actionForm.nomination_id || null, critical_role_id: actionForm.critical_role_id || null, learning_course_id: actionForm.learning_course_id || null, learning_path_id: actionForm.learning_path_id || null, owner_user_id: actionForm.owner_user_id || null, due_date: datePayload(actionForm.due_date), notes: actionForm.notes || null };
    await apiRequest(`${basePath}/succession-development-actions${selectedAction ? `/${selectedAction.id}` : ""}`, { method: selectedAction ? "PUT" : "POST", body });
    setNotice("Development action saved."); closeModal(); await load();
  }

  async function saveStatus() {
    if (modal === "cycleStatus" && selectedCycle) await apiRequest(`${basePath}/succession-review-cycles/${selectedCycle.id}/status`, { method: "POST", body: statusForm });
    if (modal === "roleStatus" && selectedRole) await apiRequest(`${basePath}/succession-critical-roles/${selectedRole.id}/status`, { method: "POST", body: statusForm });
    if (modal === "nominationStatus" && selectedNomination) await apiRequest(`${basePath}/succession-successors/${selectedNomination.id}/status`, { method: "POST", body: statusForm });
    if (modal === "actionStatus" && selectedAction) await apiRequest(`${basePath}/succession-development-actions/${selectedAction.id}/status`, { method: "POST", body: statusForm });
    setNotice("Status updated."); closeModal(); await load();
  }

  function closeModal() {
    setModal(""); setSelectedCycle(null); setSelectedRole(null); setSelectedNomination(null); setSelectedAction(null);
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title={tenant ? `${tenant.name} Succession Planning` : "Succession Planning"} subtitle="Confidential HR workspace for critical roles, successor readiness, and emergency cover." />
      {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
      {notice ? <Alert text={notice} tone="success" /> : null}
      {error ? <Alert text={error} /> : null}
      <section className="grid gap-4 md:grid-cols-4">{metrics.map(([name, value]) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={name}><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{name}</p><strong className="mt-2 block text-2xl text-[#111827]">{value}</strong></div>)}</section>
      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">{(["roles", "cycles", "successors", "actions", "heatmap", "audit"] as Tab[]).map((item) => <button className={`rounded-xl px-4 py-2 text-sm font-black ${tab === item ? "bg-[#588368] text-white" : "bg-[#f3f6f4] text-[#374151]"}`} key={item} onClick={() => setTab(item)} type="button">{label(item)}</button>)}</div>
          <div className="flex flex-wrap gap-2"><input className={inputClass} placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} /><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={() => tab === "cycles" ? openCycle() : tab === "successors" ? openNomination() : tab === "actions" ? openAction() : openRole()} type="button">{tab === "cycles" ? "New Cycle" : tab === "successors" ? "New Successor" : tab === "actions" ? "New Action" : "New Role"}</button></div>
        </div>
      </section>
      {tab === "roles" ? <Table headers={["Role", "Incumbent", "Risk", "Coverage", "Actions"]} rows={roles.map((item) => [<Cell key="r" title={item.title} sub={`${item.code} · ${item.department_name || "No department"}`} />, <Cell key="i" title={item.incumbent_name || "-"} sub={item.incumbent_code || ""} />, <Badge key="risk" value={`${item.criticality} / ${item.vacancy_risk}`} />, `${item.ready_now_count || 0} ready now · ${item.successor_count || 0}/${item.successor_required_count}`, <Actions key="a" items={[["Edit", () => openRole(item)], ["Status", () => { setSelectedRole(item); setStatusForm({ status: item.status, remarks: "" }); setModal("roleStatus"); }], ["Nominate", () => { setSelectedNomination(null); setNominationForm(defaultNomination(item.id, workers[0]?.id || "")); setModal("nomination"); }]]} />])} /> : null}
      {tab === "cycles" ? <Table headers={["Cycle", "Window", "Confidentiality", "Status", "Actions"]} rows={cycles.map((item) => [<Cell key="c" title={item.name} sub={item.code} />, `${dateOnly(item.starts_on) || "-"} to ${dateOnly(item.ends_on) || "-"}`, label(item.confidentiality_level), <Badge key="s" value={item.status} />, <Actions key="a" items={[["Edit", () => openCycle(item)], ["Status", () => { setSelectedCycle(item); setStatusForm({ status: item.status, remarks: "" }); setModal("cycleStatus"); }]]} />])} /> : null}
      {tab === "successors" ? <Table headers={["Successor", "Role", "Readiness", "Retention", "Actions"]} rows={nominations.map((item) => [<Cell key="w" title={item.worker_display_name || item.worker_profile_id} sub={item.worker_code || ""} />, item.critical_role_title || item.critical_role_id, <Cell key="ready" title={label(item.readiness_level)} sub={`${item.readiness_months || 0} months`} />, <Badge key="risk" value={item.retention_risk} />, <Actions key="a" items={[["Edit", () => openNomination(item)], ["Status", () => { setSelectedNomination(item); setStatusForm({ status: item.nomination_status, remarks: "" }); setModal("nominationStatus"); }], ["Action", () => { setSelectedAction(null); setActionForm({ ...defaultAction(item.critical_role_id, item.worker_profile_id), nomination_id: item.id }); setModal("action"); }]]} />])} /> : null}
      {tab === "actions" ? <Table headers={["Action", "Employee", "Linked Learning", "Due", "Actions"]} rows={actions.map((item) => [<Cell key="a" title={item.title} sub={label(item.status)} />, <Cell key="w" title={item.worker_display_name || item.worker_profile_id} sub={item.worker_code || item.critical_role_title || ""} />, item.learning_course_title || item.learning_path_title || label(item.action_type), dateOnly(item.due_date) || "-", <Actions key="x" items={[["Edit", () => openAction(item)], ["Status", () => { setSelectedAction(item); setStatusForm({ status: item.status, remarks: "" }); setModal("actionStatus"); }]]} />])} /> : null}
      {tab === "heatmap" ? <section className="grid gap-4 lg:grid-cols-3">{roles.map((item) => <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm" key={item.id}><div className="flex items-start justify-between gap-3"><Cell title={item.title} sub={item.department_name || item.code} /><Badge value={item.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold text-[#374151]"><span>Criticality: {label(item.criticality)}</span><span>Vacancy: {label(item.vacancy_risk)}</span><span>Attrition: {label(item.attrition_risk)}</span><span>Target: {label(item.readiness_target)}</span></div><div className="mt-4 h-2 rounded-full bg-[#edf1ef]"><div className="h-2 rounded-full bg-[#588368]" style={{ width: `${Math.min(100, ((item.successor_count || 0) / Math.max(1, item.successor_required_count)) * 100)}%` }} /></div></div>)}</section> : null}
      {tab === "audit" ? <Table headers={["Source", "Action", "Status", "Remarks", "When"]} rows={events.map((item) => [label(item.source_type), label(item.action), `${label(item.from_status)} -> ${label(item.to_status)}`, item.remarks || "-", new Date(item.created_at).toLocaleString()])} /> : null}
      {modal === "cycle" ? <ModalShell title={selectedCycle ? "Edit Cycle" : "New Cycle"} onClose={closeModal} onSave={saveCycle}><Field value={cycleForm.code} onChange={(v) => setCycleForm({ ...cycleForm, code: v })} label="Code" /><Field value={cycleForm.name} onChange={(v) => setCycleForm({ ...cycleForm, name: v })} label="Name" /><div className="grid gap-3 sm:grid-cols-3"><Field value={cycleForm.starts_on} onChange={(v) => setCycleForm({ ...cycleForm, starts_on: v })} label="Starts" type="date" /><Field value={cycleForm.ends_on} onChange={(v) => setCycleForm({ ...cycleForm, ends_on: v })} label="Ends" type="date" /><Select value={cycleForm.confidentiality_level} onChange={(v) => setCycleForm({ ...cycleForm, confidentiality_level: v })} label="Access" options={["hr_only", "leadership", "restricted"]} /></div></ModalShell> : null}
      {modal === "role" ? <ModalShell title={selectedRole ? "Edit Critical Role" : "New Critical Role"} onClose={closeModal} onSave={saveRole}><div className="grid gap-3 sm:grid-cols-2"><Field value={roleForm.code} onChange={(v) => setRoleForm({ ...roleForm, code: v })} label="Code" /><Field value={roleForm.title} onChange={(v) => setRoleForm({ ...roleForm, title: v })} label="Title" /></div><div className="grid gap-3 sm:grid-cols-2"><Select value={roleForm.department_id} onChange={(v) => setRoleForm({ ...roleForm, department_id: v })} label="Department" options={[{ value: "", label: "No department" }, ...departments.map((item) => ({ value: item.id, label: item.name }))]} /><Select value={roleForm.designation_id} onChange={(v) => setRoleForm({ ...roleForm, designation_id: v })} label="Designation" options={[{ value: "", label: "No designation" }, ...designations.map((item) => ({ value: item.id, label: item.name }))]} /></div><div className="grid gap-3 sm:grid-cols-2"><Select value={roleForm.incumbent_worker_profile_id} onChange={(v) => setRoleForm({ ...roleForm, incumbent_worker_profile_id: v })} label="Incumbent" options={[{ value: "", label: "Vacant" }, ...workers.map((item) => ({ value: item.id, label: workerName(item) }))]} /><Select value={roleForm.emergency_cover_worker_profile_id} onChange={(v) => setRoleForm({ ...roleForm, emergency_cover_worker_profile_id: v })} label="Emergency cover" options={[{ value: "", label: "Not assigned" }, ...workers.map((item) => ({ value: item.id, label: workerName(item) }))]} /></div><div className="grid gap-3 sm:grid-cols-4"><Select value={roleForm.criticality} onChange={(v) => setRoleForm({ ...roleForm, criticality: v })} label="Criticality" options={riskLevels} /><Select value={roleForm.vacancy_risk} onChange={(v) => setRoleForm({ ...roleForm, vacancy_risk: v })} label="Vacancy risk" options={riskLevels} /><Select value={roleForm.attrition_risk} onChange={(v) => setRoleForm({ ...roleForm, attrition_risk: v })} label="Attrition risk" options={riskLevels} /><Field value={roleForm.successor_required_count} onChange={(v) => setRoleForm({ ...roleForm, successor_required_count: v })} label="Successors" type="number" /></div></ModalShell> : null}
      {modal === "nomination" ? <ModalShell title={selectedNomination ? "Edit Successor" : "New Successor"} onClose={closeModal} onSave={saveNomination}><Select value={nominationForm.critical_role_id} onChange={(v) => setNominationForm({ ...nominationForm, critical_role_id: v })} label="Critical role" options={roles.map((item) => ({ value: item.id, label: item.title }))} /><Select value={nominationForm.worker_profile_id} onChange={(v) => setNominationForm({ ...nominationForm, worker_profile_id: v })} label="Employee" options={workers.map((item) => ({ value: item.id, label: workerName(item) }))} /><div className="grid gap-3 sm:grid-cols-3"><Select value={nominationForm.readiness_level} onChange={(v) => setNominationForm({ ...nominationForm, readiness_level: v })} label="Readiness" options={readinessLevels} /><Field value={nominationForm.readiness_months} onChange={(v) => setNominationForm({ ...nominationForm, readiness_months: v })} label="Months" type="number" /><Select value={nominationForm.retention_risk} onChange={(v) => setNominationForm({ ...nominationForm, retention_risk: v })} label="Retention risk" options={riskLevels} /></div><div className="grid gap-3 sm:grid-cols-2"><Field value={nominationForm.performance_rating} onChange={(v) => setNominationForm({ ...nominationForm, performance_rating: v })} label="Performance" /><Field value={nominationForm.potential_rating} onChange={(v) => setNominationForm({ ...nominationForm, potential_rating: v })} label="Potential" /></div></ModalShell> : null}
      {modal === "action" ? <ModalShell title={selectedAction ? "Edit Development Action" : "New Development Action"} onClose={closeModal} onSave={saveAction}><Field value={actionForm.title} onChange={(v) => setActionForm({ ...actionForm, title: v })} label="Title" /><div className="grid gap-3 sm:grid-cols-2"><Select value={actionForm.worker_profile_id} onChange={(v) => setActionForm({ ...actionForm, worker_profile_id: v })} label="Employee" options={workers.map((item) => ({ value: item.id, label: workerName(item) }))} /><Select value={actionForm.critical_role_id} onChange={(v) => setActionForm({ ...actionForm, critical_role_id: v })} label="Critical role" options={[{ value: "", label: "No role" }, ...roles.map((item) => ({ value: item.id, label: item.title }))]} /></div><div className="grid gap-3 sm:grid-cols-3"><Select value={actionForm.learning_course_id} onChange={(v) => setActionForm({ ...actionForm, learning_course_id: v })} label="Course" options={[{ value: "", label: "No course" }, ...courses.map((item) => ({ value: item.id, label: item.title }))]} /><Select value={actionForm.learning_path_id} onChange={(v) => setActionForm({ ...actionForm, learning_path_id: v })} label="Path" options={[{ value: "", label: "No path" }, ...paths.map((item) => ({ value: item.id, label: item.title }))]} /><Field value={actionForm.due_date} onChange={(v) => setActionForm({ ...actionForm, due_date: v })} label="Due" type="date" /></div></ModalShell> : null}
      {["cycleStatus", "roleStatus", "nominationStatus", "actionStatus"].includes(modal) ? <ModalShell title="Update Status" onClose={closeModal} onSave={saveStatus}><Select value={statusForm.status} onChange={(v) => setStatusForm({ ...statusForm, status: v })} label="Status" options={modal === "cycleStatus" ? cycleStatuses : modal === "roleStatus" ? roleStatuses : modal === "nominationStatus" ? nominationStatuses : actionStatuses} /><Field value={statusForm.remarks} onChange={(v) => setStatusForm({ ...statusForm, remarks: v })} label="Remarks" /></ModalShell> : null}
    </main>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <header><p className="text-xs font-black uppercase tracking-wide text-[#588368]">Confidential</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#111827]">{title}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#667085]">{subtitle}</p></header>;
}

function Alert({ text, tone = "error" }: { text: string; tone?: "error" | "success" }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-[#bfdbca] bg-[#f0f8f3] text-[#31533d]" : "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]"}`}>{text}</div>;
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((item) => <th className="px-5 py-4" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.length ? rows.map((row, index) => <tr className="hover:bg-[#f8faf9]" key={index}>{row.map((cell, cellIndex) => <td className="px-5 py-4 text-sm font-semibold text-[#374151]" key={cellIndex}>{cell}</td>)}</tr>) : <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={headers.length}>No records found.</td></tr>}</tbody></table></section>;
}

function Cell({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return <div><strong className="block text-sm text-[#111827]">{title}</strong>{sub ? <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{sub}</span> : null}</div>;
}

function Badge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-[#eef6f1] px-3 py-1 text-xs font-black capitalize text-[#31533d]">{label(value)}</span>;
}

function Actions({ items }: { items: [string, () => void][] }) {
  return <div className="flex flex-wrap gap-2">{items.map(([name, action]) => <button className="rounded-xl border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" key={name} onClick={action} type="button">{name}</button>)}</div>;
}

function Field({ label: fieldLabel, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}<input className={inputClass} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label: fieldLabel, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] | { value: string; label: string }[] }) {
  return <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-[#6b7280]">{fieldLabel}<select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => typeof item === "string" ? <option key={item} value={item}>{label(item)}</option> : <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
}

function ModalShell({ title, children, onClose, onSave }: { title: string; children: ReactNode; onClose: () => void; onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }
  return <HrmsModal onClose={onClose} open={true} title={title}><div className="grid gap-4">{children}<div className="flex justify-end gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151]" onClick={onClose} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={saving} onClick={() => void submit()} type="button">Save</button></div></div></HrmsModal>;
}
