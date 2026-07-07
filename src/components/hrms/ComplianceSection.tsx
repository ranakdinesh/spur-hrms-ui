"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type Worker = { id: string; display_name: string; worker_code?: string | null };
type Engagement = { id: string; title: string; engagement_code?: string | null; worker_display_name?: string | null };
type ComplianceRule = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  category: string;
  scope: string;
  severity: string;
  classification_group?: string | null;
  worker_type_id?: string | null;
  engagement_type?: string | null;
  trigger_event: string;
  default_due_days: number;
  recurring_days?: number | null;
  requires_evidence: boolean;
  evidence_label?: string | null;
  auto_detect_key?: string | null;
  blocks_payroll: boolean;
  is_active: boolean;
  worker_type_name?: string | null;
  branch_name?: string | null;
  department_name?: string | null;
};
type ChecklistItem = {
  id: string;
  rule_id: string;
  worker_profile_id?: string | null;
  engagement_id?: string | null;
  status: string;
  due_date?: string | null;
  evidence_path?: string | null;
  evidence_file_name?: string | null;
  waiver_reason?: string | null;
  waiver_until?: string | null;
  notes?: string | null;
  rule_code?: string | null;
  rule_title?: string | null;
  rule_category?: string | null;
  rule_severity?: string | null;
  requires_evidence: boolean;
  evidence_label?: string | null;
  blocks_payroll: boolean;
  worker_display_name?: string | null;
  worker_code?: string | null;
  engagement_title?: string | null;
  engagement_code?: string | null;
};
type SummaryRow = { category: string; status: string; item_count: number; payroll_blocker_count: number; due_soon_count: number };
type ComplianceEvent = { id: string; event_type: string; from_status?: string | null; to_status?: string | null; comment?: string | null; created_at: string };
type ModalState = "" | "rule" | "generate" | "status" | "evidence" | "waiver";
type Tab = "checklist" | "rules" | "audit";

const categories = ["clra", "fixed_term", "gig_worker", "tds", "pf", "esic", "pt", "lwf", "document", "safety", "contract", "custom"];
const severities = ["low", "medium", "high", "critical"];
const scopes = ["worker", "engagement", "worker_or_engagement"];
const statuses = ["pending", "in_review", "compliant", "non_compliant", "waived", "expired", "not_applicable"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "-";
}

function cleanLabel(value?: string | null) {
  return (value || "-").replaceAll("_", " ");
}

function statusClass(status: string) {
  if (["compliant", "not_applicable"].includes(status)) return "bg-[#e7f6ed] text-[#237a45]";
  if (["non_compliant", "expired"].includes(status)) return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "waived") return "bg-[#fef3c7] text-[#92400e]";
  if (status === "in_review") return "bg-[#e0f2fe] text-[#0369a1]";
  return "bg-[#eef4f1] text-[#588368]";
}

function severityClass(severity: string) {
  if (severity === "critical") return "bg-[#fee2e2] text-[#b91c1c]";
  if (severity === "high") return "bg-[#fef3c7] text-[#92400e]";
  if (severity === "medium") return "bg-[#e0f2fe] text-[#0369a1]";
  return "bg-[#eef4f1] text-[#588368]";
}

export function ComplianceSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <Header title="Compliance" />
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

  return <ComplianceWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function ComplianceWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [tab, setTab] = useState<Tab>("checklist");
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [modal, setModal] = useState<ModalState>("");
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [editRule, setEditRule] = useState<ComplianceRule | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [ruleForm, setRuleForm] = useState(defaultRuleForm());
  const [generateForm, setGenerateForm] = useState({ target: "worker", worker_profile_id: "", engagement_id: "" });
  const [statusForm, setStatusForm] = useState({ status: "compliant", notes: "" });
  const [evidenceForm, setEvidenceForm] = useState({ evidence_path: "", evidence_file_name: "", evidence_content_type: "", notes: "" });
  const [waiverForm, setWaiverForm] = useState({ waiver_reason: "", waiver_until: "", notes: "" });

  const load = useCallback(async () => {
    const [ruleRows, itemRows, summaryRows, eventRows, workerRows, engagementRows] = await Promise.all([
      apiRequest<ComplianceRule[]>(`${basePath}/compliance-rules`).catch(() => []),
      apiRequest<ChecklistItem[]>(`${basePath}/compliance-checklist`).catch(() => []),
      apiRequest<SummaryRow[]>(`${basePath}/compliance-summary`).catch(() => []),
      apiRequest<ComplianceEvent[]>(`${basePath}/compliance-events`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<Engagement[]>(`${basePath}/engagements`).catch(() => []),
    ]);
    setRules(ruleRows);
    setItems(itemRows);
    setSummary(summaryRows);
    setEvents(eventRows);
    setWorkers(workerRows);
    setEngagements(engagementRows);
    setGenerateForm((current) => ({ ...current, worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "", engagement_id: current.engagement_id || engagementRows[0]?.id || "" }));
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load compliance."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const total = items.length;
    const blocker = items.filter((item) => item.blocks_payroll && !["compliant", "waived", "not_applicable"].includes(item.status)).length;
    const dueSoon = summary.reduce((sum, row) => sum + row.due_soon_count, 0);
    const compliant = items.filter((item) => item.status === "compliant").length;
    return { total, blocker, dueSoon, compliant };
  }, [items, summary]);

  async function seedRules() {
    setError(""); setNotice("");
    try {
      const created = await apiRequest<ComplianceRule[]>(`${basePath}/compliance-rules/seed-defaults`, { method: "POST", body: {} });
      setNotice(created.length ? `${created.length} default rules added.` : "Default rules already exist.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to seed compliance rules.");
    }
  }

  async function saveRule() {
    setError(""); setNotice("");
    const body = {
      ...ruleForm,
      classification_group: emptyToNull(ruleForm.classification_group),
      engagement_type: emptyToNull(ruleForm.engagement_type),
      default_due_days: Number(ruleForm.default_due_days || 0),
      recurring_days: ruleForm.recurring_days ? Number(ruleForm.recurring_days) : null,
      evidence_label: emptyToNull(ruleForm.evidence_label),
      auto_detect_key: emptyToNull(ruleForm.auto_detect_key),
    };
    try {
      if (editRule) {
        await apiRequest<ComplianceRule>(`${basePath}/compliance-rules/${editRule.id}`, { method: "PUT", body });
        setNotice("Compliance rule updated.");
      } else {
        await apiRequest<ComplianceRule>(`${basePath}/compliance-rules`, { method: "POST", body });
        setNotice("Compliance rule created.");
      }
      setModal("");
      setEditRule(null);
      setRuleForm(defaultRuleForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save compliance rule.");
    }
  }

  async function generateChecklist() {
    setError(""); setNotice("");
    try {
      const body = generateForm.target === "worker" ? { worker_profile_id: generateForm.worker_profile_id } : { engagement_id: generateForm.engagement_id };
      const created = await apiRequest<ChecklistItem[]>(`${basePath}/compliance-checklist/generate`, { method: "POST", body });
      setNotice(created.length ? `${created.length} checklist items generated.` : "Checklist already exists for the selected target.");
      setModal("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate checklist.");
    }
  }

  async function submitStatus() {
    if (!selectedItem) return;
    setError(""); setNotice("");
    try {
      await apiRequest<ChecklistItem>(`${basePath}/compliance-checklist/${selectedItem.id}/status`, { method: "POST", body: { status: statusForm.status, notes: emptyToNull(statusForm.notes) } });
      setNotice("Checklist status updated.");
      closeItemModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update checklist status.");
    }
  }

  async function submitEvidence() {
    if (!selectedItem) return;
    setError(""); setNotice("");
    try {
      await apiRequest<ChecklistItem>(`${basePath}/compliance-checklist/${selectedItem.id}/evidence`, { method: "POST", body: { evidence_path: emptyToNull(evidenceForm.evidence_path), evidence_file_name: emptyToNull(evidenceForm.evidence_file_name), evidence_content_type: emptyToNull(evidenceForm.evidence_content_type), notes: emptyToNull(evidenceForm.notes) } });
      setNotice("Evidence sent for review.");
      closeItemModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save evidence.");
    }
  }

  async function submitWaiver() {
    if (!selectedItem) return;
    setError(""); setNotice("");
    try {
      await apiRequest<ChecklistItem>(`${basePath}/compliance-checklist/${selectedItem.id}/waive`, { method: "POST", body: { waiver_reason: waiverForm.waiver_reason, waiver_until: emptyToNull(waiverForm.waiver_until), notes: emptyToNull(waiverForm.notes) } });
      setNotice("Checklist item waived.");
      closeItemModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to waive checklist item.");
    }
  }

  function openRule(rule?: ComplianceRule) {
    setEditRule(rule || null);
    setRuleForm(rule ? ruleToForm(rule) : defaultRuleForm());
    setModal("rule");
  }

  function openItem(item: ChecklistItem, next: ModalState) {
    setSelectedItem(item);
    setStatusForm({ status: item.status === "pending" ? "compliant" : item.status, notes: item.notes || "" });
    setEvidenceForm({ evidence_path: item.evidence_path || "", evidence_file_name: item.evidence_file_name || "", evidence_content_type: "", notes: item.notes || "" });
    setWaiverForm({ waiver_reason: item.waiver_reason || "", waiver_until: item.waiver_until?.slice(0, 10) || today(), notes: item.notes || "" });
    setModal(next);
  }

  function closeItemModal() {
    setModal("");
    setSelectedItem(null);
  }

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Header title={tenant ? `${tenant.name} Compliance` : "Compliance"} />
        <div className="flex flex-wrap gap-2">
          {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}
          <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => void seedRules()} type="button">Seed Defaults</button>
          <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setModal("generate")} type="button">Generate</button>
          <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => openRule()} type="button">New Rule</button>
        </div>
      </div>
      {error ? <Alert tone="danger" text={error} /> : null}
      {notice ? <Alert tone="success" text={notice} /> : null}
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Checklist" value={metrics.total} />
        <Metric label="Compliant" value={metrics.compliant} />
        <Metric label="Due Soon" value={metrics.dueSoon} />
        <Metric label="Payroll Blockers" value={metrics.blocker} />
      </section>
      <div className="flex flex-wrap gap-2">
        {(["checklist", "rules", "audit"] as Tab[]).map((item) => <button className={`rounded-xl px-4 py-2 text-sm font-black ${tab === item ? "bg-[#588368] text-white" : "border border-[#dbe0e5] bg-white text-[#374151]"}`} key={item} onClick={() => setTab(item)} type="button">{cleanLabel(item)}</button>)}
      </div>
      {tab === "checklist" ? <ChecklistPanel items={items} onEvidence={(item) => openItem(item, "evidence")} onReview={(item) => openItem(item, "status")} onWaive={(item) => openItem(item, "waiver")} /> : null}
      {tab === "rules" ? <RulesPanel onEdit={openRule} rules={rules} /> : null}
      {tab === "audit" ? <AuditPanel events={events} /> : null}
      <HrmsModal onClose={() => setModal("")} open={modal === "rule"} title={editRule ? "Edit Compliance Rule" : "New Compliance Rule"}>
        <div className="grid gap-4">
          <FormInfo text="Rules define who needs a checklist item, which evidence is expected, and whether an unresolved item blocks payroll handoff." />
          <div className="grid gap-3 md:grid-cols-2"><Field label="Code" value={ruleForm.code} onChange={(value) => setRuleForm({ ...ruleForm, code: value.toUpperCase() })} /><Field label="Title" value={ruleForm.title} onChange={(value) => setRuleForm({ ...ruleForm, title: value })} /></div>
          <Field label="Description" value={ruleForm.description} onChange={(value) => setRuleForm({ ...ruleForm, description: value })} />
          <div className="grid gap-3 md:grid-cols-4"><Select label="Category" value={ruleForm.category} onChange={(value) => setRuleForm({ ...ruleForm, category: value })} options={categories} /><Select label="Scope" value={ruleForm.scope} onChange={(value) => setRuleForm({ ...ruleForm, scope: value })} options={scopes} /><Select label="Severity" value={ruleForm.severity} onChange={(value) => setRuleForm({ ...ruleForm, severity: value })} options={severities} /><Field label="Due Days" type="number" value={ruleForm.default_due_days} onChange={(value) => setRuleForm({ ...ruleForm, default_due_days: value })} /></div>
          <div className="grid gap-3 md:grid-cols-3"><Field label="Classification Group" value={ruleForm.classification_group} onChange={(value) => setRuleForm({ ...ruleForm, classification_group: value })} /><Field label="Engagement Type" value={ruleForm.engagement_type} onChange={(value) => setRuleForm({ ...ruleForm, engagement_type: value })} /><Field label="Recurring Days" type="number" value={ruleForm.recurring_days} onChange={(value) => setRuleForm({ ...ruleForm, recurring_days: value })} /></div>
          <div className="grid gap-3 md:grid-cols-2"><Field label="Evidence Label" value={ruleForm.evidence_label} onChange={(value) => setRuleForm({ ...ruleForm, evidence_label: value })} /><Field label="Auto Detect Key" value={ruleForm.auto_detect_key} onChange={(value) => setRuleForm({ ...ruleForm, auto_detect_key: value })} /></div>
          <div className="flex flex-wrap gap-4"><Toggle checked={ruleForm.requires_evidence} label="Requires Evidence" onChange={(value) => setRuleForm({ ...ruleForm, requires_evidence: value })} /><Toggle checked={ruleForm.blocks_payroll} label="Blocks Payroll" onChange={(value) => setRuleForm({ ...ruleForm, blocks_payroll: value })} /><Toggle checked={ruleForm.is_active} label="Active" onChange={(value) => setRuleForm({ ...ruleForm, is_active: value })} /></div>
          <ModalActions onCancel={() => setModal("")} onSubmit={() => void saveRule()} submit={editRule ? "Update Rule" : "Create Rule"} />
        </div>
      </HrmsModal>
      <HrmsModal onClose={() => setModal("")} open={modal === "generate"} title="Generate Checklist">
        <div className="grid gap-4">
          <FormInfo text="Generation applies active rules to the selected worker or engagement and skips checklist items that already exist." />
          <Select label="Target" value={generateForm.target} onChange={(value) => setGenerateForm({ ...generateForm, target: value })} options={["worker", "engagement"]} />
          {generateForm.target === "worker" ? <Select label="Worker" value={generateForm.worker_profile_id} onChange={(value) => setGenerateForm({ ...generateForm, worker_profile_id: value })} options={workers.map((item) => item.id)} labels={Object.fromEntries(workers.map((item) => [item.id, `${item.display_name}${item.worker_code ? ` (${item.worker_code})` : ""}`]))} /> : <Select label="Engagement" value={generateForm.engagement_id} onChange={(value) => setGenerateForm({ ...generateForm, engagement_id: value })} options={engagements.map((item) => item.id)} labels={Object.fromEntries(engagements.map((item) => [item.id, `${item.title}${item.engagement_code ? ` (${item.engagement_code})` : ""}`]))} />}
          <ModalActions onCancel={() => setModal("")} onSubmit={() => void generateChecklist()} submit="Generate" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={closeItemModal} open={modal === "status"} title="Review Checklist">
        <div className="grid gap-4">
          <Select label="Status" value={statusForm.status} onChange={(value) => setStatusForm({ ...statusForm, status: value })} options={statuses} />
          <Field label="Notes" value={statusForm.notes} onChange={(value) => setStatusForm({ ...statusForm, notes: value })} />
          <ModalActions onCancel={closeItemModal} onSubmit={() => void submitStatus()} submit="Save Review" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={closeItemModal} open={modal === "evidence"} title="Evidence">
        <div className="grid gap-4">
          <FormInfo text="Attach the evidence reference saved in your tenant storage or upload queue. The item moves to review when evidence is recorded." />
          <input className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm" onChange={(event) => { const file = event.target.files?.[0]; if (file) setEvidenceForm({ ...evidenceForm, evidence_file_name: file.name, evidence_content_type: file.type || "application/octet-stream", evidence_path: `compliance-evidence/${file.name}` }); }} type="file" />
          <div className="grid gap-3 md:grid-cols-2"><Field label="Evidence Path" value={evidenceForm.evidence_path} onChange={(value) => setEvidenceForm({ ...evidenceForm, evidence_path: value })} /><Field label="File Name" value={evidenceForm.evidence_file_name} onChange={(value) => setEvidenceForm({ ...evidenceForm, evidence_file_name: value })} /></div>
          <Field label="Notes" value={evidenceForm.notes} onChange={(value) => setEvidenceForm({ ...evidenceForm, notes: value })} />
          <ModalActions onCancel={closeItemModal} onSubmit={() => void submitEvidence()} submit="Save Evidence" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={closeItemModal} open={modal === "waiver"} title="Waiver">
        <div className="grid gap-4">
          <FormInfo text="Waivers are audit records. Use them for business-approved exceptions, not to hide missing evidence." />
          <Field label="Reason" value={waiverForm.waiver_reason} onChange={(value) => setWaiverForm({ ...waiverForm, waiver_reason: value })} />
          <Field label="Waiver Until" type="date" value={waiverForm.waiver_until} onChange={(value) => setWaiverForm({ ...waiverForm, waiver_until: value })} />
          <Field label="Notes" value={waiverForm.notes} onChange={(value) => setWaiverForm({ ...waiverForm, notes: value })} />
          <ModalActions onCancel={closeItemModal} onSubmit={() => void submitWaiver()} submit="Waive" />
        </div>
      </HrmsModal>
    </main>
  );
}

function ChecklistPanel({ items, onEvidence, onReview, onWaive }: { items: ChecklistItem[]; onEvidence: (item: ChecklistItem) => void; onReview: (item: ChecklistItem) => void; onWaive: (item: ChecklistItem) => void }) {
  return (
    <Panel info="Checklist rows are generated from active rules. Payroll blockers stay visible until compliant, waived, or marked not applicable." title="Checklist">
      <div className="overflow-x-auto rounded-xl border border-[#edf1ef]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[#f8faf9] text-xs font-black uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Rule</th><th>Target</th><th>Due</th><th>Status</th><th>Evidence</th><th>Risk</th><th className="text-right pr-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-[#edf1ef]">{items.length === 0 ? <tr><td className="px-4 py-6 text-sm font-semibold text-[#6b7280]" colSpan={7}>No compliance checklist items.</td></tr> : items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3"><strong className="text-[#111827]">{item.rule_code} · {item.rule_title}</strong><p className="mt-1 text-xs font-bold text-[#6b7280]">{cleanLabel(item.rule_category)} · {cleanLabel(item.rule_severity)}</p></td>
              <td><strong>{item.worker_display_name || "-"}</strong><p className="text-xs font-bold text-[#6b7280]">{item.engagement_title || item.worker_code || "-"}</p></td>
              <td>{dateOnly(item.due_date)}</td>
              <td><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{cleanLabel(item.status)}</span></td>
              <td>{item.evidence_file_name || item.evidence_path || (item.requires_evidence ? "Required" : "Optional")}</td>
              <td>{item.blocks_payroll ? <span className="rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-black text-[#b91c1c]">Payroll block</span> : <span className="text-xs font-bold text-[#6b7280]">Normal</span>}</td>
              <td className="pr-4 text-right"><div className="flex justify-end gap-2"><SmallButton label="Evidence" onClick={() => onEvidence(item)} /><SmallButton label="Review" onClick={() => onReview(item)} /><SmallButton label="Waive" onClick={() => onWaive(item)} /></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function RulesPanel({ onEdit, rules }: { onEdit: (rule: ComplianceRule) => void; rules: ComplianceRule[] }) {
  return <Panel info="Keep rules practical: define target scope, evidence expectation, severity, and payroll-blocking behavior." title="Rules"><div className="grid gap-3 lg:grid-cols-2">{rules.length === 0 ? <Empty text="No compliance rules. Seed defaults or create a rule." /> : rules.map((rule) => <button className="rounded-xl border border-[#edf1ef] p-4 text-left hover:border-[#588368]" key={rule.id} onClick={() => onEdit(rule)} type="button"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-[#111827]">{rule.code} · {rule.title}</strong><p className="mt-1 text-xs font-bold text-[#6b7280]">{cleanLabel(rule.category)} · {cleanLabel(rule.scope)} · due +{rule.default_due_days}d</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(rule.severity)}`}>{rule.severity}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#6b7280]">{rule.requires_evidence ? <span>Evidence</span> : null}{rule.blocks_payroll ? <span>Payroll block</span> : null}<span>{rule.is_active ? "Active" : "Inactive"}</span>{rule.classification_group ? <span>{rule.classification_group}</span> : null}</div></button>)}</div></Panel>;
}

function AuditPanel({ events }: { events: ComplianceEvent[] }) {
  return <Panel info="Audit records show rule setup, checklist generation, evidence, review, waiver, and deletion actions." title="Audit"><div className="space-y-2">{events.length === 0 ? <Empty text="No compliance audit events." /> : events.map((event) => <div className="rounded-xl bg-[#f8faf9] px-4 py-3 text-sm font-bold text-[#374151]" key={event.id}>{dateOnly(event.created_at)} · {cleanLabel(event.event_type)} · {event.from_status || "-"} → {event.to_status || "-"}{event.comment ? ` · ${event.comment}` : ""}</div>)}</div></Panel>;
}

function defaultRuleForm() {
  return { code: "", title: "", description: "", category: "document", scope: "worker", severity: "medium", classification_group: "", engagement_type: "", default_due_days: "0", recurring_days: "", requires_evidence: true, evidence_label: "", auto_detect_key: "", blocks_payroll: false, is_active: true };
}

function ruleToForm(rule: ComplianceRule) {
  return { code: rule.code, title: rule.title, description: rule.description || "", category: rule.category, scope: rule.scope, severity: rule.severity, classification_group: rule.classification_group || "", engagement_type: rule.engagement_type || "", default_due_days: String(rule.default_due_days || 0), recurring_days: rule.recurring_days ? String(rule.recurring_days) : "", requires_evidence: rule.requires_evidence, evidence_label: rule.evidence_label || "", auto_detect_key: rule.auto_detect_key || "", blocks_payroll: rule.blocks_payroll, is_active: rule.is_active };
}

function emptyToNull(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function Header({ title }: { title: string }) {
  return <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Workforce</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1></div>;
}

function Panel({ children, info, title }: { children: ReactNode; info: string; title: string }) {
  return <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-[#111827]">{title}</h2><InfoButton label={info} /></div>{children}</section>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><p className="mt-2 text-2xl font-black text-[#111827]">{value}</p></div>;
}

function Alert({ text, tone }: { text: string; tone: "danger" | "success" }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${tone === "danger" ? "border-[#fca5a5] bg-[#fff1f2] text-[#b91c1c]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"}`}>{text}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">{text}</p>;
}

function InfoButton({ label }: { label: string }) {
  return <button aria-label={label} className="grid h-8 w-8 place-items-center rounded-full border border-[#dbe0e5] text-sm font-black text-[#588368]" title={label} type="button">i</button>;
}

function SmallButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] hover:border-[#588368] hover:text-[#588368]" onClick={onClick} type="button">{label}</button>;
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="text-sm font-black text-[#374151]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function Select({ label, labels = {}, onChange, options, value }: { label: string; labels?: Record<string, string>; onChange: (value: string) => void; options: string[]; value: string }) {
  return <label className="text-sm font-black text-[#374151]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option || "empty"} value={option}>{labels[option] || cleanLabel(option)}</option>)}</select></label>;
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm font-black text-[#374151]"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function FormInfo({ text }: { text: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-[#f8faf9] px-4 py-3"><strong className="text-sm text-[#111827]">Details</strong><InfoButton label={text} /></div>;
}

function ModalActions({ onCancel, onSubmit, submit }: { onCancel: () => void; onSubmit: () => void; submit: string }) {
  return <div className="flex justify-end gap-3 pt-2"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">{submit}</button></div>;
}
