"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Option = { id: string; name: string };
type JobPosition = { id: string; code?: string | null; title: string; level?: string | null; category?: string | null; department_id?: string | null; department_name?: string | null; employment_type_id?: string | null; employment_type_name?: string | null; work_mode?: string | null; total_position: number; budgeted_cost?: number | null; open_requisition_count: number };
type PositionPage = { items: JobPosition[] };
type Requisition = { id: string; job_position_id: string; job_position_code?: string | null; position_total_headcount: number; position_budgeted_cost?: number | null; code?: string | null; title: string; department_id?: string | null; department_name?: string | null; employment_type_id?: string | null; employment_type_name?: string | null; work_mode?: string | null; total_openings: number; reason_for_hire?: string | null; min_salary?: number | null; max_salary?: number | null; currency: string; target_hire_date?: string | null; expected_closure_date?: string | null; priority?: string | null; status: string; notes?: string | null; log_count: number; logs?: RequisitionLog[] };
type RequisitionLog = { id: string; from_status?: string | null; to_status: string; action: string; remarks?: string | null; created_at: string };
type RequisitionPage = { items: Requisition[]; total: number; limit: number; offset: number; next_offset?: number | null };

const statuses = ["Draft", "Pending", "Approved", "Rejected", "Closed"];
const emptyForm = { job_position_id: "", code: "", title: "", total_openings: 1, reason_for_hire: "", min_salary: "", max_salary: "", currency: "INR", target_hire_date: "", expected_closure_date: "", priority: "Medium", status: "Draft", notes: "" };

function money(value?: number | null, currency = "INR") {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency }).format(value);
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function isoDate(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function badge(status: string) {
  if (status === "Approved") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "Pending") return "bg-[#fef3c7] text-[#92400e]";
  if (status === "Rejected") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "Closed") return "bg-[#f3f4f6] text-[#4b5563]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

export function JobRequisitionsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Job Requisitions</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to manage requisition approvals and pipeline status.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Requisitions</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <JobRequisitionManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function JobRequisitionManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [page, setPage] = useState<RequisitionPage>({ items: [], total: 0, limit: 25, offset: 0 });
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [departmentID, setDepartmentID] = useState("");
  const [offset, setOffset] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const limit = 25;
  const selectedPosition = positions.find((item) => item.id === form.job_position_id);

  const loadSetup = useCallback(async () => {
    try {
      const [positionPage, departmentRows] = await Promise.all([apiRequest<PositionPage>(`${basePath}/job-positions?limit=100`).catch(() => ({ items: [] })), apiRequest<Option[]>(`${basePath}/departments`).catch(() => [])]);
      setPositions(positionPage.items || []);
      setDepartments(departmentRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setup.");
    }
  }, [basePath]);

  const loadRequisitions = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (departmentID) params.set("department_id", departmentID);
    try {
      setPage(await apiRequest<RequisitionPage>(`${basePath}/job-requisitions?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisitions.");
    }
  }, [basePath, departmentID, offset, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup(); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadRequisitions(); }, 0); return () => window.clearTimeout(timer); }, [loadRequisitions]);

  function choosePosition(id: string) {
    const position = positions.find((item) => item.id === id);
    setForm({ ...form, job_position_id: id, title: position?.title || form.title, min_salary: "", max_salary: position?.budgeted_cost == null ? form.max_salary : String(position.budgeted_cost) });
  }

  async function loadDetail(id: string) {
    const item = await apiRequest<Requisition>(`${basePath}/job-requisitions/${id}`);
    setSelected(item);
    setForm({ job_position_id: item.job_position_id, code: item.code || "", title: item.title, total_openings: item.total_openings, reason_for_hire: item.reason_for_hire || "", min_salary: item.min_salary == null ? "" : String(item.min_salary), max_salary: item.max_salary == null ? "" : String(item.max_salary), currency: item.currency || "INR", target_hire_date: dateOnly(item.target_hire_date), expected_closure_date: dateOnly(item.expected_closure_date), priority: item.priority || "Medium", status: item.status, notes: item.notes || "" });
  }

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
    setRemarks("");
  }

  async function save(statusOverride?: string) {
    setError("");
    setNotice("");
    const position = positions.find((item) => item.id === form.job_position_id);
    const body = { job_position_id: form.job_position_id, code: form.code || null, title: form.title || position?.title || "", total_openings: Number(form.total_openings || 1), reason_for_hire: form.reason_for_hire || null, min_salary: form.min_salary === "" ? null : Number(form.min_salary), max_salary: form.max_salary === "" ? null : Number(form.max_salary), currency: form.currency || "INR", target_hire_date: isoDate(form.target_hire_date), expected_closure_date: isoDate(form.expected_closure_date), priority: form.priority || null, status: statusOverride || form.status || "Draft", notes: form.notes || null };
    try {
      const saved = await apiRequest<Requisition>(`${basePath}/job-requisitions${selected ? `/${selected.id}` : ""}`, { method: selected ? "PUT" : "POST", body });
      setNotice(selected ? "Requisition updated." : "Requisition created.");
      await loadRequisitions();
      await loadDetail(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save requisition.");
    }
  }

  async function action(item: Requisition, actionName: "submit" | "approve" | "reject" | "close") {
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Requisition>(`${basePath}/job-requisitions/${item.id}/${actionName}`, { method: "POST", body: { remarks: remarks || null } });
      setNotice(`Requisition ${actionName} completed.`);
      setRemarks("");
      await loadRequisitions();
      await loadDetail(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${actionName} requisition.`);
    }
  }

  const counts = Object.fromEntries(statuses.map((value) => [value, page.items.filter((item) => item.status === value).length]));

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Requisitions` : "Job Requisitions"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Create requisitions from approved positions, route them for approval, and keep an audit trail.</p></div>{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}</div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-5">{statuses.map((item) => <button className={`rounded-2xl border p-5 text-left shadow-sm ${status === item ? "border-[#588368] bg-[#f4fbf8]" : "border-[#edf1ef] bg-white"}`} key={item} onClick={() => { setStatus(status === item ? "" : item); setOffset(0); }} type="button"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item}</p><strong className="mt-3 block text-3xl text-[#111827]">{counts[item] || 0}</strong></button>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Search requisition, code, reason" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(e) => { setDepartmentID(e.target.value); setOffset(0); }} value={departmentID}><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setDepartmentID(""); setStatus(""); setOffset(0); }} type="button">Reset</button></div></div>
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Requisition</th><th className="px-5 py-4">Position signals</th><th className="px-5 py-4">Openings</th><th className="px-5 py-4">Salary</th><th className="px-5 py-4">Priority</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{page.items.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No requisitions found.</td></tr> : page.items.map((item) => <tr className="align-top hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.title}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.code || "No code"} - {item.department_name || "No department"}</span></td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{item.job_position_code || "Position"}<br />Plan {item.position_total_headcount || "-"} - Budget {money(item.position_budgeted_cost)}</td><td className="px-5 py-5 text-sm font-black text-[#111827]">{item.total_openings}</td><td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{money(item.min_salary, item.currency)} - {money(item.max_salary, item.currency)}</td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{item.priority || "-"}</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.status)}`}>{item.status}</span><p className="mt-2 text-xs font-bold text-[#6b7280]">{item.log_count} logs</p></td><td className="px-5 py-5 text-right"><button className="rounded-xl border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => void loadDetail(item.id)} type="button">Open</button></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-[#edf1ef] p-5"><p className="text-sm font-bold text-[#6b7280]">{page.offset + 1}-{Math.min(page.offset + page.items.length, page.total)} of {page.total}</p><div className="flex gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151] disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} type="button">Previous</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!page.next_offset} onClick={() => setOffset(page.next_offset || offset)} type="button">Next</button></div></div></section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">{selected ? "Requisition Detail" : "New Requisition"}</h2>{selected ? <button className="text-sm font-black text-[#588368]" onClick={resetForm} type="button">New</button> : null}</div><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => choosePosition(e.target.value)} value={form.job_position_id}><option value="">Select position</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.title}{position.code ? ` (${position.code})` : ""}</option>)}</select>{selectedPosition ? <div className="rounded-xl bg-[#f8faf9] p-4 text-xs font-bold leading-6 text-[#4b5563]">Position plan: {selectedPosition.total_position} headcount<br />Position budget: {money(selectedPosition.budgeted_cost)}<br />Open requisitions: {selectedPosition.open_requisition_count}</div> : null}<input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" value={form.title} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code" value={form.code} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min={1} onChange={(e) => setForm({ ...form, total_openings: Number(e.target.value) })} placeholder="Openings" type="number" value={form.total_openings} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, min_salary: e.target.value })} placeholder="Min salary" type="number" value={form.min_salary} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, max_salary: e.target.value })} placeholder="Max salary" type="number" value={form.max_salary} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, target_hire_date: e.target.value })} type="date" value={form.target_hire_date} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, expected_closure_date: e.target.value })} type="date" value={form.expected_closure_date} /></div><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, priority: e.target.value })} value={form.priority}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><textarea className="min-h-[96px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, reason_for_hire: e.target.value })} placeholder="Reason for hire" value={form.reason_for_hire} /><textarea className="min-h-[80px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" value={form.notes} /><div className="grid gap-3 sm:grid-cols-2"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.job_position_id || !form.title.trim()} onClick={() => void save()} type="button">{selected ? "Update" : "Save Draft"}</button><button className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.job_position_id || !form.title.trim()} onClick={() => void save("Pending")} type="button">Save & Submit</button></div></div></section>
          {selected ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Actions</h2><textarea className="mt-4 min-h-[76px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks for audit log" value={remarks} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" disabled={!["Draft", "Rejected"].includes(selected.status)} onClick={() => void action(selected, "submit")} type="button">Submit</button><button className="rounded-xl bg-[#237a45] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={selected.status !== "Pending"} onClick={() => void action(selected, "approve")} type="button">Approve</button><button className="rounded-xl border border-[#fee2e2] px-4 py-3 text-sm font-black text-[#b91c1c] disabled:opacity-50" disabled={selected.status !== "Pending"} onClick={() => void action(selected, "reject")} type="button">Reject</button><button className="rounded-xl bg-[#374151] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={selected.status === "Closed"} onClick={() => void action(selected, "close")} type="button">Close</button></div></section> : null}
          {selected ? <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#111827]">Audit Log</h2><div className="mt-4 divide-y divide-[#edf1ef]">{(selected.logs || []).length === 0 ? <p className="py-4 text-sm font-semibold text-[#6b7280]">No log entries.</p> : selected.logs?.map((log) => <div className="py-3" key={log.id}><div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#111827]">{log.action}</strong><span className="text-xs font-bold text-[#6b7280]">{dateOnly(log.created_at)}</span></div><p className="mt-1 text-xs font-semibold text-[#6b7280]">{log.from_status || "-"} to {log.to_status}</p>{log.remarks ? <p className="mt-2 text-sm font-semibold text-[#4b5563]">{log.remarks}</p> : null}</div>)}</div></section> : null}
        </aside>
      </section>
    </main>
  );
}
