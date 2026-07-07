"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type SummaryRow = { metric: string; metric_count: number; amount: number };
type Plan = { id: string; code: string; name: string; plan_type: string; provider_name?: string; coverage_amount?: number; employer_contribution: number; employee_contribution: number; currency_code: string; is_active: boolean };
type WindowRow = { id: string; plan_id: string; name: string; opens_on: string; closes_on: string; status: string };
type Dependent = { id: string; employee_user_id: string; full_name: string; relationship: string; nominee_percentage?: number; is_nominee: boolean };
type Enrollment = { id: string; plan_id: string; employee_user_id: string; status: string; selected_amount?: number; coverage_level?: string; review_remarks?: string };
type ClaimType = { id: string; plan_id?: string; code: string; name: string; annual_limit?: number; per_claim_limit?: number; requires_attachment: boolean; payroll_component_code?: string; is_active: boolean };
type Claim = { id: string; claim_number: string; claim_type_id: string; plan_id?: string; employee_user_id: string; expense_date: string; claim_amount: number; approved_amount?: number; status: string; payment_status: string; payroll_export_status: string; review_remarks?: string };
type EventRow = { id: string; source_type: string; source_id: string; action: string; from_status?: string; to_status?: string; created_at: string };

type TabKey = "claims" | "plans" | "enrollments" | "dependents" | "claimTypes" | "events";
type ModalKey = "" | "plan" | "window" | "dependent" | "enrollment" | "claimType" | "claim" | "claimStatus" | "attachment";

const inputClass = "h-11 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#111827] outline-none focus:border-[#588368]";
const emptyPlan = { code: "", name: "", plan_type: "reimbursement", provider_name: "", policy_number: "", coverage_amount: "", employer_contribution: "0", employee_contribution: "0", currency_code: "INR", is_active: true };
const emptyWindow = { plan_id: "", name: "", opens_on: todayKey(), closes_on: todayKey(), status: "open" };
const emptyDependent = { employee_user_id: "", full_name: "", relationship: "spouse", date_of_birth: "", nominee_percentage: "", is_nominee: false };
const emptyEnrollment = { plan_id: "", window_id: "", employee_user_id: "", status: "submitted", coverage_level: "", selected_amount: "", employee_contribution: "0", employer_contribution: "0" };
const emptyClaimType = { plan_id: "", code: "", name: "", annual_limit: "", per_claim_limit: "", requires_attachment: true, taxable: false, payroll_component_code: "", is_active: true };
const emptyClaim = { claim_type_id: "", plan_id: "", employee_user_id: "", dependent_id: "", expense_date: todayKey(), claim_amount: "", currency_code: "INR", status: "submitted", notes: "" };
const emptyStatus = { id: "", status: "approved", approved_amount: "", payment_reference: "", payroll_export_reference: "", remarks: "" };

export function BenefitsClaimsSection({ isSuperAdmin, tenants, tenantsError, tenantsLoading }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsError: string; tenantsLoading: boolean }) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => `${a.name} ${a.code}`.localeCompare(`${b.name} ${b.code}`)), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [tab, setTab] = useState<TabKey>("claims");
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [modal, setModal] = useState<ModalKey>("");
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [windowForm, setWindowForm] = useState(emptyWindow);
  const [dependentForm, setDependentForm] = useState(emptyDependent);
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollment);
  const [claimTypeForm, setClaimTypeForm] = useState(emptyClaimType);
  const [claimForm, setClaimForm] = useState(emptyClaim);
  const [statusForm, setStatusForm] = useState(emptyStatus);
  const [attachmentClaimID, setAttachmentClaimID] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);
  const metric = useCallback((key: string) => summary.find((row) => row.metric === key) || { metric: key, metric_count: 0, amount: 0 }, [summary]);
  const planName = useCallback((id?: string) => plans.find((item) => item.id === id)?.name || "-", [plans]);
  const claimTypeName = useCallback((id?: string) => claimTypes.find((item) => item.id === id)?.name || "-", [claimTypes]);

  const loadData = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const [summaryRows, planRows, windowRows, dependentRows, enrollmentRows, typeRows, claimRows, eventRows] = await Promise.all([
        apiRequest<SummaryRow[]>(`${basePath}/benefits-summary`),
        apiRequest<Plan[]>(`${basePath}/benefit-plans?limit=200`),
        apiRequest<WindowRow[]>(`${basePath}/benefit-windows?limit=200`),
        apiRequest<Dependent[]>(`${basePath}/benefit-dependents?limit=200`),
        apiRequest<Enrollment[]>(`${basePath}/benefit-enrollments?limit=200`),
        apiRequest<ClaimType[]>(`${basePath}/benefit-claim-types?limit=200`),
        apiRequest<Claim[]>(`${basePath}/benefit-claims?limit=200`),
        apiRequest<EventRow[]>(`${basePath}/benefit-events?limit=100`),
      ]);
      setSummary(Array.isArray(summaryRows) ? summaryRows : []);
      setPlans(Array.isArray(planRows) ? planRows : []);
      setWindows(Array.isArray(windowRows) ? windowRows : []);
      setDependents(Array.isArray(dependentRows) ? dependentRows : []);
      setEnrollments(Array.isArray(enrollmentRows) ? enrollmentRows : []);
      setClaimTypes(Array.isArray(typeRows) ? typeRows : []);
      setClaims(Array.isArray(claimRows) ? claimRows : []);
      setEvents(Array.isArray(eventRows) ? eventRows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load benefits and claims.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function savePlan() {
    await apiRequest(`${basePath}/benefit-plans`, { method: "POST", body: numberPayload(planForm, ["coverage_amount", "employer_contribution", "employee_contribution"]) });
    setPlanForm(emptyPlan);
    setModal("");
    await loadData();
  }

  async function saveWindow() {
    await apiRequest(`${basePath}/benefit-windows`, { method: "POST", body: cleanPayload(windowForm) });
    setWindowForm(emptyWindow);
    setModal("");
    await loadData();
  }

  async function saveDependent() {
    await apiRequest(`${basePath}/benefit-dependents`, { method: "POST", body: numberPayload(dependentForm, ["nominee_percentage"]) });
    setDependentForm(emptyDependent);
    setModal("");
    await loadData();
  }

  async function saveEnrollment() {
    await apiRequest(`${basePath}/benefit-enrollments`, { method: "POST", body: numberPayload(enrollmentForm, ["selected_amount", "employee_contribution", "employer_contribution"]) });
    setEnrollmentForm(emptyEnrollment);
    setModal("");
    await loadData();
  }

  async function saveClaimType() {
    await apiRequest(`${basePath}/benefit-claim-types`, { method: "POST", body: numberPayload(claimTypeForm, ["annual_limit", "per_claim_limit"]) });
    setClaimTypeForm(emptyClaimType);
    setModal("");
    await loadData();
  }

  async function saveClaim() {
    await apiRequest(`${basePath}/benefit-claims`, { method: "POST", body: numberPayload(claimForm, ["claim_amount"]) });
    setClaimForm(emptyClaim);
    setModal("");
    await loadData();
  }

  async function updateClaimStatus() {
    await apiRequest(`${basePath}/benefit-claims/${statusForm.id}/status`, { method: "POST", body: numberPayload(statusForm, ["approved_amount"]) });
    setStatusForm(emptyStatus);
    setModal("");
    await loadData();
  }

  async function uploadAttachment() {
    if (!attachmentFile || !attachmentClaimID) return;
    const contentBase64 = await fileToBase64(attachmentFile);
    await apiRequest(`${basePath}/benefit-claims/${attachmentClaimID}/attachments`, { method: "POST", body: { file_name: attachmentFile.name, content_type: attachmentFile.type || "application/octet-stream", content_base64: contentBase64 } });
    setAttachmentFile(null);
    setAttachmentClaimID("");
    setModal("");
    await loadData();
  }

  if (isSuperAdmin && !selectedTenantID) {
    return <main className="space-y-5 p-6 lg:p-10"><Header loading={loading} onNew={() => setModal("claim")} onRefresh={loadData} showInfo={showInfo} setShowInfo={setShowInfo} /><TenantPicker disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /></main>;
  }

  return (
    <main className="space-y-5 p-6 lg:p-10">
      <Header loading={loading} onNew={() => setModal("claim")} onRefresh={loadData} showInfo={showInfo} setShowInfo={setShowInfo} />
      {isSuperAdmin ? <TenantPicker compact disabled={tenantsLoading} error={tenantsError} onChange={setSelectedTenantID} tenants={sortedTenants} value={selectedTenantID} /> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Active plans" value={metric("active_plans").metric_count} />
        <Metric label="Pending claims" value={metric("pending_claims").metric_count} tone="warn" />
        <Metric label="Payable amount" value={currency(metric("payable_claims").amount)} tone="info" />
        <Metric label="Payroll ready" value={metric("payroll_ready").metric_count} tone="success" />
      </section>
      <section className="overflow-hidden rounded-lg border border-[#dfe6e2] bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-[#edf1ef] p-3">
          {(["claims", "plans", "enrollments", "dependents", "claimTypes", "events"] as TabKey[]).map((item) => <button className={`rounded-lg px-4 py-2 text-sm font-black ${tab === item ? "bg-[#111827] text-white" : "text-[#374151] hover:bg-[#f8faf9]"}`} key={item} onClick={() => setTab(item)} type="button">{tabLabel(item)}</button>)}
        </div>
        <div className="p-4">
          {tab === "claims" ? <ClaimsTable claims={claims} claimTypeName={claimTypeName} onAttach={(id) => { setAttachmentClaimID(id); setModal("attachment"); }} onNew={() => setModal("claim")} onReview={(claim) => { setStatusForm({ ...emptyStatus, id: claim.id, approved_amount: `${claim.approved_amount || claim.claim_amount}` }); setModal("claimStatus"); }} /> : null}
          {tab === "plans" ? <PlansTab plans={plans} windows={windows} onNewPlan={() => setModal("plan")} onNewWindow={() => setModal("window")} /> : null}
          {tab === "enrollments" ? <EnrollmentsTab enrollments={enrollments} planName={planName} onNew={() => setModal("enrollment")} /> : null}
          {tab === "dependents" ? <DependentsTab dependents={dependents} onNew={() => setModal("dependent")} /> : null}
          {tab === "claimTypes" ? <ClaimTypesTab claimTypes={claimTypes} planName={planName} onNew={() => setModal("claimType")} /> : null}
          {tab === "events" ? <EventsTab events={events} /> : null}
        </div>
      </section>
      <HrmsModal open={modal === "plan"} onClose={() => setModal("")} title="Benefit Plan"><PlanForm form={planForm} setForm={setPlanForm} onCancel={() => setModal("")} onSubmit={savePlan} /></HrmsModal>
      <HrmsModal open={modal === "window"} onClose={() => setModal("")} title="Enrollment Window"><WindowForm form={windowForm} plans={plans} setForm={setWindowForm} onCancel={() => setModal("")} onSubmit={saveWindow} /></HrmsModal>
      <HrmsModal open={modal === "dependent"} onClose={() => setModal("")} title="Dependent / Nominee"><DependentForm form={dependentForm} setForm={setDependentForm} onCancel={() => setModal("")} onSubmit={saveDependent} /></HrmsModal>
      <HrmsModal open={modal === "enrollment"} onClose={() => setModal("")} title="Benefit Enrollment"><EnrollmentForm form={enrollmentForm} plans={plans} windows={windows} setForm={setEnrollmentForm} onCancel={() => setModal("")} onSubmit={saveEnrollment} /></HrmsModal>
      <HrmsModal open={modal === "claimType"} onClose={() => setModal("")} title="Claim Type"><ClaimTypeForm form={claimTypeForm} plans={plans} setForm={setClaimTypeForm} onCancel={() => setModal("")} onSubmit={saveClaimType} /></HrmsModal>
      <HrmsModal open={modal === "claim"} onClose={() => setModal("")} title="Submit Claim"><ClaimForm claimTypes={claimTypes} dependents={dependents} form={claimForm} plans={plans} setForm={setClaimForm} onCancel={() => setModal("")} onSubmit={saveClaim} /></HrmsModal>
      <HrmsModal open={modal === "claimStatus"} onClose={() => setModal("")} title="Review / Pay Claim"><ClaimStatusForm form={statusForm} setForm={setStatusForm} onCancel={() => setModal("")} onSubmit={updateClaimStatus} /></HrmsModal>
      <HrmsModal open={modal === "attachment"} onClose={() => setModal("")} title="Upload Claim Attachment"><AttachmentForm file={attachmentFile} setFile={setAttachmentFile} onCancel={() => setModal("")} onSubmit={uploadAttachment} /></HrmsModal>
    </main>
  );
}

function Header({ loading, onNew, onRefresh, showInfo, setShowInfo }: { loading: boolean; onNew: () => void; onRefresh: () => void; showInfo: boolean; setShowInfo: (value: boolean) => void }) {
  return <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Benefits / Claims</p><button className="grid size-7 place-items-center rounded-full border border-[#dbe0e5] text-xs font-black text-[#588368]" onClick={() => setShowInfo(!showInfo)} type="button">i</button></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">Benefits & Claims</h1>{showInfo ? <p className="mt-2 max-w-3xl rounded-lg border border-[#dfe6e2] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#6b7280]">Market pattern: employees expect self-service dependents, enrollment windows, easy reimbursement claims and evidence upload; HR needs limit controls, approval queues, payment state and payroll-ready exports.</p> : null}</div><div className="flex gap-2"><button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151]" onClick={onRefresh} type="button">{loading ? "Loading" : "Refresh"}</button><button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={onNew} type="button">Submit Claim</button></div></header>;
}

function TenantPicker({ compact, disabled, error, onChange, tenants, value }: { compact?: boolean; disabled?: boolean; error: string; onChange: (value: string) => void; tenants: BranchTenantOption[]; value: string }) {
  return <section className={`rounded-lg border border-[#dfe6e2] bg-white ${compact ? "p-3" : "p-5"}`}><select className={inputClass + " w-full"} disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Select tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}</select>{error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}</section>;
}

function ClaimsTable({ claims, claimTypeName, onAttach, onNew, onReview }: { claims: Claim[]; claimTypeName: (id?: string) => string; onAttach: (id: string) => void; onNew: () => void; onReview: (claim: Claim) => void }) {
  return <TableShell empty="No claims submitted." onNew={onNew}>{claims.map((claim) => <tr className="border-t border-[#edf1ef]" key={claim.id}><td className="px-4 py-3 font-black">{claim.claim_number}</td><td className="px-4 py-3">{claimTypeName(claim.claim_type_id)}<br /><span className="text-xs font-bold text-[#6b7280]">{claim.employee_user_id}</span></td><td className="px-4 py-3">{dateOnly(claim.expense_date)}</td><td className="px-4 py-3 font-black">{currency(claim.claim_amount)}</td><td className="px-4 py-3"><Badge text={title(claim.status)} /></td><td className="px-4 py-3"><Badge text={title(claim.payroll_export_status)} tone={claim.payroll_export_status === "blocked" ? "danger" : undefined} /></td><td className="px-4 py-3"><div className="flex gap-2"><button className="rounded-lg border px-3 py-2 text-xs font-black" onClick={() => onReview(claim)} type="button">Review</button><button className="rounded-lg border px-3 py-2 text-xs font-black" onClick={() => onAttach(claim.id)} type="button">Attach</button></div></td></tr>)}</TableShell>;
}

function PlansTab({ onNewPlan, onNewWindow, plans, windows }: { plans: Plan[]; windows: WindowRow[]; onNewPlan: () => void; onNewWindow: () => void }) {
  return <div className="space-y-4"><div className="flex justify-end gap-2"><button className="rounded-lg border px-4 py-2 text-sm font-black" onClick={onNewWindow} type="button">New Window</button><button className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-black text-white" onClick={onNewPlan} type="button">New Plan</button></div><div className="grid gap-3 md:grid-cols-2">{plans.length ? plans.map((plan) => <Card key={plan.id} title={`${plan.code} · ${plan.name}`} meta={`${title(plan.plan_type)} · ${plan.provider_name || "Internal"} · ${currency(plan.coverage_amount || 0)}`} badge={plan.is_active ? "Active" : "Inactive"} />) : <Empty text="No plans configured." />}</div><div className="grid gap-3 md:grid-cols-2">{windows.map((row) => <Card key={row.id} title={row.name} meta={`${dateOnly(row.opens_on)} to ${dateOnly(row.closes_on)}`} badge={title(row.status)} />)}</div></div>;
}

function EnrollmentsTab({ enrollments, onNew, planName }: { enrollments: Enrollment[]; onNew: () => void; planName: (id?: string) => string }) { return <Cards label="Enrollments" onNew={onNew}>{enrollments.length ? enrollments.map((item) => <Card key={item.id} title={planName(item.plan_id)} meta={`${item.employee_user_id} · ${currency(item.selected_amount || 0)}`} badge={title(item.status)} />) : <Empty text="No benefit enrollments." />}</Cards>; }
function DependentsTab({ dependents, onNew }: { dependents: Dependent[]; onNew: () => void }) { return <Cards label="Dependents / Nominees" onNew={onNew}>{dependents.length ? dependents.map((item) => <Card key={item.id} title={item.full_name} meta={`${title(item.relationship)} · ${item.employee_user_id}`} badge={item.is_nominee ? `Nominee ${item.nominee_percentage || 0}%` : "Dependent"} />) : <Empty text="No dependents or nominees." />}</Cards>; }
function ClaimTypesTab({ claimTypes, onNew, planName }: { claimTypes: ClaimType[]; onNew: () => void; planName: (id?: string) => string }) { return <Cards label="Claim Types" onNew={onNew}>{claimTypes.length ? claimTypes.map((item) => <Card key={item.id} title={`${item.code} · ${item.name}`} meta={`${planName(item.plan_id)} · annual ${currency(item.annual_limit || 0)} · claim ${currency(item.per_claim_limit || 0)}`} badge={item.requires_attachment ? "Attachment" : "No attachment"} />) : <Empty text="No claim types configured." />}</Cards>; }
function EventsTab({ events }: { events: EventRow[] }) { return <div className="grid gap-3">{events.length ? events.map((item) => <Card key={item.id} title={`${title(item.source_type)} · ${title(item.action)}`} meta={`${item.source_id} · ${dateOnly(item.created_at)}`} badge={item.to_status || item.from_status || "Audit"} />) : <Empty text="No benefit events." />}</div>; }

function PlanForm({ form, onCancel, onSubmit, setForm }: { form: typeof emptyPlan; setForm: (form: typeof emptyPlan) => void; onCancel: () => void; onSubmit: () => void }) {
  return <FormGrid><Field label="Code"><input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Type"><OptionSelect value={form.plan_type} options={["insurance", "reimbursement", "allowance", "retirement", "wellness", "other"]} onChange={(value) => setForm({ ...form, plan_type: value })} /></Field><Field label="Provider"><input className={inputClass} value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} /></Field><Field label="Coverage"><input className={inputClass} value={form.coverage_amount} onChange={(e) => setForm({ ...form, coverage_amount: e.target.value })} /></Field><Field label="Employer Cost"><input className={inputClass} value={form.employer_contribution} onChange={(e) => setForm({ ...form, employer_contribution: e.target.value })} /></Field><Field label="Employee Cost"><input className={inputClass} value={form.employee_contribution} onChange={(e) => setForm({ ...form, employee_contribution: e.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></FormGrid>;
}

function WindowForm({ form, onCancel, onSubmit, plans, setForm }: { form: typeof emptyWindow; plans: Plan[]; setForm: (form: typeof emptyWindow) => void; onCancel: () => void; onSubmit: () => void }) { return <FormGrid><Field label="Plan"><PlanSelect plans={plans} value={form.plan_id} onChange={(value) => setForm({ ...form, plan_id: value })} /></Field><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Opens"><input className={inputClass} type="date" value={form.opens_on} onChange={(e) => setForm({ ...form, opens_on: e.target.value })} /></Field><Field label="Closes"><input className={inputClass} type="date" value={form.closes_on} onChange={(e) => setForm({ ...form, closes_on: e.target.value })} /></Field><Field label="Status"><OptionSelect value={form.status} options={["draft", "open", "closed", "archived"]} onChange={(value) => setForm({ ...form, status: value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></FormGrid>; }
function DependentForm({ form, onCancel, onSubmit, setForm }: { form: typeof emptyDependent; setForm: (form: typeof emptyDependent) => void; onCancel: () => void; onSubmit: () => void }) { return <FormGrid><Field label="Employee User ID"><input className={inputClass} value={form.employee_user_id} onChange={(e) => setForm({ ...form, employee_user_id: e.target.value })} /></Field><Field label="Full Name"><input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field><Field label="Relationship"><OptionSelect value={form.relationship} options={["spouse", "child", "parent", "sibling", "nominee", "other"]} onChange={(value) => setForm({ ...form, relationship: value })} /></Field><Field label="Date of Birth"><input className={inputClass} type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field><Field label="Nominee %"><input className={inputClass} value={form.nominee_percentage} onChange={(e) => setForm({ ...form, nominee_percentage: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm font-black"><input checked={form.is_nominee} onChange={(e) => setForm({ ...form, is_nominee: e.target.checked })} type="checkbox" />Nominee</label><Actions onCancel={onCancel} onSubmit={onSubmit} /></FormGrid>; }
function EnrollmentForm({ form, onCancel, onSubmit, plans, setForm, windows }: { form: typeof emptyEnrollment; plans: Plan[]; windows: WindowRow[]; setForm: (form: typeof emptyEnrollment) => void; onCancel: () => void; onSubmit: () => void }) { return <FormGrid><Field label="Plan"><PlanSelect plans={plans} value={form.plan_id} onChange={(value) => setForm({ ...form, plan_id: value })} /></Field><Field label="Window"><select className={inputClass} value={form.window_id} onChange={(e) => setForm({ ...form, window_id: e.target.value })}><option value="">No window</option>{windows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Employee User ID"><input className={inputClass} value={form.employee_user_id} onChange={(e) => setForm({ ...form, employee_user_id: e.target.value })} /></Field><Field label="Coverage Level"><input className={inputClass} value={form.coverage_level} onChange={(e) => setForm({ ...form, coverage_level: e.target.value })} /></Field><Field label="Selected Amount"><input className={inputClass} value={form.selected_amount} onChange={(e) => setForm({ ...form, selected_amount: e.target.value })} /></Field><Field label="Status"><OptionSelect value={form.status} options={["draft", "submitted", "approved", "active", "rejected", "cancelled"]} onChange={(value) => setForm({ ...form, status: value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></FormGrid>; }
function ClaimTypeForm({ form, onCancel, onSubmit, plans, setForm }: { form: typeof emptyClaimType; plans: Plan[]; setForm: (form: typeof emptyClaimType) => void; onCancel: () => void; onSubmit: () => void }) { return <FormGrid><Field label="Plan"><PlanSelect plans={plans} value={form.plan_id} onChange={(value) => setForm({ ...form, plan_id: value })} /></Field><Field label="Code"><input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field><Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Annual Limit"><input className={inputClass} value={form.annual_limit} onChange={(e) => setForm({ ...form, annual_limit: e.target.value })} /></Field><Field label="Per Claim Limit"><input className={inputClass} value={form.per_claim_limit} onChange={(e) => setForm({ ...form, per_claim_limit: e.target.value })} /></Field><Field label="Payroll Code"><input className={inputClass} value={form.payroll_component_code} onChange={(e) => setForm({ ...form, payroll_component_code: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm font-black"><input checked={form.requires_attachment} onChange={(e) => setForm({ ...form, requires_attachment: e.target.checked })} type="checkbox" />Needs attachment</label><Actions onCancel={onCancel} onSubmit={onSubmit} /></FormGrid>; }
function ClaimForm({ claimTypes, dependents, form, onCancel, onSubmit, plans, setForm }: { form: typeof emptyClaim; plans: Plan[]; claimTypes: ClaimType[]; dependents: Dependent[]; setForm: (form: typeof emptyClaim) => void; onCancel: () => void; onSubmit: () => void }) { return <FormGrid><Field label="Claim Type"><select className={inputClass} value={form.claim_type_id} onChange={(e) => setForm({ ...form, claim_type_id: e.target.value })}><option value="">Select type</option>{claimTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Plan"><PlanSelect plans={plans} value={form.plan_id} onChange={(value) => setForm({ ...form, plan_id: value })} /></Field><Field label="Employee User ID"><input className={inputClass} value={form.employee_user_id} onChange={(e) => setForm({ ...form, employee_user_id: e.target.value })} /></Field><Field label="Dependent"><select className={inputClass} value={form.dependent_id} onChange={(e) => setForm({ ...form, dependent_id: e.target.value })}><option value="">None</option>{dependents.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field><Field label="Expense Date"><input className={inputClass} type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></Field><Field label="Amount"><input className={inputClass} value={form.claim_amount} onChange={(e) => setForm({ ...form, claim_amount: e.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} /></Field><Field label="Notes"><textarea className={inputClass + " min-h-24"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></FormGrid>; }
function ClaimStatusForm({ form, onCancel, onSubmit, setForm }: { form: typeof emptyStatus; setForm: (form: typeof emptyStatus) => void; onCancel: () => void; onSubmit: () => void }) { return <FormGrid><Field label="Status"><OptionSelect value={form.status} options={["under_review", "approved", "rejected", "paid", "cancelled"]} onChange={(value) => setForm({ ...form, status: value })} /></Field><Field label="Approved Amount"><input className={inputClass} value={form.approved_amount} onChange={(e) => setForm({ ...form, approved_amount: e.target.value })} /></Field><Field label="Payment Reference"><input className={inputClass} value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} /></Field><Field label="Payroll Reference"><input className={inputClass} value={form.payroll_export_reference} onChange={(e) => setForm({ ...form, payroll_export_reference: e.target.value })} /></Field><Field label="Remarks"><textarea className={inputClass + " min-h-24"} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field><Actions onCancel={onCancel} onSubmit={onSubmit} /></FormGrid>; }
function AttachmentForm({ file, onCancel, onSubmit, setFile }: { file: File | null; setFile: (file: File | null) => void; onCancel: () => void; onSubmit: () => void }) { return <div className="space-y-4"><input className={inputClass + " w-full py-2"} onChange={(e) => setFile(e.target.files?.[0] || null)} type="file" /><p className="text-sm font-bold text-[#6b7280]">{file ? file.name : "No file selected"}</p><Actions onCancel={onCancel} onSubmit={onSubmit} /></div>; }

function Cards({ children, label, onNew }: { children: ReactNode; label: string; onNew: () => void }) { return <div><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-[#111827]">{label}</h2><button className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-black text-white" onClick={onNew} type="button">New</button></div><div className="grid gap-3 md:grid-cols-2">{children}</div></div>; }
function TableShell({ children, empty, onNew }: { children: ReactNode[]; empty: string; onNew: () => void }) { return <div><div className="mb-4 flex justify-end"><button className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-black text-white" onClick={onNew} type="button">New</button></div>{children.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#f8faf9] text-xs uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Number</th><th className="px-4 py-3">Type / Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payroll</th><th className="px-4 py-3"></th></tr></thead><tbody>{children}</tbody></table></div> : <Empty text={empty} />}</div>; }
function FormGrid({ children }: { children: ReactNode }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="grid gap-2 text-sm font-black text-[#374151]">{label}{children}</label>; }
function Actions({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) { return <div className="col-span-full flex justify-end gap-2"><button className="rounded-lg border px-4 py-2 text-sm font-black" onClick={onCancel} type="button">Cancel</button><button className="rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white" onClick={onSubmit} type="button">Save</button></div>; }
function Metric({ label, tone, value }: { label: string; value: number | string; tone?: "warn" | "danger" | "info" | "success" }) { const color = tone === "danger" ? "text-red-700" : tone === "warn" ? "text-amber-700" : tone === "info" ? "text-blue-700" : tone === "success" ? "text-[#315f3d]" : "text-[#111827]"; return <div className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-[#6b7280]">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>; }
function Badge({ text, tone }: { text: string; tone?: "danger" }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${tone === "danger" ? "bg-red-50 text-red-700" : "bg-[#edf7f0] text-[#315f3d]"}`}>{text}</span>; }
function Empty({ text }: { text: string }) { return <p className="rounded-lg bg-[#f8faf9] px-4 py-5 text-sm font-bold text-[#6b7280]">{text}</p>; }
function Card({ badge, meta, title: cardTitle }: { title: string; meta: string; badge: string }) { return <div className="rounded-lg border border-[#edf1ef] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#111827]">{cardTitle}</p><p className="mt-1 break-all text-sm font-semibold text-[#6b7280]">{meta}</p></div><Badge text={badge} /></div></div>; }
function PlanSelect({ onChange, plans, value }: { plans: Plan[]; value: string; onChange: (value: string) => void }) { return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}><option value="">No plan</option>{plans.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select>; }
function OptionSelect({ onChange, options, value }: { options: string[]; value: string; onChange: (value: string) => void }) { return <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((item) => <option key={item} value={item}>{title(item)}</option>)}</select>; }

function cleanPayload<T extends Record<string, unknown>>(value: T) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item != null)); }
function numberPayload<T extends Record<string, unknown>>(value: T, keys: string[]) { const payload = cleanPayload(value); for (const key of keys) if (payload[key] !== undefined) payload[key] = Number(payload[key]); return payload; }
function tabLabel(tab: TabKey) { return tab === "claimTypes" ? "Claim Types" : title(tab); }
function title(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function dateOnly(value?: string) { return value ? value.slice(0, 10) : "-"; }
function currency(value: number) { return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(value || 0); }
function fileToBase64(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "").split(",")[1] || ""); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
