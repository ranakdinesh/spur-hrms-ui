"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Project = { id: string; name: string; project_code?: string | null; status?: string };
type Engagement = { id: string; title: string; engagement_code?: string | null; project_label?: string | null; worker_display_name?: string | null };
type Skill = { id: string; code: string; name: string; skill_type: string; category_name?: string | null };
type Requirement = {
  id: string;
  project_id?: string | null;
  project_name?: string | null;
  engagement_id?: string | null;
  engagement_title?: string | null;
  skill_id: string;
  skill_name?: string | null;
  skill_code?: string | null;
  required_proficiency: string;
  min_years_experience?: number | null;
  required_count: number;
  importance: string;
  requirement_source: string;
  notes?: string | null;
};
type GapRow = {
  requirement_id: string;
  project_name?: string | null;
  engagement_title?: string | null;
  skill_name: string;
  skill_code: string;
  required_proficiency: string;
  min_years_experience?: number | null;
  required_count: number;
  importance: string;
  assigned_match_count: number;
  available_match_count: number;
  gap_count: number;
  match_percent: number;
  single_person_dependency: boolean;
  suggested_action: string;
};
type SummaryRow = { project_id?: string | null; project_name: string; project_code?: string | null; requirement_count: number; missing_skill_count: number; mandatory_gap_count: number; average_match_percent: number; single_person_dependency_count: number };
type DependencyRow = { requirement_id: string; project_name?: string | null; engagement_title?: string | null; skill_name: string; importance: string; worker_profile_id: string; worker_display_name: string; worker_code?: string | null; proficiency: string; years_experience?: number | null };
type Tab = "summary" | "requirements" | "gaps" | "dependencies";

const proficiencies = ["beginner", "intermediate", "advanced", "expert"];
const importances = ["nice_to_have", "required", "critical"];
const sources = ["project", "engagement", "role", "client", "compliance"];

function label(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function statusTone(value: string) {
  if (value === "critical" || value === "hire_or_contract") return "bg-[#fee2e2] text-[#b91c1c]";
  if (value === "required" || value === "train_or_assign") return "bg-[#fef3c7] text-[#92400e]";
  if (value === "covered") return "bg-[#e7f6ed] text-[#237a45]";
  return "bg-[#eef4f1] text-[#588368]";
}

function defaultRequirementForm() {
  return { project_id: "", engagement_id: "", skill_id: "", required_proficiency: "intermediate", min_years_experience: "", required_count: "1", importance: "required", requirement_source: "project", notes: "" };
}

export function SkillGapsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Skill Gaps" subtitle="Open a tenant to review project coverage and single-person dependencies." />
        {tenantsError ? <Alert tone="danger" text={tenantsError} /> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : tenantRows.map((row) => (
                <tr className="hover:bg-[#f8faf9]" key={row.id}>
                  <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{row.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{row.code}</span></td>
                  <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{row.plan}</span></td>
                  <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{row.status}</td>
                  <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setTenant(row)} type="button">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  }

  return <SkillGapsWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function SkillGapsWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("summary");
  const [projects, setProjects] = useState<Project[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [dependencies, setDependencies] = useState<DependencyRow[]>([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [importanceFilter, setImportanceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [form, setForm] = useState(defaultRequirementForm());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (projectFilter) params.set("project_id", projectFilter);
    if (importanceFilter) params.set("importance", importanceFilter);
    if (search) params.set("search", search);
    const suffix = params.toString() ? `?${params}` : "";
    const projectSuffix = projectFilter ? `?project_id=${encodeURIComponent(projectFilter)}` : "";
    const [projectRows, engagementRows, skillRows, requirementRows, gapRows, summaryRows, dependencyRows] = await Promise.all([
      apiRequest<Project[]>(`${basePath}/projects`).catch(() => []),
      apiRequest<Engagement[]>(`${basePath}/engagements`).catch(() => []),
      apiRequest<Skill[]>(`${basePath}/skills`).catch(() => []),
      apiRequest<Requirement[]>(`${basePath}/project-skill-requirements${suffix}`).catch(() => []),
      apiRequest<GapRow[]>(`${basePath}/project-skill-gaps${suffix}`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/skill-gap-summary${projectSuffix}`).catch(() => []),
      apiRequest<DependencyRow[]>(`${basePath}/single-person-skill-dependencies${projectSuffix}`).catch(() => []),
    ]);
    setProjects(projectRows);
    setEngagements(engagementRows);
    setSkills(skillRows);
    setRequirements(requirementRows);
    setGaps(gapRows);
    setSummary(summaryRows);
    setDependencies(dependencyRows);
    setForm((current) => ({ ...current, project_id: current.project_id || projectRows[0]?.id || "", skill_id: current.skill_id || skillRows[0]?.id || "" }));
  }, [basePath, importanceFilter, projectFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load skill gaps."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const mandatoryGaps = summary.reduce((sum, row) => sum + row.mandatory_gap_count, 0);
    const missing = summary.reduce((sum, row) => sum + row.missing_skill_count, 0);
    const dependenciesCount = summary.reduce((sum, row) => sum + row.single_person_dependency_count, 0);
    const average = summary.length ? Math.round(summary.reduce((sum, row) => sum + row.average_match_percent, 0) / summary.length) : 0;
    return { requirements: requirements.length, mandatoryGaps, missing, dependencies: dependenciesCount, average };
  }, [requirements.length, summary]);

  function openRequirement(item?: Requirement) {
    setEditing(item || null);
    setForm(item ? {
      project_id: item.project_id || "",
      engagement_id: item.engagement_id || "",
      skill_id: item.skill_id,
      required_proficiency: item.required_proficiency,
      min_years_experience: item.min_years_experience == null ? "" : String(item.min_years_experience),
      required_count: String(item.required_count || 1),
      importance: item.importance,
      requirement_source: item.requirement_source,
      notes: item.notes || "",
    } : { ...defaultRequirementForm(), project_id: projectFilter || projects[0]?.id || "", skill_id: skills[0]?.id || "" });
    setModalOpen(true);
  }

  async function submitRequirement() {
    setError(""); setNotice("");
    const payload = {
      project_id: form.project_id || null,
      engagement_id: form.engagement_id || null,
      skill_id: form.skill_id,
      required_proficiency: form.required_proficiency,
      min_years_experience: form.min_years_experience ? Number(form.min_years_experience) : null,
      required_count: Number(form.required_count || 1),
      importance: form.importance,
      requirement_source: form.requirement_source,
      notes: form.notes || null,
      metadata: {},
    };
    const path = editing ? `${basePath}/project-skill-requirements/${editing.id}` : `${basePath}/project-skill-requirements`;
    await apiRequest(path, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
    setNotice(editing ? "Requirement updated." : "Requirement created.");
    setModalOpen(false);
    setEditing(null);
    await load();
  }

  async function deleteRequirement(item: Requirement) {
    if (!window.confirm(`Deactivate ${item.skill_name || "this requirement"}?`)) return;
    setError(""); setNotice("");
    await apiRequest(`${basePath}/project-skill-requirements/${item.id}`, { method: "DELETE" });
    setNotice("Requirement deactivated.");
    await load();
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <Header title="Skill Gaps" subtitle={tenant ? tenant.name : "Project staffing coverage, missing skills, and dependency risk."} action={onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null} />
      {notice ? <Alert tone="success" text={notice} /> : null}
      {error ? <Alert tone="danger" text={error} /> : null}

      <section className="grid gap-4 md:grid-cols-5">
        <Metric label="Requirements" value={String(metrics.requirements)} />
        <Metric label="Avg Match" value={`${metrics.average}%`} />
        <Metric label="Missing" value={String(metrics.missing)} />
        <Metric label="Mandatory Gaps" value={String(metrics.mandatoryGaps)} />
        <Metric label="Dependencies" value={String(metrics.dependencies)} />
      </section>

      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <select className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setImportanceFilter(event.target.value)} value={importanceFilter}>
            <option value="">All priorities</option>
            {importances.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <input className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search skill, project, engagement" value={search} />
          <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openRequirement()} type="button">New Requirement</button>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {(["summary", "requirements", "gaps", "dependencies"] as Tab[]).map((item) => (
          <button className={`rounded-full px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-[#111827] text-white" : "border border-[#dbe0e5] bg-white text-[#4b5563]"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>
        ))}
      </section>

      {tab === "summary" ? <SummaryTable rows={summary} /> : null}
      {tab === "requirements" ? <RequirementsTable onDelete={deleteRequirement} onEdit={openRequirement} rows={requirements} /> : null}
      {tab === "gaps" ? <GapsTable rows={gaps} /> : null}
      {tab === "dependencies" ? <DependenciesTable rows={dependencies} /> : null}

      <HrmsModal onClose={() => setModalOpen(false)} open={modalOpen} title={editing ? "Edit Skill Requirement" : "New Skill Requirement"}>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project"><select className={inputClass} value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })}><option value="">No project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Engagement"><select className={inputClass} value={form.engagement_id} onChange={(event) => setForm({ ...form, engagement_id: event.target.value })}><option value="">No engagement</option>{engagements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
            <Field label="Skill"><select className={inputClass} required value={form.skill_id} onChange={(event) => setForm({ ...form, skill_id: event.target.value })}><option value="">Select skill</option>{skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Proficiency"><select className={inputClass} value={form.required_proficiency} onChange={(event) => setForm({ ...form, required_proficiency: event.target.value })}>{proficiencies.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
            <Field label="People Required"><input className={inputClass} min="1" type="number" value={form.required_count} onChange={(event) => setForm({ ...form, required_count: event.target.value })} /></Field>
            <Field label="Minimum Years"><input className={inputClass} min="0" step="0.5" type="number" value={form.min_years_experience} onChange={(event) => setForm({ ...form, min_years_experience: event.target.value })} /></Field>
            <Field label="Importance"><select className={inputClass} value={form.importance} onChange={(event) => setForm({ ...form, importance: event.target.value })}>{importances.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
            <Field label="Source"><select className={inputClass} value={form.requirement_source} onChange={(event) => setForm({ ...form, requirement_source: event.target.value })}>{sources.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
          </div>
          <Field label="Notes"><textarea className={`${inputClass} min-h-24`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <div className="flex justify-end gap-3">
            <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setModalOpen(false)} type="button">Cancel</button>
            <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={() => void submitRequirement().catch((err) => setError(err instanceof Error ? err.message : "Unable to save requirement."))} type="button">Save</button>
          </div>
        </div>
      </HrmsModal>
    </main>
  );
}

const inputClass = "w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold outline-none focus:border-[#588368]";

function Header({ action, subtitle, title }: { action?: ReactNode; subtitle: string; title: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black text-[#111827]">{title}</h1><p className="mt-2 text-sm font-semibold text-[#6b7280]">{subtitle}</p></div>{action}</div>;
}

function Alert({ text, tone }: { text: string; tone: "success" | "danger" }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-[#b7e2c5] bg-[#f0fbf4] text-[#237a45]" : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"}`}>{text}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><p className="mt-2 text-3xl font-black text-[#111827]">{value}</p></div>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}<button className="grid size-5 place-items-center rounded-full border border-[#dbe0e5] text-[11px]" title={`Configure ${label.toLowerCase()}`} type="button">i</button></span>{children}</label>;
}

function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return <Table empty="No project skill summary yet." headers={["Project", "Requirements", "Missing", "Mandatory", "Match", "Dependencies"]}>{rows.map((row) => <tr key={row.project_id || row.project_name} className="hover:bg-[#f8faf9]"><Cell title={row.project_name} sub={row.project_code || ""} /><td className="px-5 py-4 font-bold">{row.requirement_count}</td><td className="px-5 py-4 font-bold">{row.missing_skill_count}</td><td className="px-5 py-4 font-bold">{row.mandatory_gap_count}</td><td className="px-5 py-4 font-bold">{row.average_match_percent}%</td><td className="px-5 py-4 font-bold">{row.single_person_dependency_count}</td></tr>)}</Table>;
}

function RequirementsTable({ onDelete, onEdit, rows }: { rows: Requirement[]; onDelete: (row: Requirement) => void; onEdit: (row: Requirement) => void; }) {
  return <Table empty="No skill requirements yet." headers={["Target", "Skill", "Need", "Importance", "Actions"]}>{rows.map((row) => <tr key={row.id} className="hover:bg-[#f8faf9]"><Cell title={row.project_name || row.engagement_title || "Unassigned"} sub={row.engagement_title || ""} /><Cell title={row.skill_name || "-"} sub={row.skill_code || ""} /><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{row.required_count} x {label(row.required_proficiency)}{row.min_years_experience ? `, ${row.min_years_experience}+ yrs` : ""}</td><td className="px-5 py-4"><Pill value={row.importance} /></td><td className="px-5 py-4 text-right"><button className="mr-2 rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => onEdit(row)} type="button">Edit</button><button className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-black text-[#b91c1c]" onClick={() => onDelete(row)} type="button">Delete</button></td></tr>)}</Table>;
}

function GapsTable({ rows }: { rows: GapRow[] }) {
  return <Table empty="No skill gaps found." headers={["Target", "Skill", "Coverage", "Gap", "Action", "Risk"]}>{rows.map((row) => <tr key={row.requirement_id} className="hover:bg-[#f8faf9]"><Cell title={row.project_name || row.engagement_title || "Unassigned"} sub={row.engagement_title || ""} /><Cell title={row.skill_name} sub={`${row.skill_code} · ${label(row.required_proficiency)}`} /><td className="px-5 py-4 text-sm font-bold text-[#4b5563]">{row.assigned_match_count}/{row.required_count} assigned · {row.available_match_count} available</td><td className="px-5 py-4 font-black">{row.gap_count} ({row.match_percent}%)</td><td className="px-5 py-4"><Pill value={row.suggested_action} /></td><td className="px-5 py-4 text-sm font-bold">{row.single_person_dependency ? "Single person" : "-"}</td></tr>)}</Table>;
}

function DependenciesTable({ rows }: { rows: DependencyRow[] }) {
  return <Table empty="No single-person dependencies." headers={["Target", "Skill", "Only Match", "Level", "Importance"]}>{rows.map((row) => <tr key={`${row.requirement_id}-${row.worker_profile_id}`} className="hover:bg-[#f8faf9]"><Cell title={row.project_name || row.engagement_title || "Unassigned"} sub={row.engagement_title || ""} /><Cell title={row.skill_name} sub="" /><Cell title={row.worker_display_name} sub={row.worker_code || ""} /><td className="px-5 py-4 text-sm font-bold">{label(row.proficiency)}{row.years_experience ? ` · ${row.years_experience} yrs` : ""}</td><td className="px-5 py-4"><Pill value={row.importance} /></td></tr>)}</Table>;
}

function Table({ children, empty, headers }: { children: ReactNode; empty: string; headers: string[] }) {
  const rows = Array.isArray(children) ? children : [children];
  return <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><table className="w-full min-w-[860px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr>{headers.map((item) => <th className="px-5 py-4" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{rows.length && rows.some(Boolean) ? children : <tr><td className="px-5 py-10 text-center text-sm font-bold text-[#6b7280]" colSpan={headers.length}>{empty}</td></tr>}</tbody></table></section>;
}

function Cell({ sub, title }: { sub?: string; title: string }) {
  return <td className="px-5 py-4"><strong className="block text-sm text-[#111827]">{title}</strong>{sub ? <span className="mt-1 block text-xs font-bold text-[#6b7280]">{sub}</span> : null}</td>;
}

function Pill({ value }: { value: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusTone(value)}`}>{label(value)}</span>;
}
