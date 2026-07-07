"use client";

import { type Dispatch, FormEvent, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Edit3, Home, PackageCheck, Plus, Search } from "lucide-react";

import { apiRequest } from "@/lib/api";

type BillingCycle = "monthly" | "quarterly" | "yearly" | "one_time" | "custom";
type PriceBasis = "per_employee" | "package_plus_overage" | "flat" | "custom_quote";
type PlanVisibility = "public" | "internal";
type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price_amount: number;
  price_basis: PriceBasis;
  minimum_amount: number;
  included_employees: number;
  overage_amount: number;
  currency_code: string;
  billing_cycle: BillingCycle;
  employee_limit: number;
  trial_days: number;
  visibility: PlanVisibility;
  is_active: boolean;
  inactive: boolean;
  updated_at: string;
};
type FormState = { code: string; name: string; description: string; price: string; priceBasis: PriceBasis; minimumAmount: string; includedEmployees: string; overageAmount: string; currency: string; billingCycle: BillingCycle; employeeLimit: string; trialDays: string; visibility: PlanVisibility; isActive: boolean };

const emptyForm: FormState = { code: "", name: "", description: "", price: "0", priceBasis: "per_employee", minimumAmount: "0", includedEmployees: "0", overageAmount: "0", currency: "INR", billingCycle: "monthly", employeeLimit: "0", trialDays: "14", visibility: "public", isActive: true };
const cycleLabels: Record<BillingCycle, string> = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly", one_time: "One time", custom: "Custom" };
const priceBasisLabels: Record<PriceBasis, string> = { per_employee: "Per employee", package_plus_overage: "Package + overage", flat: "Flat", custom_quote: "Custom quote" };
const visibilityLabels: Record<PlanVisibility, string> = { public: "Public", internal: "Internal" };
const billingCycles = Object.keys(cycleLabels) as BillingCycle[];
const priceBasisOptions = Object.keys(priceBasisLabels) as PriceBasis[];
const visibilityOptions = Object.keys(visibilityLabels) as PlanVisibility[];

function planToForm(plan: SubscriptionPlan): FormState {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description || "",
    price: String(plan.price_amount),
    priceBasis: plan.price_basis || "per_employee",
    minimumAmount: String(plan.minimum_amount || 0),
    includedEmployees: String(plan.included_employees || 0),
    overageAmount: String(plan.overage_amount || 0),
    currency: plan.currency_code || "INR",
    billingCycle: plan.billing_cycle,
    employeeLimit: String(plan.employee_limit),
    trialDays: String(plan.trial_days),
    visibility: plan.visibility || "public",
    isActive: plan.is_active,
  };
}

function payloadFromForm(form: FormState) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    price_amount: Number.parseFloat(form.price || "0") || 0,
    price_basis: form.priceBasis,
    minimum_amount: Number.parseFloat(form.minimumAmount || "0") || 0,
    included_employees: Number.parseInt(form.includedEmployees || "0", 10) || 0,
    overage_amount: Number.parseFloat(form.overageAmount || "0") || 0,
    currency_code: form.currency.trim().toUpperCase() || "INR",
    billing_cycle: form.billingCycle,
    employee_limit: Number.parseInt(form.employeeLimit || "0", 10) || 0,
    trial_days: Number.parseInt(form.trialDays || "0", 10) || 0,
    visibility: form.visibility,
    is_active: form.isActive,
  };
}

function formatMoney(plan: SubscriptionPlan) {
  if (plan.price_basis === "custom_quote") return "Custom quote";
  return new Intl.NumberFormat("en-IN", { currency: plan.currency_code || "INR", style: "currency" }).format(plan.price_amount || 0);
}

function formatBilling(plan: SubscriptionPlan) {
  if (plan.price_basis === "package_plus_overage") return `${formatMoney(plan)} base, ${plan.included_employees} included, ${plan.currency_code} ${plan.overage_amount}/extra`;
  if (plan.price_basis === "per_employee") return `${formatMoney(plan)}/employee, min ${plan.currency_code} ${plan.minimum_amount}`;
  return formatMoney(plan);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function SubscriptionPlansSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [items, setItems] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await apiRequest<SubscriptionPlan[]>("/hrms/subscription-plans")); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load subscription plans."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || [item.code, item.name, item.description || "", item.currency_code, item.billing_cycle, item.price_basis, item.visibility].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? item.is_active : !item.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

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

  function openEditForm(plan: SubscriptionPlan) {
    setEditing(plan);
    setForm(planToForm(plan));
    setFormOpen(true);
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSuperAdmin) return;
    setSaving(true); setError(""); setMessage("");
    try {
      if (editing) {
        await apiRequest<SubscriptionPlan>(`/hrms/subscription-plans/${editing.id}`, { method: "PUT", body: payloadFromForm(form) });
        setMessage("Plan updated.");
      } else {
        await apiRequest<SubscriptionPlan>("/hrms/subscription-plans", { method: "POST", body: payloadFromForm(form) });
        setMessage("Plan created.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save subscription plan.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(plan: SubscriptionPlan) {
    if (!isSuperAdmin || !window.confirm(`Deactivate ${plan.name}?`)) return;
    setError(""); setMessage("");
    try {
      await apiRequest(`/hrms/subscription-plans/${plan.id}`, { method: "DELETE" });
      setMessage("Plan deactivated.");
      if (editing?.id === plan.id) resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate subscription plan.");
    }
  }

  return (
    <div className="px-4 py-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f1] text-[#588368] shadow-sm">
              <PackageCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">Subscription Plans</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
            <Home className="h-3.5 w-3.5" />
            <span>/</span>
            <span>Commercial</span>
            <span>/</span>
            <span className="font-semibold text-[#172033]">Plans</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
            <input className="h-11 rounded-xl border border-[#dbe0e5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#588368] sm:w-[300px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search plans" value={search} />
          </div>
          <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold outline-none focus:border-[#588368]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#588368] px-4 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button"><Plus className="h-4 w-4" />Create Plan</button>
        </div>
      </div>
      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg bg-[#eef9f2] px-4 py-3 text-sm font-semibold text-[#2f6f4f]">{message}</p> : null}
      <div className="grid gap-5">
        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
          <div className="flex items-center gap-3 border-b border-[#edf1ef] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-[#111827]">Plan Catalog</h2>
              <p className="text-sm text-[#6b7280]">{filteredItems.length} shown from {items.length} plans.</p>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1160px] text-left"><thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Visibility</th><th className="px-5 py-4">Billing</th><th className="px-5 py-4">Cycle</th><th className="px-5 py-4">Cap</th><th className="px-5 py-4">Trial</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={9}>Loading plans...</td></tr> : filteredItems.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={9}>No plans found.</td></tr> : filteredItems.map((item) => <tr className="hover:bg-[#f8faf9]" key={item.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{item.code}</span></td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.visibility === "internal" ? "bg-amber-50 text-amber-700" : "bg-[#eef4f1] text-[#588368]"}`}>{visibilityLabels[item.visibility] || item.visibility}</span></td><td className="px-5 py-5 text-sm font-bold text-[#111827]">{formatBilling(item)}<span className="mt-1 block text-xs font-semibold text-[#6b7280]">{priceBasisLabels[item.price_basis] || item.price_basis}</span></td><td className="px-5 py-5 text-sm text-[#4b5563]">{cycleLabels[item.billing_cycle]}</td><td className="px-5 py-5 text-sm text-[#4b5563]">{item.employee_limit}</td><td className="px-5 py-5 text-sm text-[#4b5563]">{item.trial_days} days</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.is_active ? "bg-[#eef9f2] text-[#2f6f4f]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>{item.is_active ? "Active" : "Inactive"}</span></td><td className="px-5 py-5 text-sm text-[#4b5563]">{formatDate(item.updated_at)}</td><td className="px-5 py-5 text-right"><div className="flex justify-end gap-2"><button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-sm font-black text-[#374151]" onClick={() => openEditForm(item)} type="button">Edit</button><button className="rounded-lg border border-red-100 px-3 py-2 text-sm font-black text-red-600" onClick={() => deletePlan(item)} type="button">Delete</button></div></td></tr>)}</tbody></table></div>
        </section>
      </div>
      {formOpen ? <PlanFormModal editing={editing} form={form} onClose={resetForm} onSubmit={savePlan} saving={saving} setForm={setForm} /> : null}
    </div>
  );
}

function PlanFormModal({ editing, form, onClose, onSubmit, saving, setForm }: { editing: SubscriptionPlan | null; form: FormState; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; setForm: Dispatch<SetStateAction<FormState>> }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true">
      <form className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#e2e8e4] bg-white p-5 shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1ef] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-[#588368]">
              {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#588368]">Plan Catalog</p>
              <h2 className="mt-1 text-xl font-black text-[#111827]">{editing ? "Edit Plan" : "Create Plan"}</h2>
            </div>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dbe0e5] text-xl font-bold text-[#588368]" onClick={onClose} type="button" aria-label="Close plan form">×</button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-bold text-[#374151]">Code<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal uppercase outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="STARTER" required value={form.code} /></label>
          <label className="block text-sm font-bold text-[#374151]">Name<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Starter" required value={form.name} /></label>
          <label className="block text-sm font-bold text-[#374151]">Description<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#dbe0e5] px-4 py-3 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-[#374151]">Price<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} step="0.01" type="number" value={form.price} /></label>
            <label className="block text-sm font-bold text-[#374151]">Currency<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal uppercase outline-none focus:border-[#588368]" maxLength={3} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} value={form.currency} /></label>
            <label className="block text-sm font-bold text-[#374151]">Price basis<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, priceBasis: event.target.value as PriceBasis }))} value={form.priceBasis}>{priceBasisOptions.map((option) => <option key={option} value={option}>{priceBasisLabels[option]}</option>)}</select></label>
            <label className="block text-sm font-bold text-[#374151]">Visibility<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as PlanVisibility }))} value={form.visibility}>{visibilityOptions.map((option) => <option key={option} value={option}>{visibilityLabels[option]}</option>)}</select></label>
            <label className="block text-sm font-bold text-[#374151]">Minimum monthly<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((current) => ({ ...current, minimumAmount: event.target.value }))} step="0.01" type="number" value={form.minimumAmount} /></label>
            <label className="block text-sm font-bold text-[#374151]">Included employees<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((current) => ({ ...current, includedEmployees: event.target.value }))} type="number" value={form.includedEmployees} /></label>
            <label className="block text-sm font-bold text-[#374151]">Overage per employee<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((current) => ({ ...current, overageAmount: event.target.value }))} step="0.01" type="number" value={form.overageAmount} /></label>
            <label className="block text-sm font-bold text-[#374151]">Billing cycle<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, billingCycle: event.target.value as BillingCycle }))} value={form.billingCycle}>{billingCycles.map((cycle) => <option key={cycle} value={cycle}>{cycleLabels[cycle]}</option>)}</select></label>
            <label className="block text-sm font-bold text-[#374151]">Hard employee cap<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((current) => ({ ...current, employeeLimit: event.target.value }))} type="number" value={form.employeeLimit} /></label>
            <label className="block text-sm font-bold text-[#374151]">Trial days<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((current) => ({ ...current, trialDays: event.target.value }))} type="number" value={form.trialDays} /></label>
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-bold text-[#374151]"><input checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" /> Active</label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-[#edf1ef] pt-4">
          <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
        </div>
      </form>
    </div>
  );
}
