"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { HrmsModal } from "@/components/hrms/HrmsModal";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type Option = { id: string; name: string; short_code?: string };
type EmploymentType = { id: string; name: string };
type JobPosition = {
  id: string;
  code?: string | null;
  title: string;
  level?: string | null;
  category?: string | null;
  description?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  employment_type_id?: string | null;
  employment_type_name?: string | null;
  work_mode?: string | null;
  total_position: number;
  budgeted_cost?: number | null;
  location_count: number;
  open_requisition_count: number;
  created_at: string;
};
type Location = { id: string; job_position_id: string; location?: string | null; city?: string | null; state?: string | null; country?: string | null; is_remote: boolean };
type Page = { items: JobPosition[]; total: number; limit: number; offset: number; next_offset?: number | null };
type JobPosting = { id: string; title?: string | null; code?: string | null; job_status?: string | null; is_published?: boolean };

const emptyPosition = { code: "", title: "", level: "", category: "", description: "", department_id: "", employment_type_id: "", work_mode: "Office", total_position: 1, budgeted_cost: "" };
const emptyLocation = { location: "", city: "", state: "", country: "", is_remote: false };
const emptyOpening = { code: "", title: "", job_summary: "", responsibilities: "", requirements: "", benefits: "", job_category: "", min_experience: "", max_experience: "", min_salary: "", max_salary: "", salary_currency: "INR", salary_period: "year", is_salary_visible: false, expiry_date: "" };
const emptyCareers = {
  headline: "",
  welcome_message: "",
  about: "",
  core_values: "Ownership\nCustomer trust\nLearning\nRespect",
  notices: "",
  seo_title: "",
  seo_description: "",
  candidate_cta: "View openings",
  login_button_text: "Login",
  featured_job_ids: [] as string[],
};

function money(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(value);
}

function optionalNumber(value: string) {
  return value === "" ? null : Number(value);
}

function optionalDate(value: string) {
  return value ? `${value}T00:00:00Z` : null;
}

function composeDescription(form: typeof emptyOpening) {
  return [
    form.responsibilities.trim() ? `Responsibilities\n${form.responsibilities.trim()}` : "",
    form.requirements.trim() ? `Requirements\n${form.requirements.trim()}` : "",
    form.benefits.trim() ? `Benefits\n${form.benefits.trim()}` : "",
  ].filter(Boolean).join("\n\n");
}

export function JobPositionsSection({ initialMode = "positions", isSuperAdmin, tenants, tenantsLoading, tenantsError }: { initialMode?: "positions" | "career-site"; isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div className="flex flex-col gap-2"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Recruitment</p><h1 className="text-3xl font-black tracking-tight text-[#111827]">Job Positions</h1></div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => <tr className="hover:bg-[#f8faf9]" key={row.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code} - {row.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setTenant(row)} type="button">Open Positions</button></td></tr>)}</tbody></table></div></section>
      </main>
    );
  }
  return <JobPositionsManager initialMode={initialMode} isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function JobPositionsManager({ initialMode, isSuperAdmin, tenant, onBack }: { initialMode: "positions" | "career-site"; isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [positions, setPositions] = useState<Page>({ items: [], total: 0, limit: 25, offset: 0 });
  const [departments, setDepartments] = useState<Option[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [selected, setSelected] = useState<JobPosition | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState(emptyPosition);
  const [locationForm, setLocationForm] = useState(emptyLocation);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [openingFor, setOpeningFor] = useState<JobPosition | null>(null);
  const [openingForm, setOpeningForm] = useState(emptyOpening);
  const [publishedOpenings, setPublishedOpenings] = useState<JobPosting[]>([]);
  const [positionModal, setPositionModal] = useState(false);
  const [careerModal, setCareerModal] = useState(false);
  const [careersForm, setCareersForm] = useState(emptyCareers);
  const [search, setSearch] = useState("");
  const [departmentID, setDepartmentID] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const limit = 25;

  const loadSetup = useCallback(async () => {
    try {
      const [deptRows, typeRows] = await Promise.all([apiRequest<Option[]>(`${basePath}/departments`).catch(() => []), apiRequest<EmploymentType[]>(`${basePath}/employment-types`).catch(() => [])]);
      setDepartments(deptRows);
      setEmploymentTypes(typeRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setup.");
    }
  }, [basePath]);

  const loadCareers = useCallback(async () => {
    if (isSuperAdmin) return;
    try {
      const setting = await apiRequest<{ value: Partial<typeof emptyCareers> & { core_values?: string[]; notices?: string[]; featured_job_ids?: string[] } }>("/hrms/tenant-settings/careers").catch(() => null);
      if (setting?.value) {
        setCareersForm({
          headline: setting.value.headline || "",
          welcome_message: setting.value.welcome_message || "",
          about: setting.value.about || "",
          core_values: (setting.value.core_values || []).join("\n") || emptyCareers.core_values,
          notices: (setting.value.notices || []).join("\n"),
          seo_title: setting.value.seo_title || "",
          seo_description: setting.value.seo_description || "",
          candidate_cta: setting.value.candidate_cta || emptyCareers.candidate_cta,
          login_button_text: setting.value.login_button_text || emptyCareers.login_button_text,
          featured_job_ids: setting.value.featured_job_ids || [],
        });
      }
    } catch {
      setCareersForm(emptyCareers);
    }
  }, [isSuperAdmin]);

  const loadPositions = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) params.set("search", search.trim());
    if (departmentID) params.set("department_id", departmentID);
    if (workMode) params.set("work_mode", workMode);
    try {
      setPositions(await apiRequest<Page>(`${basePath}/job-positions?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job positions.");
    }
  }, [basePath, departmentID, offset, search, workMode]);

  const loadPublishedOpenings = useCallback(async () => {
    if (isSuperAdmin) return;
    try {
      setPublishedOpenings(await apiRequest<JobPosting[]>("/hrms/job-postings/published"));
    } catch {
      setPublishedOpenings([]);
    }
  }, [isSuperAdmin]);

  const loadLocations = useCallback(async (positionID: string) => {
    try {
      setLocations(await apiRequest<Location[]>(`${basePath}/job-positions/${positionID}/locations`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations.");
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSetup();
      void loadCareers();
      void loadPublishedOpenings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCareers, loadPublishedOpenings, loadSetup]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadPositions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPositions]);

  function openNew() {
    setSelected(null);
    setForm(emptyPosition);
    setLocations([]);
    setLocationForm(emptyLocation);
    setEditingLocation(null);
    setPositionModal(true);
  }

  function edit(position: JobPosition) {
    setSelected(position);
    setForm({ code: position.code || "", title: position.title, level: position.level || "", category: position.category || "", description: position.description || "", department_id: position.department_id || "", employment_type_id: position.employment_type_id || "", work_mode: position.work_mode || "Office", total_position: position.total_position, budgeted_cost: position.budgeted_cost == null ? "" : String(position.budgeted_cost) });
    setLocationForm(emptyLocation);
    setEditingLocation(null);
    setPositionModal(true);
    void loadLocations(position.id);
  }

  function openActivation(position: JobPosition) {
    setOpeningFor(position);
    setOpeningForm({
      ...emptyOpening,
      code: position.code || "",
      title: position.title,
      job_summary: position.description || "",
      job_category: position.category || "",
    });
  }

  async function savePosition() {
    setError("");
    setNotice("");
    const body = { ...form, code: form.code || null, level: form.level || null, category: form.category || null, description: form.description || null, department_id: form.department_id || null, employment_type_id: form.employment_type_id || null, work_mode: form.work_mode || null, total_position: Number(form.total_position || 0), budgeted_cost: form.budgeted_cost === "" ? null : Number(form.budgeted_cost) };
    try {
      const saved = await apiRequest<JobPosition>(`${basePath}/job-positions${selected ? `/${selected.id}` : ""}`, { method: selected ? "PUT" : "POST", body });
      setNotice(selected ? "Job position updated." : "Job position created.");
      await loadPositions();
      edit(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job position.");
    }
  }

  async function deletePosition(position: JobPosition) {
    setError("");
    setNotice("");
    try {
      await apiRequest(`${basePath}/job-positions/${position.id}`, { method: "DELETE" });
      setNotice("Job position deactivated.");
      setPositionModal(false);
      await loadPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job position.");
    }
  }

  async function saveLocation() {
    if (!selected) return;
    setError("");
    setNotice("");
    const body = { ...locationForm, location: locationForm.location || null, city: locationForm.city || null, state: locationForm.state || null, country: locationForm.country || null };
    try {
      if (editingLocation) {
        await apiRequest(`${basePath}/job-position-locations/${editingLocation.id}`, { method: "PUT", body });
        setNotice("Location updated.");
      } else {
        await apiRequest(`${basePath}/job-positions/${selected.id}/locations`, { method: "POST", body });
        setNotice("Location added.");
      }
      setLocationForm(emptyLocation);
      setEditingLocation(null);
      await loadLocations(selected.id);
      await loadPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save location.");
    }
  }

  async function deleteLocation(id: string) {
    if (!selected) return;
    try {
      await apiRequest(`${basePath}/job-position-locations/${id}`, { method: "DELETE" });
      await loadLocations(selected.id);
      await loadPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete location.");
    }
  }

  async function activateOpening() {
    if (!openingFor) return;
    setError("");
    setNotice("");
    const status = "Draft";
    const description = composeDescription(openingForm) || openingFor.description || openingForm.job_summary;
    const body = {
      code: openingForm.code || null,
      title: openingForm.title,
      job_summary: openingForm.job_summary || null,
      description,
      job_category: openingForm.job_category || null,
      department_id: openingFor.department_id || null,
      employment_type_id: openingFor.employment_type_id || null,
      work_mode: openingFor.work_mode || null,
      min_experience: optionalNumber(openingForm.min_experience),
      max_experience: optionalNumber(openingForm.max_experience),
      min_salary: optionalNumber(openingForm.min_salary),
      max_salary: optionalNumber(openingForm.max_salary),
      salary_currency: openingForm.salary_currency || null,
      salary_period: openingForm.salary_period || null,
      is_salary_visible: openingForm.is_salary_visible,
      job_status: status,
      expiry_date: optionalDate(openingForm.expiry_date),
      is_published: false,
    };
    try {
      const posting = await apiRequest<JobPosting>(`${basePath}/job-postings`, { method: "POST", body });
      await apiRequest(`${basePath}/job-postings/${posting.id}/publish`, { method: "POST", body: { expiry_date: optionalDate(openingForm.expiry_date) } });
      setNotice("Public opening activated.");
      setOpeningFor(null);
      await loadPositions();
      await loadPublishedOpenings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate opening.");
    }
  }

  async function saveCareers() {
    setError("");
    setNotice("");
    try {
      await apiRequest("/hrms/tenant-settings/careers", {
        method: "PUT",
        body: {
          value: {
            headline: careersForm.headline,
            welcome_message: careersForm.welcome_message,
            about: careersForm.about,
            core_values: careersForm.core_values.split("\n").map((item) => item.trim()).filter(Boolean),
            notices: careersForm.notices.split("\n").map((item) => item.trim()).filter(Boolean),
            seo_title: careersForm.seo_title,
            seo_description: careersForm.seo_description,
            candidate_cta: careersForm.candidate_cta,
            login_button_text: careersForm.login_button_text,
            featured_job_ids: careersForm.featured_job_ids,
          },
        },
      });
      setNotice("Career site content saved.");
      setCareerModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save career site content.");
    }
  }

  const totalHeadcount = positions.items.reduce((sum, item) => sum + item.total_position, 0);
  const openReqs = positions.items.reduce((sum, item) => sum + item.open_requisition_count, 0);

  if (initialMode === "career-site" && !isSuperAdmin) {
    return (
      <main className="space-y-5 p-6 lg:p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Hiring</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#111827]">Career Site</h1></div>
          <a className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" href="/" target="_blank" rel="noreferrer">Open Public Site</a>
        </div>
        {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Published Jobs" value={publishedOpenings.length} tone="bg-[#eef4f1] text-[#2f6f7d]" />
          <Metric label="Featured Jobs" value={careersForm.featured_job_ids.length} tone="bg-[#fff7ed] text-[#c2410c]" />
          <Metric label="Notices" value={careersForm.notices.split("\n").filter((item) => item.trim()).length} tone="bg-[#eff6ff] text-[#0369a1]" />
        </section>
        <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <CareerSiteForm careersForm={careersForm} onChange={setCareersForm} onSave={saveCareers} publishedOpenings={publishedOpenings} />
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Hiring</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#111827]">{tenant ? `${tenant.name} Job Positions` : "Job Positions"}</h1></div>
        <div className="flex flex-wrap gap-3">
          {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}
          {!isSuperAdmin ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setCareerModal(true)} type="button">Career Site</button> : null}
          <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={openNew} type="button">New Position</button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="Positions" value={positions.total} tone="bg-[#eef4f1] text-[#2f6f7d]" />
        <Metric label="Planned Headcount" value={totalHeadcount} tone="bg-[#fff7ed] text-[#c2410c]" />
        <Metric label="Open Requisitions" value={openReqs} tone="bg-[#eff6ff] text-[#0369a1]" />
      </section>

      <section className="rounded-2xl border border-[#edf1ef] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_160px_auto]">
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search title, code, category" value={search} />
          <select className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setDepartmentID(event.target.value); setOffset(0); }} value={departmentID}><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
          <select className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => { setWorkMode(event.target.value); setOffset(0); }} value={workMode}><option value="">All modes</option><option value="Office">Office</option><option value="Hybrid">Hybrid</option><option value="Remote">Remote</option></select>
          <button className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm font-black text-[#374151]" onClick={() => { setSearch(""); setDepartmentID(""); setWorkMode(""); setOffset(0); }} type="button">Reset</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Position</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Mode</th><th className="px-5 py-4">Headcount</th><th className="px-5 py-4">Budget</th><th className="px-5 py-4">Signals</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{positions.items.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No job positions found.</td></tr> : positions.items.map((position) => <tr className="align-top hover:bg-[#f8faf9]" key={position.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{position.title}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{position.code || "No code"}{position.level ? ` - ${position.level}` : ""}{position.category ? ` - ${position.category}` : ""}</span></td><td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{position.department_name || "-"}</td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{position.work_mode || "-"}</span></td><td className="px-5 py-5 text-sm font-black text-[#111827]">{position.total_position}</td><td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{money(position.budgeted_cost)}</td><td className="px-5 py-5 text-xs font-bold text-[#6b7280]">{position.location_count} locations<br />{position.open_requisition_count} open reqs</td><td className="px-5 py-5"><div className="flex justify-end gap-2"><button className="rounded-xl border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => edit(position)} type="button">Edit</button><button className="rounded-xl bg-[#111827] px-3 py-2 text-xs font-black text-white" onClick={() => openActivation(position)} type="button">Activate</button></div></td></tr>)}</tbody></table></div>
        <div className="flex items-center justify-between border-t border-[#edf1ef] p-5"><p className="text-sm font-bold text-[#6b7280]">{positions.total === 0 ? 0 : positions.offset + 1}-{Math.min(positions.offset + positions.items.length, positions.total)} of {positions.total}</p><div className="flex gap-3"><button className="rounded-xl border border-[#dbe0e5] px-4 py-2 text-sm font-black text-[#374151] disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} type="button">Previous</button><button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!positions.next_offset} onClick={() => setOffset(positions.next_offset || offset)} type="button">Next</button></div></div>
      </section>

      <HrmsModal onClose={() => setPositionModal(false)} open={positionModal} title={selected ? "Edit Position" : "New Position"}>
        <PositionForm departments={departments} employmentTypes={employmentTypes} form={form} locationForm={locationForm} locations={locations} editingLocation={editingLocation} selected={selected} setEditingLocation={setEditingLocation} setForm={setForm} setLocationForm={setLocationForm} onDeleteLocation={deleteLocation} onDeletePosition={deletePosition} onSaveLocation={saveLocation} onSavePosition={savePosition} />
      </HrmsModal>

      <HrmsModal onClose={() => setOpeningFor(null)} open={Boolean(openingFor)} title="Activate Public Opening">
        <OpeningForm form={openingForm} onCancel={() => setOpeningFor(null)} onChange={setOpeningForm} onSubmit={activateOpening} />
      </HrmsModal>

      <HrmsModal onClose={() => setCareerModal(false)} open={careerModal} title="Career Site">
        <CareerSiteForm careersForm={careersForm} compact onChange={setCareersForm} onSave={saveCareers} publishedOpenings={publishedOpenings} onCancel={() => setCareerModal(false)} />
      </HrmsModal>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`rounded-2xl p-4 ${tone}`}><p className="text-xs font-black uppercase tracking-wide opacity-80">{label}</p><strong className="mt-2 block text-2xl font-black">{value}</strong></div>;
}

const inputClass = "h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]";

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}{children}</label>;
}

function CareerSiteForm({ careersForm, compact = false, onCancel, onChange, onSave, publishedOpenings }: { careersForm: typeof emptyCareers; compact?: boolean; onCancel?: () => void; onChange: (form: typeof emptyCareers) => void; onSave: () => void; publishedOpenings: JobPosting[] }) {
  function toggleFeatured(id: string) {
    const exists = careersForm.featured_job_ids.includes(id);
    onChange({ ...careersForm, featured_job_ids: exists ? careersForm.featured_job_ids.filter((item) => item !== id) : [...careersForm.featured_job_ids, id] });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Page Headline"><input className={inputClass} value={careersForm.headline} onChange={(event) => onChange({ ...careersForm, headline: event.target.value })} placeholder="Careers at your company" /></Field>
        <Field label="Candidate CTA"><input className={inputClass} value={careersForm.candidate_cta} onChange={(event) => onChange({ ...careersForm, candidate_cta: event.target.value })} placeholder="View openings" /></Field>
        <Field label="SEO Title"><input className={inputClass} value={careersForm.seo_title} onChange={(event) => onChange({ ...careersForm, seo_title: event.target.value })} placeholder="Company careers and jobs" /></Field>
        <Field label="Login Button"><input className={inputClass} value={careersForm.login_button_text} onChange={(event) => onChange({ ...careersForm, login_button_text: event.target.value })} placeholder="Login" /></Field>
      </div>
      <Field label="Welcome Message"><textarea className={`${inputClass} min-h-24 py-3`} value={careersForm.welcome_message} onChange={(event) => onChange({ ...careersForm, welcome_message: event.target.value })} /></Field>
      <Field label="About Company"><textarea className={`${inputClass} min-h-28 py-3`} value={careersForm.about} onChange={(event) => onChange({ ...careersForm, about: event.target.value })} /></Field>
      <Field label="SEO Description"><textarea className={`${inputClass} min-h-20 py-3`} value={careersForm.seo_description} onChange={(event) => onChange({ ...careersForm, seo_description: event.target.value })} /></Field>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="HR Values"><textarea className={`${inputClass} min-h-28 py-3`} value={careersForm.core_values} onChange={(event) => onChange({ ...careersForm, core_values: event.target.value })} /></Field>
        <Field label="Public Notices"><textarea className={`${inputClass} min-h-28 py-3`} value={careersForm.notices} onChange={(event) => onChange({ ...careersForm, notices: event.target.value })} placeholder="Hiring drive on Saturday&#10;Walk-in interviews for sales roles" /></Field>
      </div>
      <div className="rounded-2xl border border-[#edf1ef] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-[#111827]">Featured openings</h3>
          <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{careersForm.featured_job_ids.length} selected</span>
        </div>
        <div className="mt-4 grid gap-2">
          {publishedOpenings.length === 0 ? <p className="rounded-xl bg-[#f8faf9] p-4 text-sm font-semibold text-[#6b7280]">Publish job openings from Job Positions or Job Postings before selecting featured jobs.</p> : publishedOpenings.map((opening) => (
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1ef] px-4 py-3 text-sm font-bold text-[#374151]" key={opening.id}>
              <span><strong className="block text-[#111827]">{opening.title || "Untitled opening"}</strong><span className="text-xs text-[#6b7280]">{opening.code || opening.job_status || "Published"}</span></span>
              <input className="h-4 w-4 accent-[#588368]" checked={careersForm.featured_job_ids.includes(opening.id)} onChange={() => toggleFeatured(opening.id)} type="checkbox" />
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button> : null}
        <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onSave} type="button">{compact ? "Save Career Site" : "Save Changes"}</button>
      </div>
    </div>
  );
}

function ModalActions({ label = "Save", onCancel, onSubmit }: { label?: string; onCancel: () => void; onSubmit: () => void }) {
  return <div className="flex justify-end gap-3 pt-2"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">{label}</button></div>;
}

function PositionForm({ departments, editingLocation, employmentTypes, form, locationForm, locations, selected, setEditingLocation, setForm, setLocationForm, onDeleteLocation, onDeletePosition, onSaveLocation, onSavePosition }: { departments: Option[]; editingLocation: Location | null; employmentTypes: EmploymentType[]; form: typeof emptyPosition; locationForm: typeof emptyLocation; locations: Location[]; selected: JobPosition | null; setEditingLocation: (loc: Location | null) => void; setForm: (form: typeof emptyPosition) => void; setLocationForm: (form: typeof emptyLocation) => void; onDeleteLocation: (id: string) => void; onDeletePosition: (position: JobPosition) => void; onSaveLocation: () => void; onSavePosition: () => void }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title"><input className={inputClass} onChange={(e) => setForm({ ...form, title: e.target.value })} value={form.title} /></Field>
        <Field label="Code"><input className={inputClass} onChange={(e) => setForm({ ...form, code: e.target.value })} value={form.code} /></Field>
        <Field label="Level"><input className={inputClass} onChange={(e) => setForm({ ...form, level: e.target.value })} value={form.level} /></Field>
        <Field label="Category"><input className={inputClass} onChange={(e) => setForm({ ...form, category: e.target.value })} value={form.category} /></Field>
        <Field label="Department"><select className={inputClass} onChange={(e) => setForm({ ...form, department_id: e.target.value })} value={form.department_id}><option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Employment Type"><select className={inputClass} onChange={(e) => setForm({ ...form, employment_type_id: e.target.value })} value={form.employment_type_id}><option value="">Employment type</option>{employmentTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Work Mode"><select className={inputClass} onChange={(e) => setForm({ ...form, work_mode: e.target.value })} value={form.work_mode}><option>Office</option><option>Hybrid</option><option>Remote</option></select></Field>
        <Field label="Headcount"><input className={inputClass} min={0} onChange={(e) => setForm({ ...form, total_position: Number(e.target.value) })} type="number" value={form.total_position} /></Field>
        <Field label="Budget"><input className={inputClass} min={0} onChange={(e) => setForm({ ...form, budgeted_cost: e.target.value })} type="number" value={form.budgeted_cost} /></Field>
      </div>
      <Field label="Internal Description"><textarea className={`${inputClass} min-h-24 py-3`} onChange={(e) => setForm({ ...form, description: e.target.value })} value={form.description} /></Field>
      <div className="flex justify-end gap-3"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:bg-[#a8b7ae]" disabled={!form.title.trim()} onClick={onSavePosition} type="button">{selected ? "Update Position" : "Create Position"}</button>{selected ? <button className="rounded-xl border border-[#fee2e2] px-4 py-3 text-sm font-black text-[#b91c1c]" onClick={() => onDeletePosition(selected)} type="button">Deactivate</button> : null}</div>
      {selected ? <div className="rounded-2xl border border-[#edf1ef] p-4"><h3 className="text-sm font-black text-[#111827]">Locations</h3><div className="mt-4 grid gap-3"><label className="flex items-center gap-2 text-sm font-black text-[#374151]"><input checked={locationForm.is_remote} onChange={(e) => setLocationForm({ ...locationForm, is_remote: e.target.checked })} type="checkbox" />Remote location</label><input className={inputClass} onChange={(e) => setLocationForm({ ...locationForm, location: e.target.value })} placeholder="Location name" value={locationForm.location} /><div className="grid gap-3 md:grid-cols-3"><input className={inputClass} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} placeholder="City" value={locationForm.city} /><input className={inputClass} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} placeholder="State" value={locationForm.state} /><input className={inputClass} onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })} placeholder="Country" value={locationForm.country} /></div><button className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white" onClick={onSaveLocation} type="button">{editingLocation ? "Update Location" : "Add Location"}</button></div><div className="mt-4 divide-y divide-[#edf1ef]">{locations.length === 0 ? <p className="py-3 text-sm font-semibold text-[#6b7280]">No locations added.</p> : locations.map((loc) => <div className="flex items-center justify-between gap-3 py-3" key={loc.id}><div><strong className="block text-sm text-[#111827]">{loc.is_remote ? "Remote" : loc.location || loc.city || "Location"}</strong><span className="text-xs font-semibold text-[#6b7280]">{[loc.city, loc.state, loc.country].filter(Boolean).join(", ") || "-"}</span></div><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151]" onClick={() => { setEditingLocation(loc); setLocationForm({ location: loc.location || "", city: loc.city || "", state: loc.state || "", country: loc.country || "", is_remote: loc.is_remote }); }} type="button">Edit</button><button className="rounded-lg border border-[#fee2e2] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => onDeleteLocation(loc.id)} type="button">Delete</button></div></div>)}</div></div> : null}
    </div>
  );
}

function OpeningForm({ form, onCancel, onChange, onSubmit }: { form: typeof emptyOpening; onCancel: () => void; onChange: (form: typeof emptyOpening) => void; onSubmit: () => void }) {
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Opening Title"><input className={inputClass} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></Field><Field label="Code"><input className={inputClass} value={form.code} onChange={(event) => onChange({ ...form, code: event.target.value })} /></Field><Field label="Category"><input className={inputClass} value={form.job_category} onChange={(event) => onChange({ ...form, job_category: event.target.value })} /></Field><Field label="Expiry Date"><input className={inputClass} type="date" value={form.expiry_date} onChange={(event) => onChange({ ...form, expiry_date: event.target.value })} /></Field><Field label="Min Experience"><input className={inputClass} min="0" type="number" value={form.min_experience} onChange={(event) => onChange({ ...form, min_experience: event.target.value })} /></Field><Field label="Max Experience"><input className={inputClass} min="0" type="number" value={form.max_experience} onChange={(event) => onChange({ ...form, max_experience: event.target.value })} /></Field></div><Field label="Public Summary"><textarea className={`${inputClass} min-h-20 py-3`} value={form.job_summary} onChange={(event) => onChange({ ...form, job_summary: event.target.value })} /></Field><Field label="Responsibilities"><textarea className={`${inputClass} min-h-24 py-3`} value={form.responsibilities} onChange={(event) => onChange({ ...form, responsibilities: event.target.value })} /></Field><Field label="Requirements"><textarea className={`${inputClass} min-h-24 py-3`} value={form.requirements} onChange={(event) => onChange({ ...form, requirements: event.target.value })} /></Field><Field label="Benefits"><textarea className={`${inputClass} min-h-20 py-3`} value={form.benefits} onChange={(event) => onChange({ ...form, benefits: event.target.value })} /></Field><div className="grid gap-4 md:grid-cols-4"><Field label="Min Salary"><input className={inputClass} min="0" type="number" value={form.min_salary} onChange={(event) => onChange({ ...form, min_salary: event.target.value })} /></Field><Field label="Max Salary"><input className={inputClass} min="0" type="number" value={form.max_salary} onChange={(event) => onChange({ ...form, max_salary: event.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={form.salary_currency} onChange={(event) => onChange({ ...form, salary_currency: event.target.value })} /></Field><Field label="Period"><select className={inputClass} value={form.salary_period} onChange={(event) => onChange({ ...form, salary_period: event.target.value })}><option value="year">Year</option><option value="month">Month</option><option value="hour">Hour</option></select></Field></div><label className="flex items-center gap-2 text-sm font-black text-[#374151]"><input checked={form.is_salary_visible} onChange={(event) => onChange({ ...form, is_salary_visible: event.target.checked })} type="checkbox" />Show salary on public careers page</label><ModalActions label="Activate Opening" onCancel={onCancel} onSubmit={onSubmit} /></div>;
}
