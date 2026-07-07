"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, CreditCard, Home, Plus, Search } from "lucide-react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";
type TenantSubscription = { id: string; tenant_id: string; plan_id?: string | null; start_date?: string | null; end_date?: string | null; status: SubscriptionStatus; max_employees: number; inactive: boolean; created_at: string; updated_at: string };
type SubscriptionPlan = { id: string; code: string; name: string; price_amount: number; price_basis: string; minimum_amount: number; included_employees: number; overage_amount: number; currency_code: string; billing_cycle: string; employee_limit: number; trial_days: number; visibility: string; is_active: boolean };
type FormState = { planID: string; startDate: string; endDate: string; status: SubscriptionStatus; maxEmployees: string };
type TenantSortKey = "name" | "status" | "plan" | "joined";

const emptyForm: FormState = { planID: "", startDate: "", endDate: "", status: "active", maxEmployees: "0" };
const statusOptions: SubscriptionStatus[] = ["trialing", "active", "past_due", "cancelled", "expired"];
const statusLabels: Record<SubscriptionStatus, string> = { trialing: "Trialing", active: "Active", past_due: "Past due", cancelled: "Cancelled", expired: "Expired" };

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formFromSubscription(item: TenantSubscription): FormState {
  return { planID: item.plan_id || "", startDate: toDateInput(item.start_date), endDate: toDateInput(item.end_date), status: item.status, maxEmployees: String(item.max_employees) };
}

function payloadFromForm(form: FormState) {
  return { plan_id: form.planID.trim() || null, start_date: form.startDate, end_date: form.endDate, status: form.status, max_employees: Number.parseInt(form.maxEmployees || "0", 10) || 0 };
}

function isCurrent(item: TenantSubscription) {
  return item.status === "trialing" || item.status === "active" || item.status === "past_due";
}

function assignedTenantPlan(tenant: BranchTenantOption | null) {
  if (!tenant || tenant.plan === "Not assigned" || tenant.plan === "System") {
    return "";
  }
  return tenant.plan;
}

function planLabel(plan: SubscriptionPlan) {
  const limit = `${plan.employee_limit} employee cap`;
  const price = plan.price_basis === "custom_quote" ? "Custom quote" : plan.price_basis === "package_plus_overage" ? `${plan.currency_code} ${plan.price_amount}/${plan.billing_cycle} incl. ${plan.included_employees}, +${plan.currency_code} ${plan.overage_amount}/extra` : `${plan.currency_code} ${plan.price_amount}/employee, min ${plan.currency_code} ${plan.minimum_amount}`;
  const visibility = plan.visibility === "internal" ? "Internal" : "Public";
  return `${plan.name} (${visibility}) - ${price} - ${limit}`;
}

export function SubscriptionsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
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
      <div className="px-4 py-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f1] text-[#588368] shadow-sm">
                <CreditCard className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-[#172033]">Tenant Subscriptions</h1>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
              <Home className="h-3.5 w-3.5" />
              <span>/</span>
              <span>Commercial</span>
              <span>/</span>
              <span className="font-semibold text-[#172033]">Subscriptions</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
              <input className="h-11 rounded-xl border border-[#dbe0e5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
            </div>
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setTenantSort(event.target.value as TenantSortKey)} value={tenantSort}><option value="name">Sort by name</option><option value="status">Sort by status</option><option value="plan">Sort by plan</option><option value="joined">Sort by joined</option></select>
          </div>
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
          <div className="flex items-center gap-3 border-b border-[#edf1ef] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-[#588368]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2>
              <p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants</p>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Current Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenants...</td></tr> : filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.joined}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Subscription</button></td></tr>)}</tbody></table></div>
        </section>
      </div>
    );
  }

  return <SubscriptionsManager isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function SubscriptionsManager({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<TenantSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<TenantSubscription | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/subscriptions` : "/hrms/subscriptions";
  const plansByID = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await apiRequest<TenantSubscription[]>(basePath)); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load subscriptions."); }
    finally { setLoading(false); }
  }, [basePath]);

  const loadPlans = useCallback(async () => {
    if (!isSuperAdmin) return;
    try { setPlans(await apiRequest<SubscriptionPlan[]>("/hrms/subscription-plans/active")); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load subscription plan catalog."); }
  }, [isSuperAdmin]);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);
  useEffect(() => { const timer = window.setTimeout(loadPlans, 0); return () => window.clearTimeout(timer); }, [loadPlans]);

  const filteredItems = useMemo(() => items.filter((item) => statusFilter === "all" || item.status === statusFilter), [items, statusFilter]);
  const current = items.find(isCurrent) || null;
  const title = tenant ? `${tenant.name} Subscription` : "Subscription";
  const currentPlan = current?.plan_id ? plansByID.get(current.plan_id) : null;
  const currentPackageName = currentPlan?.name || assignedTenantPlan(tenant) || (current?.plan_id ? `Plan ${current.plan_id}` : current ? statusLabels[current.status] : "No active package");
  const currentPackageNote = current ? `${statusLabels[current.status]} subscription${currentPlan ? ` - ${currentPlan.code} - ${currentPlan.visibility === "internal" ? "internal negotiated plan" : "public plan"}` : current.plan_id ? ` - UUID ${current.plan_id}` : ""}` : "No HRMS subscription record found.";

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditForm(item: TenantSubscription) {
    setEditing(item);
    setForm(formFromSubscription(item));
    setFormOpen(true);
  }

  function updatePlan(planID: string) {
    const selectedPlan = plansByID.get(planID);
    setForm((currentForm) => ({
      ...currentForm,
      planID,
      maxEmployees: selectedPlan && (!currentForm.maxEmployees || currentForm.maxEmployees === "0") ? String(selectedPlan.employee_limit) : currentForm.maxEmployees,
    }));
  }

  async function saveSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSuperAdmin) return;
    setSaving(true); setError(""); setMessage("");
    try {
      if (editing) { await apiRequest<TenantSubscription>(`${basePath}/${editing.id}`, { method: "PUT", body: payloadFromForm(form) }); setMessage("Subscription updated."); }
      else { await apiRequest<TenantSubscription>(basePath, { method: "POST", body: payloadFromForm(form) }); setMessage("Subscription created."); }
      resetForm(); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save subscription."); }
    finally { setSaving(false); }
  }

  async function deleteSubscription(item: TenantSubscription) {
    if (!isSuperAdmin || !window.confirm(`Deactivate subscription ${item.id.slice(0, 8)}?`)) return;
    setError(""); setMessage("");
    try { await apiRequest(`${basePath}/${item.id}`, { method: "DELETE" }); setMessage("Subscription deactivated."); await loadData(); if (editing?.id === item.id) resetForm(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to deactivate subscription."); }
  }

  return (
    <div className="px-4 py-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#588368]" onClick={onBack} type="button"><ArrowLeft className="h-4 w-4" /> Back to tenants</button> : null}
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f1] text-[#588368] shadow-sm">
              <CreditCard className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">{title}</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
            <Home className="h-3.5 w-3.5" />
            <span>/</span>
            <span>Commercial</span>
            <span>/</span>
            <span className="font-semibold text-[#172033]">Subscription Control</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368] lg:w-[220px]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
          {isSuperAdmin ? <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#588368] px-4 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button"><Plus className="h-4 w-4" />Create Subscription</button> : null}
        </div>
      </div>
      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}{message ? <p className="mb-5 rounded-lg bg-[#eef9f2] px-4 py-3 text-sm font-semibold text-[#2f6f4f]">{message}</p> : null}
      <div className="grid gap-5">
        <div className="space-y-6">
          <section className="setika-card-rise rounded-2xl border border-[#edf1ef] bg-[#172033] p-6 text-white shadow-[0_14px_34px_rgba(23,32,51,0.18)]"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#a8d6b8]">Current Package</p><h2 className="mt-3 text-2xl font-black">{currentPackageName}</h2><p className="mt-2 text-sm text-white/70">{currentPackageNote}</p><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/10 p-4"><span className="block text-white/60">Starts</span><strong>{formatDate(current?.start_date)}</strong></div><div className="rounded-xl bg-white/10 p-4"><span className="block text-white/60">Ends</span><strong>{formatDate(current?.end_date)}</strong></div><div className="rounded-xl bg-white/10 p-4"><span className="block text-white/60">Employees</span><strong>{current?.max_employees || 0}</strong></div><div className="rounded-xl bg-white/10 p-4"><span className="block text-white/60">Updated</span><strong>{formatDate(current?.updated_at)}</strong></div></div></section>
        </div>
        <SubscriptionsTable filteredItems={filteredItems} isSuperAdmin={isSuperAdmin} loading={loading} onDelete={deleteSubscription} onEdit={openEditForm} plansByID={plansByID} tenantPlan={assignedTenantPlan(tenant)} total={items.length} />
      </div>
      {isSuperAdmin && formOpen ? (
        <SubscriptionFormModal
          editing={editing}
          form={form}
          onClose={resetForm}
          onPlanChange={updatePlan}
          onSubmit={saveSubscription}
          plans={plans}
          saving={saving}
          setForm={setForm}
        />
      ) : null}
    </div>
  );
}

function SubscriptionFormModal({
  editing,
  form,
  onClose,
  onPlanChange,
  onSubmit,
  plans,
  saving,
  setForm,
}: {
  editing: TenantSubscription | null;
  form: FormState;
  onClose: () => void;
  onPlanChange: (planID: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  plans: SubscriptionPlan[];
  saving: boolean;
  setForm: (updater: (currentForm: FormState) => FormState) => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true">
      <form className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e2e8e4] bg-white p-5 shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1ef] pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#588368]">Subscription</p>
            <h2 className="mt-2 text-xl font-black text-[#111827]">{editing ? "Edit Subscription" : "Create Subscription"}</h2>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dbe0e5] text-xl font-bold text-[#588368]" onClick={onClose} type="button" aria-label="Close subscription form">×</button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-bold text-[#374151]">Catalog Plan<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onPlanChange(event.target.value)} value={form.planID}><option value="">No catalog plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{planLabel(plan)}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-[#374151]">Start date<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))} type="date" value={form.startDate} /></label>
            <label className="block text-sm font-bold text-[#374151]">End date<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((currentForm) => ({ ...currentForm, endDate: event.target.value }))} type="date" value={form.endDate} /></label>
          </div>
          <label className="block text-sm font-bold text-[#374151]">Status<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((currentForm) => ({ ...currentForm, status: event.target.value as SubscriptionStatus }))} value={form.status}>{statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
          <label className="block text-sm font-bold text-[#374151]">Employee limit<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((currentForm) => ({ ...currentForm, maxEmployees: event.target.value }))} type="number" value={form.maxEmployees} /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-[#edf1ef] pt-4">
          <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
        </div>
      </form>
    </div>
  );
}

function SubscriptionsTable({ filteredItems, isSuperAdmin, loading, onDelete, onEdit, plansByID, tenantPlan, total }: { filteredItems: TenantSubscription[]; isSuperAdmin: boolean; loading: boolean; onDelete: (item: TenantSubscription) => void; onEdit: (item: TenantSubscription) => void; plansByID: Map<string, SubscriptionPlan>; tenantPlan: string; total: number }) {
  return <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]"><div className="flex items-center gap-3 border-b border-[#edf1ef] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]"><CreditCard className="h-5 w-5" /></span><div><h2 className="text-lg font-black text-[#111827]">Subscription History</h2><p className="text-sm text-[#6b7280]">{filteredItems.length} shown from {total} records.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Status</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Visibility</th><th className="px-5 py-4">Period</th><th className="px-5 py-4">Employee Limit</th><th className="px-5 py-4">Updated</th>{isSuperAdmin ? <th className="px-5 py-4 text-right">Actions</th> : null}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={isSuperAdmin ? 7 : 6}>Loading subscriptions...</td></tr> : filteredItems.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={isSuperAdmin ? 7 : 6}>No subscriptions found.</td></tr> : filteredItems.map((item) => { const plan = item.plan_id ? plansByID.get(item.plan_id) : null; return <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${isCurrent(item) ? "bg-[#eef9f2] text-[#2f6f4f]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>{statusLabels[item.status]}</span></td><td className="px-5 py-5 text-sm text-[#4b5563]">{plan ? `${plan.name} (${plan.code})` : item.plan_id || tenantPlan || "No plan id"}</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${plan?.visibility === "internal" ? "bg-amber-50 text-amber-700" : "bg-[#eef4f1] text-[#588368]"}`}>{plan?.visibility === "internal" ? "Internal" : plan ? "Public" : "-"}</span></td><td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.start_date)} - {formatDate(item.end_date)}</td><td className="px-5 py-5 text-sm font-bold text-[#111827]">{item.max_employees}</td><td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td>{isSuperAdmin ? <td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => onEdit(item)} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => onDelete(item)} type="button">Delete</button></div></td> : null}</tr>; })}</tbody></table></div></section>;
}
