"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { BranchTenantOption } from "@/components/hrms/BranchesSection";

type Designation = {
  id: string;
  tenant_id: string;
  name: string;
  level_code: string;
  seniority_rank: number;
  description?: string | null;
  attendance_required: boolean;
  inactive: boolean;
  created_at: string;
  updated_at: string;
};

type DesignationLevelCode = {
  id: string;
  tenant_id: string;
  code: string;
  label: string;
  description?: string | null;
  sort_order: number;
  inactive: boolean;
};

type DesignationSeniorityRank = {
  id: string;
  tenant_id: string;
  rank_value: number;
  label: string;
  description?: string | null;
  sort_order: number;
  inactive: boolean;
};

type DesignationFormState = {
  name: string;
  levelCode: string;
  seniorityRank: string;
  description: string;
  attendanceRequired: boolean;
};

type LevelCodeFormState = {
  code: string;
  label: string;
  description: string;
  sortOrder: string;
};

type SeniorityRankFormState = {
  rankValue: string;
  label: string;
  description: string;
  sortOrder: string;
};

type TenantSortKey = "name" | "status" | "plan" | "joined";

const emptyDesignationForm: DesignationFormState = {
  name: "",
  levelCode: "",
  seniorityRank: "",
  description: "",
  attendanceRequired: true,
};

const emptyLevelCodeForm: LevelCodeFormState = {
  code: "",
  label: "",
  description: "",
  sortOrder: "",
};

const emptySeniorityRankForm: SeniorityRankFormState = {
  rankValue: "",
  label: "",
  description: "",
  sortOrder: "",
};

function designationToForm(designation: Designation): DesignationFormState {
  return {
    name: designation.name || "",
    levelCode: designation.level_code || "",
    seniorityRank: String(designation.seniority_rank || ""),
    description: designation.description || "",
    attendanceRequired: designation.attendance_required !== false,
  };
}

function levelCodeToForm(item: DesignationLevelCode): LevelCodeFormState {
  return {
    code: item.code || "",
    label: item.label || "",
    description: item.description || "",
    sortOrder: String(item.sort_order ?? ""),
  };
}

function seniorityRankToForm(item: DesignationSeniorityRank): SeniorityRankFormState {
  return {
    rankValue: String(item.rank_value || ""),
    label: item.label || "",
    description: item.description || "",
    sortOrder: String(item.sort_order ?? ""),
  };
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : undefined;
}

function cleanDesignationPayload(form: DesignationFormState, canManageAttendanceRequirement: boolean) {
  const payload: { name: string; level_code: string; seniority_rank: number; description?: string; attendance_required?: boolean } = {
    name: form.name.trim(),
    level_code: form.levelCode.trim().toUpperCase(),
    seniority_rank: Number(form.seniorityRank),
    description: optionalString(form.description),
  };
  if (canManageAttendanceRequirement) payload.attendance_required = form.attendanceRequired;
  return payload;
}

function cleanLevelCodePayload(form: LevelCodeFormState) {
  return {
    code: form.code.trim().toUpperCase(),
    label: form.label.trim(),
    description: optionalString(form.description),
    sort_order: Number(form.sortOrder || 0),
  };
}

function cleanSeniorityRankPayload(form: SeniorityRankFormState) {
  return {
    rank_value: Number(form.rankValue),
    label: form.label.trim(),
    description: optionalString(form.description),
    sort_order: Number(form.sortOrder || 0),
  };
}

function formatDesignationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

export function DesignationsSection({
  isSuperAdmin,
  tenants,
  tenantsLoading,
  tenantsError,
  canManageAttendanceRequirement = false,
}: {
  isSuperAdmin: boolean;
  tenants: BranchTenantOption[];
  tenantsLoading: boolean;
  tenantsError: string;
  canManageAttendanceRequirement?: boolean;
}) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantSort, setTenantSort] = useState<TenantSortKey>("name");

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.subdomainUrl, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => tenantSortValue(a, tenantSort).localeCompare(tenantSortValue(b, tenantSort)));
  }, [tenantSearch, tenantSort, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Designations</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant first. Designations and their level masters are tenant-owned and cannot be managed globally.</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenant{tenants.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
              <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}>
                <option value="name">Sort by name</option>
                <option value="status">Sort by status</option>
                <option value="plan">Sort by plan</option>
                <option value="joined">Sort by joined</option>
              </select>
            </div>
          </div>

          {tenantsError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">Tenant</th>
                  <th className="px-5 py-4">Subdomain</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading tenants...</td></tr>
                ) : filteredTenants.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No tenants match your search.</td></tr>
                ) : filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4f1] text-sm font-black text-[#588368]">{tenant.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong className="block text-sm text-[#111827]">{tenant.name}</strong>
                          <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} · {tenant.kind}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.joined}</td>
                    <td className="px-5 py-5 text-right">
                      <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Designations</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <DesignationManager canManageAttendanceRequirement={canManageAttendanceRequirement || isSuperAdmin} isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function DesignationManager({ canManageAttendanceRequirement, isSuperAdmin, tenant, onBack }: { canManageAttendanceRequirement: boolean; isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [levelCodes, setLevelCodes] = useState<DesignationLevelCode[]>([]);
  const [seniorityRanks, setSeniorityRanks] = useState<DesignationSeniorityRank[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMaster, setSavingMaster] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [editingLevelCode, setEditingLevelCode] = useState<DesignationLevelCode | null>(null);
  const [editingSeniorityRank, setEditingSeniorityRank] = useState<DesignationSeniorityRank | null>(null);
  const [form, setForm] = useState<DesignationFormState>(emptyDesignationForm);
  const [levelCodeForm, setLevelCodeForm] = useState<LevelCodeFormState>(emptyLevelCodeForm);
  const [seniorityRankForm, setSeniorityRankForm] = useState<SeniorityRankFormState>(emptySeniorityRankForm);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/designations` : "/hrms/designations";
  const levelCodesPath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/designation-level-codes` : "/hrms/designation-level-codes";
  const seniorityRanksPath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/designation-seniority-ranks` : "/hrms/designation-seniority-ranks";

  const loadDesignations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<Designation[]>(basePath);
      setDesignations(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load designations.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  const loadMasters = useCallback(async () => {
    setMastersLoading(true);
    setError("");
    try {
      const [levelResult, rankResult] = await Promise.all([
        apiRequest<DesignationLevelCode[]>(levelCodesPath),
        apiRequest<DesignationSeniorityRank[]>(seniorityRanksPath),
      ]);
      setLevelCodes(levelResult);
      setSeniorityRanks(rankResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load designation masters.");
    } finally {
      setMastersLoading(false);
    }
  }, [levelCodesPath, seniorityRanksPath]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDesignations();
      loadMasters();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDesignations, loadMasters]);

  const filteredDesignations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return designations;
    return designations.filter((designation) => [designation.name, designation.level_code, String(designation.seniority_rank), designation.description || "", designation.attendance_required === false ? "attendance not required exempt" : "attendance required"].some((value) => value.toLowerCase().includes(query)));
  }, [designations, search]);

  function updateField(field: keyof DesignationFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateLevelField(field: keyof LevelCodeFormState, value: string) {
    setLevelCodeForm((current) => ({ ...current, [field]: value }));
  }

  function updateRankField(field: keyof SeniorityRankFormState, value: string) {
    setSeniorityRankForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingDesignation(null);
    setForm(emptyDesignationForm);
    setError("");
    setMessage("");
  }

  function resetLevelCodeForm() {
    setEditingLevelCode(null);
    setLevelCodeForm(emptyLevelCodeForm);
  }

  function resetSeniorityRankForm() {
    setEditingSeniorityRank(null);
    setSeniorityRankForm(emptySeniorityRankForm);
  }

  async function saveDesignation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = cleanDesignationPayload(form, canManageAttendanceRequirement);
    if (!payload.name) {
      setSaving(false);
      setError("Designation name is required.");
      return;
    }
    if (!payload.level_code) {
      setSaving(false);
      setError("Level code is required.");
      return;
    }
    if (!Number.isInteger(payload.seniority_rank) || payload.seniority_rank < 1 || payload.seniority_rank > 9999) {
      setSaving(false);
      setError("Seniority rank is required.");
      return;
    }
    try {
      if (editingDesignation) {
        await apiRequest<Designation>(`${basePath}/${editingDesignation.id}`, { method: "PUT", body: payload });
        setMessage("Designation updated.");
      } else {
        await apiRequest<Designation>(basePath, { method: "POST", body: payload });
        setMessage("Designation created.");
      }
      setEditingDesignation(null);
      setForm(emptyDesignationForm);
      await loadDesignations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save designation.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLevelCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMaster(true);
    setError("");
    setMessage("");
    const payload = cleanLevelCodePayload(levelCodeForm);
    if (!payload.code || !payload.label) {
      setSavingMaster(false);
      setError("Level code and label are required.");
      return;
    }
    try {
      if (editingLevelCode) {
        await apiRequest<DesignationLevelCode>(`${levelCodesPath}/${editingLevelCode.id}`, { method: "PUT", body: payload });
        setMessage("Level code updated.");
      } else {
        await apiRequest<DesignationLevelCode>(levelCodesPath, { method: "POST", body: payload });
        setMessage("Level code created.");
      }
      resetLevelCodeForm();
      await loadMasters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save level code.");
    } finally {
      setSavingMaster(false);
    }
  }

  async function saveSeniorityRank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMaster(true);
    setError("");
    setMessage("");
    const payload = cleanSeniorityRankPayload(seniorityRankForm);
    if (!payload.label || !Number.isInteger(payload.rank_value) || payload.rank_value < 1 || payload.rank_value > 9999) {
      setSavingMaster(false);
      setError("Seniority rank and label are required.");
      return;
    }
    try {
      if (editingSeniorityRank) {
        await apiRequest<DesignationSeniorityRank>(`${seniorityRanksPath}/${editingSeniorityRank.id}`, { method: "PUT", body: payload });
        setMessage("Seniority rank updated.");
      } else {
        await apiRequest<DesignationSeniorityRank>(seniorityRanksPath, { method: "POST", body: payload });
        setMessage("Seniority rank created.");
      }
      resetSeniorityRankForm();
      await loadMasters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save seniority rank.");
    } finally {
      setSavingMaster(false);
    }
  }

  async function deleteDesignation(designation: Designation) {
    if (!window.confirm(`Deactivate ${designation.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${basePath}/${designation.id}`, { method: "DELETE" });
      setMessage("Designation deactivated.");
      await loadDesignations();
      if (editingDesignation?.id === designation.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate designation.");
    }
  }

  async function deleteLevelCode(item: DesignationLevelCode) {
    if (!window.confirm(`Deactivate level code ${item.code}? Existing designations keep their saved value.`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${levelCodesPath}/${item.id}`, { method: "DELETE" });
      setMessage("Level code deactivated.");
      await loadMasters();
      if (editingLevelCode?.id === item.id) resetLevelCodeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate level code.");
    }
  }

  async function deleteSeniorityRank(item: DesignationSeniorityRank) {
    if (!window.confirm(`Deactivate seniority rank ${item.rank_value}? Existing designations keep their saved value.`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`${seniorityRanksPath}/${item.id}`, { method: "DELETE" });
      setMessage("Seniority rank deactivated.");
      await loadMasters();
      if (editingSeniorityRank?.id === item.id) resetSeniorityRankForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate seniority rank.");
    }
  }

  const title = tenant ? `${tenant.name} Designations` : "Designations";
  const description = tenant ? `Managing designations for ${tenant.name}.` : "Manage your tenant designations.";

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">← Back to tenants</button> : null}
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">{description} Level code and seniority rank are selected from tenant masters, so each tenant can adjust its own hierarchy.</p>
        </div>
        <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={resetForm} type="button">New Designation</button>
      </div>

      <div className="grid gap-8">
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111827]">Designation Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredDesignations.length} shown from {designations.length} designation{designations.length === 1 ? "" : "s"}</p>
            </div>
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search name, level, attendance" value={search} />
          </div>

          {error ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="m-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

          <div className="grid gap-3 p-4 md:hidden">
            {loading ? (
              <p className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-8 text-center text-sm font-semibold text-[#6b7280]">Loading designations...</p>
            ) : filteredDesignations.length === 0 ? (
              <p className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-8 text-center text-sm font-semibold text-[#6b7280]">No designations found.</p>
            ) : filteredDesignations.map((designation) => (
              <article className="rounded-xl border border-[#edf1ef] bg-white p-4 shadow-sm" key={designation.id}>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef4f1] text-sm font-black text-[#588368]">{designation.name.slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-[#111827]">{designation.name}</strong>
                        <span className="mt-1 block text-xs font-semibold text-[#6b7280]">Level {designation.level_code}</span>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${designation.attendance_required === false ? "bg-slate-100 text-slate-700" : "bg-[#ecfdf3] text-[#16803c]"}`}>
                        {designation.attendance_required === false ? "Not required" : "Required"}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="font-bold uppercase text-[#6b7280]">Seniority</dt>
                        <dd className="mt-1 font-black text-[#111827]">{designation.seniority_rank}</dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase text-[#6b7280]">Updated</dt>
                        <dd className="mt-1 font-semibold text-[#4b5563]">{formatDesignationDate(designation.updated_at)}</dd>
                      </div>
                    </dl>
                    {designation.description ? <p className="mt-3 text-xs font-semibold leading-5 text-[#4b5563]">{designation.description}</p> : null}
                    <div className="mt-4 flex justify-end gap-2">
                      <DesignationIconButton label={`Edit ${designation.name}`} onClick={() => { setEditingDesignation(designation); setForm(designationToForm(designation)); setError(""); setMessage(""); }}><EditIcon /></DesignationIconButton>
                      <DesignationIconButton danger label={`Deactivate ${designation.name}`} onClick={() => deleteDesignation(designation)}><TrashIcon /></DesignationIconButton>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">Designation</th>
                  <th className="px-5 py-4">Level</th>
                  <th className="px-5 py-4">Seniority</th>
                  <th className="px-5 py-4">Attendance</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4">Updated</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>Loading designations...</td></tr>
                ) : filteredDesignations.length === 0 ? (
                  <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={7}>No designations found.</td></tr>
                ) : filteredDesignations.map((designation) => (
                  <tr className="hover:bg-[#f8faf9]" key={designation.id}>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4f1] text-sm font-black text-[#588368]">{designation.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong className="block text-sm text-[#111827]">{designation.name}</strong>
                          <span className="mt-1 block text-xs font-semibold text-[#6b7280]">Level {designation.level_code}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{designation.level_code}</span></td>
                    <td className="px-5 py-5 text-sm font-black text-[#111827]">{designation.seniority_rank}</td>
                    <td className="px-5 py-5">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${designation.attendance_required === false ? "bg-slate-100 text-slate-700" : "bg-[#ecfdf3] text-[#16803c]"}`}>
                        {designation.attendance_required === false ? "Not required" : "Required"}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{designation.description || "-"}</td>
                    <td className="px-5 py-5 text-sm text-[#4b5563]">{formatDesignationDate(designation.updated_at)}</td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        <DesignationIconButton label={`Edit ${designation.name}`} onClick={() => { setEditingDesignation(designation); setForm(designationToForm(designation)); setError(""); setMessage(""); }}><EditIcon /></DesignationIconButton>
                        <DesignationIconButton danger label={`Deactivate ${designation.name}`} onClick={() => deleteDesignation(designation)}><TrashIcon /></DesignationIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-5 shadow-sm">
          <form className="rounded-2xl bg-white p-5" onSubmit={saveDesignation}>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">{editingDesignation ? "Edit Designation" : "New Designation"}</p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">{editingDesignation ? editingDesignation.name : "Create Designation"}</h2>
            <div className="mt-5 grid gap-4">
              <DesignationField label="Designation Name" onChange={(value) => updateField("name", value)} required value={form.name} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Level Code" onChange={(value) => updateField("levelCode", value)} required value={form.levelCode}>
                  <option value="">Select level</option>
                  {levelCodes.map((item) => <option key={item.id} value={item.code}>{item.code} - {item.label}</option>)}
                </SelectField>
                <SelectField label="Seniority Rank" onChange={(value) => updateField("seniorityRank", value)} required value={form.seniorityRank}>
                  <option value="">Select rank</option>
                  {seniorityRanks.map((item) => <option key={item.id} value={item.rank_value}>{item.rank_value} - {item.label}</option>)}
                </SelectField>
              </div>
              {mastersLoading ? <p className="rounded-xl bg-[#f4fbf8] px-4 py-3 text-xs font-semibold text-[#6b7280]">Loading designation masters...</p> : null}
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Description</span>
                <textarea className="min-h-28 w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => updateField("description", event.target.value)} value={form.description} />
              </label>
              {canManageAttendanceRequirement ? (
                <label className="flex items-center justify-between gap-4 rounded-lg border border-[#dbe0e5] bg-[#f8faf9] px-4 py-3">
                  <span>
                    <span className="block text-sm font-black text-[#111827]">Attendance required</span>
                    <span className="mt-1 block text-xs font-semibold text-[#6b7280]">Employees in this designation must check in and check out.</span>
                  </span>
                  <input checked={form.attendanceRequired} className="h-5 w-5 accent-[#588368]" onChange={(event) => updateField("attendanceRequired", event.target.checked)} type="checkbox" />
                </label>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-semibold text-[#374151]" onClick={resetForm} type="button">Clear</button>
              <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving || mastersLoading} type="submit">{saving ? "Saving..." : editingDesignation ? "Save Designation" : "Create Designation"}</button>
            </div>
          </form>

          <MasterPanel title="Level Code Masters" description="Codes shown in the designation level dropdown.">
            <form className="grid gap-3" onSubmit={saveLevelCode}>
              <div className="grid gap-3 sm:grid-cols-2">
                <DesignationField label="Code" onChange={(value) => updateLevelField("code", value.toUpperCase())} placeholder="L5" required value={levelCodeForm.code} />
                <DesignationField label="Sort" onChange={(value) => updateLevelField("sortOrder", value)} placeholder="50" type="number" value={levelCodeForm.sortOrder} />
              </div>
              <DesignationField label="Label" onChange={(value) => updateLevelField("label", value)} placeholder="Lead / Manager" required value={levelCodeForm.label} />
              <DesignationField label="Description" onChange={(value) => updateLevelField("description", value)} value={levelCodeForm.description} />
              <div className="flex justify-end gap-2">
                <button className="rounded-lg border border-[#dbe0e5] bg-white px-3 py-2 text-xs font-bold text-[#374151]" onClick={resetLevelCodeForm} type="button">Clear</button>
                <button className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white disabled:opacity-60" disabled={savingMaster} type="submit">{editingLevelCode ? "Save Code" : "Add Code"}</button>
              </div>
            </form>
            <MasterList>
              {levelCodes.map((item) => (
                <MasterItem key={item.id} primary={`${item.code} - ${item.label}`} secondary={`Sort ${item.sort_order}${item.description ? ` · ${item.description}` : ""}`} onDelete={() => deleteLevelCode(item)} onEdit={() => { setEditingLevelCode(item); setLevelCodeForm(levelCodeToForm(item)); }} />
              ))}
            </MasterList>
          </MasterPanel>

          <MasterPanel title="Seniority Rank Masters" description="Ranks shown in the designation seniority dropdown. Higher rank means more senior.">
            <form className="grid gap-3" onSubmit={saveSeniorityRank}>
              <div className="grid gap-3 sm:grid-cols-2">
                <DesignationField label="Rank" onChange={(value) => updateRankField("rankValue", value)} placeholder="500" required type="number" value={seniorityRankForm.rankValue} />
                <DesignationField label="Sort" onChange={(value) => updateRankField("sortOrder", value)} placeholder="50" type="number" value={seniorityRankForm.sortOrder} />
              </div>
              <DesignationField label="Label" onChange={(value) => updateRankField("label", value)} placeholder="Lead / Manager" required value={seniorityRankForm.label} />
              <DesignationField label="Description" onChange={(value) => updateRankField("description", value)} value={seniorityRankForm.description} />
              <div className="flex justify-end gap-2">
                <button className="rounded-lg border border-[#dbe0e5] bg-white px-3 py-2 text-xs font-bold text-[#374151]" onClick={resetSeniorityRankForm} type="button">Clear</button>
                <button className="rounded-lg bg-[#111827] px-3 py-2 text-xs font-black text-white disabled:opacity-60" disabled={savingMaster} type="submit">{editingSeniorityRank ? "Save Rank" : "Add Rank"}</button>
              </div>
            </form>
            <MasterList>
              {seniorityRanks.map((item) => (
                <MasterItem key={item.id} primary={`${item.rank_value} - ${item.label}`} secondary={`Sort ${item.sort_order}${item.description ? ` · ${item.description}` : ""}`} onDelete={() => deleteSeniorityRank(item)} onEdit={() => { setEditingSeniorityRank(item); setSeniorityRankForm(seniorityRankToForm(item)); }} />
              ))}
            </MasterList>
          </MasterPanel>
        </aside>
      </div>
    </div>
  );
}

function DesignationField({ label, value, onChange, type = "text", required = false, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} />
    </label>
  );
}

function SelectField({ children, label, value, onChange, required = false }: { children: ReactNode; label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <select className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} required={required} value={value}>
        {children}
      </select>
    </label>
  );
}

function MasterPanel({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Master</p>
      <h3 className="mt-2 text-lg font-black text-[#111827]">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#6b7280]">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function MasterList({ children }: { children: ReactNode }) {
  return <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-2">{children}</div>;
}

function MasterItem({ primary, secondary, onEdit, onDelete }: { primary: string; secondary: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-white p-3">
      <div>
        <p className="text-sm font-black text-[#111827]">{primary}</p>
        <p className="mt-1 text-xs font-semibold text-[#6b7280]">{secondary}</p>
      </div>
      <div className="flex gap-2">
        <DesignationIconButton label={`Edit ${primary}`} onClick={onEdit}><EditIcon /></DesignationIconButton>
        <DesignationIconButton danger label={`Deactivate ${primary}`} onClick={onDelete}><TrashIcon /></DesignationIconButton>
      </div>
    </div>
  );
}

function DesignationIconButton({ children, danger = false, label, onClick }: { children: ReactNode; danger?: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${danger ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border-[#dbe0e5] bg-white text-[#374151] hover:border-[#588368] hover:bg-[#f4fbf8] hover:text-[#588368]"}`} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m12 20 9-9-8-8-9 9-2 10 10-2Z" />
      <path d="m14 5 5 5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
