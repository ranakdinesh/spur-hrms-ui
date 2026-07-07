"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type FinancialYear = { id: string; name: string; is_active: boolean; payroll_year: boolean; start_date: string; end_date: string };
type SalaryTemplate = { id: string; tenant_id: string; fy_id: string; code: string; name: string; description?: string | null; template_type: string; applies_to: string; currency_code: string; effective_from?: string | null; effective_to?: string | null; notes?: string | null; is_active: boolean; items?: SalaryTemplateItem[] };
type SalaryTemplateItem = { id: string; template_id: string; item_type: string; code: string; name: string; percentage?: number | null; amount?: number | null; calculation_mode: string; calculation_base: string; formula?: string | null; contribution_side: string; is_tax_exempt: boolean; is_statutory: boolean; is_variable: boolean; affects_gross: boolean; affects_net: boolean; cap_amount?: number | null; min_amount?: number | null; max_amount?: number | null; sort_order: number };

type TemplateForm = { fy_id: string; code: string; name: string; description: string; template_type: string; applies_to: string; currency_code: string; effective_from: string; effective_to: string; notes: string; is_active: boolean };
type ItemForm = { item_type: string; code: string; name: string; percentage: string; amount: string; calculation_mode: string; calculation_base: string; formula: string; contribution_side: string; is_tax_exempt: boolean; is_statutory: boolean; is_variable: boolean; affects_gross: boolean; affects_net: boolean; cap_amount: string; min_amount: string; max_amount: string; sort_order: number };

const emptyTemplate: TemplateForm = { fy_id: "", code: "", name: "", description: "", template_type: "ctc", applies_to: "all", currency_code: "INR", effective_from: "", effective_to: "", notes: "", is_active: false };
const emptyItem: ItemForm = { item_type: "earning", code: "basic", name: "Basic", percentage: "50", amount: "", calculation_mode: "percentage", calculation_base: "ctc", formula: "", contribution_side: "employee", is_tax_exempt: false, is_statutory: false, is_variable: false, affects_gross: true, affects_net: true, cap_amount: "", min_amount: "", max_amount: "", sort_order: 10 };
const indiaPresetItems: ItemForm[] = [
  { ...emptyItem, code: "basic", name: "Basic", item_type: "earning", calculation_mode: "percentage", calculation_base: "ctc", percentage: "50", sort_order: 10 },
  { ...emptyItem, code: "hra", name: "HRA", item_type: "earning", calculation_mode: "percentage", calculation_base: "basic", percentage: "40", sort_order: 20 },
  { ...emptyItem, code: "special_allowance", name: "Special Allowance", item_type: "earning", calculation_mode: "manual", calculation_base: "gross", percentage: "", sort_order: 30 },
  { ...emptyItem, code: "pf_employee", name: "Employee PF", item_type: "deduction", calculation_mode: "percentage", calculation_base: "basic", percentage: "12", contribution_side: "employee", is_statutory: true, cap_amount: "1800", affects_gross: false, affects_net: true, sort_order: 100 },
  { ...emptyItem, code: "pf_employer", name: "Employer PF", item_type: "employer_contribution", calculation_mode: "percentage", calculation_base: "basic", percentage: "12", contribution_side: "employer", is_statutory: true, cap_amount: "1800", affects_gross: false, affects_net: false, sort_order: 110 },
  { ...emptyItem, code: "esi_employee", name: "Employee ESI", item_type: "deduction", calculation_mode: "percentage", calculation_base: "gross", percentage: "0.75", contribution_side: "employee", is_statutory: true, affects_gross: false, affects_net: true, sort_order: 120 },
  { ...emptyItem, code: "professional_tax", name: "Professional Tax", item_type: "deduction", calculation_mode: "manual", calculation_base: "gross", percentage: "", contribution_side: "employee", is_statutory: true, affects_gross: false, affects_net: true, sort_order: 130 },
];

function toDateInput(value?: string | null) { return value ? value.slice(0, 10) : ""; }
function cleanNumber(value: string) { const parsed = Number(value); return Number.isFinite(parsed) && value.trim() !== "" ? parsed : null; }
function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function money(value?: number | null) { return value == null ? "-" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value); }
function tenantSortValue(tenant: BranchTenantOption) { return `${tenant.name} ${tenant.code}`.toLowerCase(); }
function templateToForm(item: SalaryTemplate): TemplateForm { return { fy_id: item.fy_id, code: item.code, name: item.name, description: item.description || "", template_type: item.template_type, applies_to: item.applies_to, currency_code: item.currency_code, effective_from: toDateInput(item.effective_from), effective_to: toDateInput(item.effective_to), notes: item.notes || "", is_active: item.is_active }; }
function itemToForm(item: SalaryTemplateItem): ItemForm { return { item_type: item.item_type, code: item.code, name: item.name, percentage: item.percentage == null ? "" : String(item.percentage), amount: item.amount == null ? "" : String(item.amount), calculation_mode: item.calculation_mode, calculation_base: item.calculation_base, formula: item.formula || "", contribution_side: item.contribution_side, is_tax_exempt: item.is_tax_exempt, is_statutory: item.is_statutory, is_variable: item.is_variable, affects_gross: item.affects_gross, affects_net: item.affects_net, cap_amount: item.cap_amount == null ? "" : String(item.cap_amount), min_amount: item.min_amount == null ? "" : String(item.min_amount), max_amount: item.max_amount == null ? "" : String(item.max_amount), sort_order: item.sort_order }; }

export function SalaryTemplatesSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants.filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query))).sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b)));
  }, [tenantSearch, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings / Payroll</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Salary Templates</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to configure reusable CTC, earnings, deductions and statutory payroll components.</p></div><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} /></div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Templates</button></td></tr>)}</tbody></table></div></section>
      </div>
    );
  }

  return <SalaryTemplateWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function SalaryTemplateWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [items, setItems] = useState<SalaryTemplateItem[]>([]);
  const [selectedFY, setSelectedFY] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<SalaryTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);
  const [editingTemplate, setEditingTemplate] = useState<SalaryTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<SalaryTemplateItem | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const title = tenant ? `${tenant.name} Salary Templates` : "Salary Templates";

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const fys = await apiRequest<FinancialYear[]>(`${basePath}/financial-years`);
      setFinancialYears(fys);
      const activeFY = selectedFY || fys.find((fy) => fy.is_active && fy.payroll_year)?.id || fys[0]?.id || "";
      setSelectedFY(activeFY);
      const path = activeFY ? `${basePath}/salary-templates?fy_id=${activeFY}` : `${basePath}/salary-templates`;
      setTemplates(await apiRequest<SalaryTemplate[]>(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load salary templates.");
    } finally { setLoading(false); }
  }, [basePath, selectedFY]);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((item) => !needle || [item.name, item.code, item.template_type, item.applies_to].some((value) => value.toLowerCase().includes(needle)));
  }, [query, templates]);

  async function loadItems(template: SalaryTemplate) {
    setSelectedTemplate(template); setError("");
    try { setItems(await apiRequest<SalaryTemplateItem[]>(`${basePath}/salary-templates/${template.id}/items`)); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load salary components."); }
  }

  function openCreateTemplate() {
    const activeFY = selectedFY || financialYears[0]?.id || "";
    setEditingTemplate(null); setTemplateForm({ ...emptyTemplate, fy_id: activeFY }); setTemplateModalOpen(true);
  }
  function openEditTemplate(item: SalaryTemplate) { setEditingTemplate(item); setTemplateForm(templateToForm(item)); setTemplateModalOpen(true); }
  function openCreateItem(template: SalaryTemplate) { setSelectedTemplate(template); setEditingItem(null); setItemForm({ ...emptyItem, sort_order: (items.length + 1) * 10 }); setItemModalOpen(true); }
  function openEditItem(item: SalaryTemplateItem) { setEditingItem(item); setItemForm(itemToForm(item)); setItemModalOpen(true); }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const payload = { ...templateForm, description: templateForm.description.trim() || null, effective_from: templateForm.effective_from || null, effective_to: templateForm.effective_to || null, notes: templateForm.notes.trim() || null };
    try {
      if (editingTemplate) await apiRequest<SalaryTemplate>(`${basePath}/salary-templates/${editingTemplate.id}`, { method: "PUT", body: payload });
      else await apiRequest<SalaryTemplate>(`${basePath}/salary-templates`, { method: "POST", body: payload });
      setTemplateModalOpen(false); setMessage("Salary template saved."); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save salary template."); }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedTemplate) return; setError(""); setMessage("");
    const payload = { ...itemForm, percentage: cleanNumber(itemForm.percentage), amount: cleanNumber(itemForm.amount), formula: itemForm.formula.trim() || null, cap_amount: cleanNumber(itemForm.cap_amount), min_amount: cleanNumber(itemForm.min_amount), max_amount: cleanNumber(itemForm.max_amount) };
    try {
      if (editingItem) await apiRequest<SalaryTemplateItem>(`${basePath}/salary-templates/${selectedTemplate.id}/items/${editingItem.id}`, { method: "PUT", body: payload });
      else await apiRequest<SalaryTemplateItem>(`${basePath}/salary-templates/${selectedTemplate.id}/items`, { method: "POST", body: payload });
      setItemModalOpen(false); setMessage("Salary component saved."); await loadItems(selectedTemplate);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save salary component."); }
  }

  async function activateTemplate(item: SalaryTemplate) {
    setError(""); setMessage("");
    try { await apiRequest<SalaryTemplate>(`${basePath}/salary-templates/${item.id}/active`, { method: "PUT" }); setMessage("Active salary template updated."); await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to activate template."); }
  }

  async function deleteTemplate(item: SalaryTemplate) {
    if (!window.confirm(`Delete salary template ${item.name}?`)) return;
    try { await apiRequest(`${basePath}/salary-templates/${item.id}`, { method: "DELETE" }); setMessage("Salary template deleted."); if (selectedTemplate?.id === item.id) { setSelectedTemplate(null); setItems([]); } await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete salary template."); }
  }

  async function deleteItem(item: SalaryTemplateItem) {
    if (!selectedTemplate || !window.confirm(`Delete component ${item.name}?`)) return;
    try { await apiRequest(`${basePath}/salary-templates/${selectedTemplate.id}/items/${item.id}`, { method: "DELETE" }); setMessage("Salary component deleted."); await loadItems(selectedTemplate); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete salary component."); }
  }

  async function addIndiaPreset(template: SalaryTemplate) {
    setError(""); setMessage("");
    try { for (const preset of indiaPresetItems) await apiRequest(`${basePath}/salary-templates/${template.id}/items`, { method: "POST", body: { ...preset, percentage: cleanNumber(preset.percentage), amount: cleanNumber(preset.amount), cap_amount: cleanNumber(preset.cap_amount), min_amount: null, max_amount: null, formula: preset.formula || null } }); setMessage("India payroll preset components added."); await loadItems(template); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to add preset components."); }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings / Payroll</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Build reusable salary structures with earnings, deductions, statutory contributions, caps and formula placeholders. One template can be active per financial year.</p></div><div className="flex flex-wrap gap-3">{onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}<button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">Refresh</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" onClick={openCreateTemplate} type="button">Create Template</button></div></div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}{message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-[260px_1fr_180px]"><select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSelectedFY(event.target.value)} value={selectedFY}>{financialYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}{fy.is_active ? " (Active)" : ""}</option>)}</select><input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setQuery(event.target.value)} placeholder="Filter templates by name, code, type" value={query} /><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">Apply FY</button></div></section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] p-5"><h2 className="text-xl font-black text-[#111827]">Templates</h2><p className="text-sm font-semibold text-[#6b7280]">{filteredTemplates.length} templates shown.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Template</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Applies To</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading templates...</td></tr> : filteredTemplates.map((item) => <tr className={selectedTemplate?.id === item.id ? "bg-[#f8faf9]" : "hover:bg-[#f8faf9]"} key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.code} - {item.currency_code}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{label(item.template_type)}</td><td className="px-5 py-5 text-sm text-[#4b5563]">{label(item.applies_to)}</td><td className="px-5 py-5">{item.is_active ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Active</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Draft</span>}</td><td className="px-5 py-5 text-right"><div className="flex flex-wrap justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => void loadItems(item)} type="button">Components</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => openEditTemplate(item)} type="button">Edit</button><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" disabled={item.is_active} onClick={() => void activateTemplate(item)} type="button">Activate</button><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700" onClick={() => void deleteTemplate(item)} type="button">Delete</button></div></td></tr>)}</tbody></table></div></section>
        <aside className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[#111827]">Components</h2>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">{selectedTemplate ? selectedTemplate.name : "Select a template"}</p>
            </div>
            {selectedTemplate ? <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openCreateItem(selectedTemplate)} type="button">Add</button> : null}
          </div>
          {selectedTemplate ? <button className="mt-4 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void addIndiaPreset(selectedTemplate)} type="button">Add India Payroll Preset</button> : null}
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block text-sm text-[#111827]">{item.name}</strong>
                    <span className="text-xs font-bold text-[#6b7280]">{item.code} - {label(item.item_type)}</span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-[#588368]">{item.sort_order}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#4b5563]">
                  {label(item.calculation_mode)} on {label(item.calculation_base)} {item.percentage != null ? `- ${item.percentage}%` : ""} {item.amount != null ? `- ${money(item.amount)}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide text-[#6b7280]">
                  {item.is_statutory ? <span>Statutory</span> : null}
                  {item.is_variable ? <span>Variable</span> : null}
                  {item.is_tax_exempt ? <span>Tax Exempt</span> : null}
                  {item.cap_amount != null ? <span>Cap {money(item.cap_amount)}</span> : null}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black" onClick={() => openEditItem(item)} type="button">Edit</button>
                  <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700" onClick={() => void deleteItem(item)} type="button">Delete</button>
                </div>
              </div>
            ))}
            {selectedTemplate && items.length === 0 ? <p className="rounded-xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">No components yet. Add items or use the India preset.</p> : null}
          </div>
        </aside>
      </div>
      {templateModalOpen ? <TemplateModal form={templateForm} financialYears={financialYears} onClose={() => setTemplateModalOpen(false)} onSave={saveTemplate} setForm={setTemplateForm} title={editingTemplate ? "Edit Salary Template" : "Create Salary Template"} /> : null}
      {itemModalOpen ? <ItemModal form={itemForm} onClose={() => setItemModalOpen(false)} onSave={saveItem} setForm={setItemForm} title={editingItem ? "Edit Component" : "Create Component"} /> : null}
    </div>
  );
}

function TemplateModal({ title, form, setForm, financialYears, onSave, onClose }: { title: string; form: TemplateForm; setForm: (value: TemplateForm) => void; financialYears: FinancialYear[]; onSave: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><form className="space-y-4" onSubmit={onSave}><div className="grid gap-4 md:grid-cols-2"><Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><Field label="Code" value={form.code} onChange={(value) => setForm({ ...form, code: value })} /><Select label="Financial year" value={form.fy_id} onChange={(value) => setForm({ ...form, fy_id: value })} options={financialYears.map((fy) => ({ value: fy.id, label: fy.name }))} /><Select label="Template type" value={form.template_type} onChange={(value) => setForm({ ...form, template_type: value })} options={["ctc", "gross", "net", "allowance", "deduction"]} /><Select label="Applies to" value={form.applies_to} onChange={(value) => setForm({ ...form, applies_to: value })} options={["all", "grade", "department", "designation", "employee_type", "custom"]} /><Field label="Currency" value={form.currency_code} onChange={(value) => setForm({ ...form, currency_code: value.toUpperCase().slice(0, 3) })} /><Field label="Effective from" type="date" value={form.effective_from} onChange={(value) => setForm({ ...form, effective_from: value })} /><Field label="Effective to" type="date" value={form.effective_to} onChange={(value) => setForm({ ...form, effective_to: value })} /></div><TextArea label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} /><TextArea label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} /><Check label="Mark active for this FY" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} /><ModalActions onClose={onClose} /></form></Modal>;
}

function ItemModal({ title, form, setForm, onSave, onClose }: { title: string; form: ItemForm; setForm: (value: ItemForm) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><form className="space-y-4" onSubmit={onSave}><div className="grid gap-4 md:grid-cols-3"><Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><Field label="Code" value={form.code} onChange={(value) => setForm({ ...form, code: value })} /><Field label="Sort order" type="number" value={String(form.sort_order)} onChange={(value) => setForm({ ...form, sort_order: Number(value) })} /><Select label="Item type" value={form.item_type} onChange={(value) => setForm({ ...form, item_type: value })} options={["earning", "deduction", "employer_contribution", "reimbursement"]} /><Select label="Calculation" value={form.calculation_mode} onChange={(value) => setForm({ ...form, calculation_mode: value })} options={["fixed", "percentage", "formula", "manual"]} /><Select label="Base" value={form.calculation_base} onChange={(value) => setForm({ ...form, calculation_base: value })} options={["ctc", "gross", "basic", "taxable", "net", "custom"]} /><Field label="Percentage" type="number" value={form.percentage} onChange={(value) => setForm({ ...form, percentage: value })} /><Field label="Amount" type="number" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} /><Field label="Cap amount" type="number" value={form.cap_amount} onChange={(value) => setForm({ ...form, cap_amount: value })} /><Field label="Min amount" type="number" value={form.min_amount} onChange={(value) => setForm({ ...form, min_amount: value })} /><Field label="Max amount" type="number" value={form.max_amount} onChange={(value) => setForm({ ...form, max_amount: value })} /><Select label="Contribution side" value={form.contribution_side} onChange={(value) => setForm({ ...form, contribution_side: value })} options={["employee", "employer", "none"]} /></div><TextArea label="Formula" value={form.formula} onChange={(value) => setForm({ ...form, formula: value })} /><div className="grid gap-3 md:grid-cols-3"><Check label="Tax exempt" checked={form.is_tax_exempt} onChange={(value) => setForm({ ...form, is_tax_exempt: value })} /><Check label="Statutory" checked={form.is_statutory} onChange={(value) => setForm({ ...form, is_statutory: value })} /><Check label="Variable" checked={form.is_variable} onChange={(value) => setForm({ ...form, is_variable: value })} /><Check label="Affects gross" checked={form.affects_gross} onChange={(value) => setForm({ ...form, affects_gross: value })} /><Check label="Affects net" checked={form.affects_net} onChange={(value) => setForm({ ...form, affects_net: value })} /></div><ModalActions onClose={onClose} /></form></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-black text-[#111827]">{title}</h2><button className="rounded-full border border-[#dbe0e5] px-3 py-1 text-sm font-black" onClick={onClose} type="button">Close</button></div>{children}</section></div>; }
function ModalActions({ onClose }: { onClose: () => void }) { return <div className="flex justify-end gap-3 border-t border-[#edf1ef] pt-5"><button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black" onClick={onClose} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white" type="submit">Save</button></div>; }
function Field({ label: fieldLabel, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm font-bold text-[#374151]">{fieldLabel}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>; }
function TextArea({ label: fieldLabel, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-sm font-bold text-[#374151]">{fieldLabel}<textarea className="mt-2 min-h-[86px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value} /></label>; }
function Select({ label: fieldLabel, value, options, onChange }: { label: string; value: string; options: string[] | Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="block text-sm font-bold text-[#374151]">{fieldLabel}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => typeof option === "string" ? <option key={option} value={option}>{label(option)}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Check({ label: fieldLabel, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[#edf1ef] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{fieldLabel}</label>; }
