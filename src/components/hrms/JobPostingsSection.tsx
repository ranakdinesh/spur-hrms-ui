"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Option = { id: string; name: string };
type Requisition = { id: string; code?: string | null; title: string; status: string; department_id?: string | null; department_name?: string | null; employment_type_id?: string | null; employment_type_name?: string | null; work_mode?: string | null; min_salary?: number | null; max_salary?: number | null; currency?: string | null; reason_for_hire?: string | null };
type RequisitionPage = { items: Requisition[] };
type Posting = { id: string; job_requisition_id?: string | null; job_requisition_code?: string | null; job_requisition_status?: string | null; code?: string | null; title?: string | null; job_summary?: string | null; description?: string | null; job_category?: string | null; department_id?: string | null; department_name?: string | null; employment_type_id?: string | null; employment_type_name?: string | null; work_mode?: string | null; role_type?: string | null; min_experience?: number | null; max_experience?: number | null; min_salary?: number | null; max_salary?: number | null; salary_currency?: string | null; salary_period?: string | null; is_salary_visible: boolean; effective_status?: string | null; job_status?: string | null; publish_date?: string | null; expiry_date?: string | null; is_published: boolean };
type PostingPage = { items: Posting[]; total: number; limit: number; offset: number; next_offset?: number | null };

const statuses = ["Draft", "Open", "Expired", "Closed"];
const emptyForm = { job_requisition_id: "", code: "", title: "", job_summary: "", description: "", job_category: "", department_id: "", employment_type_id: "", work_mode: "Office", role_type: "", min_experience: "", max_experience: "", min_salary: "", max_salary: "", salary_currency: "INR", salary_period: "Monthly", is_salary_visible: true, job_status: "Draft", expiry_date: "" };

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function isoDate(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function money(min?: number | null, max?: number | null, currency = "INR") {
  const format = (value?: number | null) => value == null ? "-" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency }).format(value);
  return `${format(min)} - ${format(max)}`;
}

function badge(status?: string | null) {
  if (status === "Open") return "bg-[#e7f6ed] text-[#237a45]";
  if (status === "Expired") return "bg-[#fef3c7] text-[#92400e]";
  if (status === "Closed") return "bg-[#f3f4f6] text-[#4b5563]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

export function JobPostingsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);
  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Job Postings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to publish openings and manage public job visibility.</p></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Postings</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <JobPostingManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function JobPostingManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<Option[]>([]);
  const [page, setPage] = useState<PostingPage>({ items: [], total: 0, limit: 25, offset: 0 });
  const [selected, setSelected] = useState<Posting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState("");
  const [departmentID, setDepartmentID] = useState("");
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const limit = 25;

  const loadSetup = useCallback(async () => {
    try {
      const [reqPage, deptRows, employmentRows] = await Promise.all([
        apiRequest<RequisitionPage>(`${basePath}/job-requisitions?status=Approved&limit=100`).catch(() => ({ items: [] })),
        apiRequest<Option[]>(`${basePath}/departments`).catch(() => []),
        apiRequest<Option[]>(`${basePath}/employment-types`).catch(() => []),
      ]);
      setRequisitions(reqPage.items || []);
      setDepartments(deptRows);
      setEmploymentTypes(employmentRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posting setup.");
    }
  }, [basePath]);

  const loadPostings = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("job_status", status);
    if (published) params.set("is_published", published);
    if (departmentID) params.set("department_id", departmentID);
    try {
      setPage(await apiRequest<PostingPage>(`${basePath}/job-postings?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job postings.");
    }
  }, [basePath, departmentID, offset, published, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadSetup(); }, 0); return () => window.clearTimeout(timer); }, [loadSetup]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadPostings(); }, 0); return () => window.clearTimeout(timer); }, [loadPostings]);

  function chooseRequisition(id: string) {
    const requisition = requisitions.find((item) => item.id === id);
    setForm({ ...form, job_requisition_id: id, title: requisition?.title || form.title, job_summary: requisition?.reason_for_hire || form.job_summary, department_id: requisition?.department_id || form.department_id, employment_type_id: requisition?.employment_type_id || form.employment_type_id, work_mode: requisition?.work_mode || form.work_mode, min_salary: requisition?.min_salary == null ? form.min_salary : String(requisition.min_salary), max_salary: requisition?.max_salary == null ? form.max_salary : String(requisition.max_salary), salary_currency: requisition?.currency || form.salary_currency });
  }

  async function loadDetail(id: string) {
    const item = await apiRequest<Posting>(`${basePath}/job-postings/${id}`);
    setSelected(item);
    setForm({ job_requisition_id: item.job_requisition_id || "", code: item.code || "", title: item.title || "", job_summary: item.job_summary || "", description: item.description || "", job_category: item.job_category || "", department_id: item.department_id || "", employment_type_id: item.employment_type_id || "", work_mode: item.work_mode || "Office", role_type: item.role_type || "", min_experience: item.min_experience == null ? "" : String(item.min_experience), max_experience: item.max_experience == null ? "" : String(item.max_experience), min_salary: item.min_salary == null ? "" : String(item.min_salary), max_salary: item.max_salary == null ? "" : String(item.max_salary), salary_currency: item.salary_currency || "INR", salary_period: item.salary_period || "Monthly", is_salary_visible: item.is_salary_visible, job_status: item.job_status || "Draft", expiry_date: dateOnly(item.expiry_date) });
  }

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
  }

  function body(statusOverride?: string) {
    return { job_requisition_id: form.job_requisition_id || null, code: form.code || null, title: form.title, job_summary: form.job_summary || null, description: form.description || null, job_category: form.job_category || null, department_id: form.department_id || null, employment_type_id: form.employment_type_id || null, work_mode: form.work_mode || null, role_type: form.role_type || null, min_experience: form.min_experience === "" ? null : Number(form.min_experience), max_experience: form.max_experience === "" ? null : Number(form.max_experience), min_salary: form.min_salary === "" ? null : Number(form.min_salary), max_salary: form.max_salary === "" ? null : Number(form.max_salary), salary_currency: form.salary_currency || "INR", salary_period: form.salary_period || "Monthly", is_salary_visible: form.is_salary_visible, job_status: statusOverride || form.job_status || "Draft", expiry_date: isoDate(form.expiry_date), is_published: false };
  }

  async function save(statusOverride?: string) {
    setError("");
    setNotice("");
    try {
      const saved = await apiRequest<Posting>(`${basePath}/job-postings${selected ? `/${selected.id}` : ""}`, { method: selected ? "PUT" : "POST", body: body(statusOverride) });
      setNotice(selected ? "Job posting updated." : "Job posting created.");
      await loadPostings();
      await loadDetail(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job posting.");
    }
  }

  async function publish(item: Posting) {
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Posting>(`${basePath}/job-postings/${item.id}/publish`, { method: "POST", body: { expiry_date: isoDate(form.expiry_date || dateOnly(item.expiry_date)) } });
      setNotice("Job posting published.");
      await loadPostings();
      await loadDetail(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish job posting.");
    }
  }

  async function close(item: Posting) {
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Posting>(`${basePath}/job-postings/${item.id}/close`, { method: "POST" });
      setNotice("Job posting closed.");
      await loadPostings();
      await loadDetail(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close job posting.");
    }
  }

  async function expireNow() {
    setError("");
    setNotice("");
    try {
      const expired = await apiRequest<Posting[]>(`${basePath}/job-postings/expire`, { method: "POST" });
      setNotice(`${expired.length} postings expired.`);
      await loadPostings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to expire postings.");
    }
  }

  const counts = Object.fromEntries(statuses.map((value) => [value, page.items.filter((item) => (item.effective_status || item.job_status) === value).length]));

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Job Postings` : "Job Postings"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Create postings from approved requisitions, publish them with expiry dates, and keep closed openings out of the public list.</p></div><div className="flex gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}<button className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white" onClick={() => void expireNow()} type="button">Expire Due</button></div></div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4">{statuses.map((item) => <button className={`rounded-2xl border p-5 text-left shadow-sm ${status === item ? "border-[#588368] bg-[#f4fbf8]" : "border-[#edf1ef] bg-white"}`} key={item} onClick={() => { setStatus(status === item ? "" : item); setOffset(0); }} type="button"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{item}</p><strong className="mt-3 block text-3xl text-[#111827]">{counts[item] || 0}</strong></button>)}</section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_190px_220px_auto]"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search posting, requisition, department" value={search} /><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setPublished(event.target.value); setOffset(0); }} value={published}><option value="">All visibility</option><option value="true">Published</option><option value="false">Unpublished</option></select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setDepartmentID(event.target.value); setOffset(0); }} value={departmentID}><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setStatus(""); setPublished(""); setDepartmentID(""); setOffset(0); }} type="button">Reset</button></div></div>
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Posting</th><th className="px-5 py-4">Requisition</th><th className="px-5 py-4">Work setup</th><th className="px-5 py-4">Salary</th><th className="px-5 py-4">Dates</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{page.items.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No job postings found.</td></tr> : page.items.map((item) => <tr className="align-top hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.title || "Untitled posting"}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.code || "No code"} - {item.job_category || "General"}</span></td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{item.job_requisition_code || "Manual"}<br />{item.job_requisition_status || "-"}</td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{item.department_name || "No department"}<br />{item.employment_type_name || "Employment type"} - {item.work_mode || "Work mode"}</td><td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{item.is_salary_visible ? money(item.min_salary, item.max_salary, item.salary_currency || "INR") : "Hidden"}</td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">Publish {dateOnly(item.publish_date) || "-"}<br />Expire {dateOnly(item.expiry_date) || "-"}</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${badge(item.effective_status || item.job_status)}`}>{item.effective_status || item.job_status}</span><p className="mt-2 text-xs font-bold text-[#6b7280]">{item.is_published ? "Public" : "Not public"}</p></td><td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-xl border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => void loadDetail(item.id)} type="button">Open</button><button className="rounded-xl bg-[#237a45] px-3 py-2 text-xs font-black text-white disabled:bg-[#a8b7ae]" disabled={item.is_published && (item.effective_status || item.job_status) === "Open"} onClick={() => void publish(item)} type="button">Publish</button></div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-[#edf1ef] p-5"><p className="text-sm font-bold text-[#6b7280]">{page.total === 0 ? "0" : `${page.offset + 1}-${Math.min(page.offset + page.items.length, page.total)} of ${page.total}`}</p><div className="flex gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151] disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} type="button">Previous</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!page.next_offset} onClick={() => setOffset(page.next_offset || offset)} type="button">Next</button></div></div></section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#111827]">{selected ? "Posting Detail" : "New Posting"}</h2>{selected ? <button className="text-sm font-black text-[#588368]" onClick={resetForm} type="button">New</button> : null}</div><div className="mt-5 grid gap-3"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => chooseRequisition(event.target.value)} value={form.job_requisition_id}><option value="">Select approved requisition</option>{requisitions.map((item) => <option key={item.id} value={item.id}>{item.title}{item.code ? ` (${item.code})` : ""}</option>)}</select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Posting title" value={form.title} /><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Posting code" value={form.code} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, job_category: event.target.value })} placeholder="Category" value={form.job_category} /></div><div className="grid gap-3 sm:grid-cols-2"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, department_id: event.target.value })} value={form.department_id}><option value="">Department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, employment_type_id: event.target.value })} value={form.employment_type_id}><option value="">Employment type</option>{employmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-2"><select className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, work_mode: event.target.value })} value={form.work_mode}><option>Office</option><option>Hybrid</option><option>Remote</option></select><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, role_type: event.target.value })} placeholder="Role type" value={form.role_type} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, min_experience: event.target.value })} placeholder="Min experience" type="number" value={form.min_experience} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, max_experience: event.target.value })} placeholder="Max experience" type="number" value={form.max_experience} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, min_salary: event.target.value })} placeholder="Min salary" type="number" value={form.min_salary} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, max_salary: event.target.value })} placeholder="Max salary" type="number" value={form.max_salary} /></div><div className="grid gap-3 sm:grid-cols-2"><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, salary_currency: event.target.value })} placeholder="Currency" value={form.salary_currency} /><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, salary_period: event.target.value })} placeholder="Salary period" value={form.salary_period} /></div><label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold text-[#374151]"><input checked={form.is_salary_visible} onChange={(event) => setForm({ ...form, is_salary_visible: event.target.checked })} type="checkbox" /> Show salary on public posting</label><input className="h-12 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, expiry_date: event.target.value })} type="date" value={form.expiry_date} /><textarea className="min-h-[84px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, job_summary: event.target.value })} placeholder="Public summary" value={form.job_summary} /><textarea className="min-h-[120px] rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Full description" value={form.description} /><div className="grid gap-3 sm:grid-cols-2"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.title.trim()} onClick={() => void save()} type="button">{selected ? "Update" : "Save Draft"}</button><button className="rounded-xl bg-[#237a45] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!selected} onClick={() => selected ? void publish(selected) : undefined} type="button">Publish</button></div>{selected ? <button className="rounded-xl bg-[#374151] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={(selected.effective_status || selected.job_status) === "Closed"} onClick={() => void close(selected)} type="button">Close Posting</button> : null}</div></section>
        </aside>
      </section>
    </main>
  );
}
