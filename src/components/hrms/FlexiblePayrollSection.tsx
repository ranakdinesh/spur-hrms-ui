"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiDownload, apiRequest, saveBlobDownload } from "@/lib/api";

type Worker = { id: string; display_name: string; worker_code?: string | null };
type Engagement = { id: string; worker_profile_id: string; title: string; engagement_code?: string | null; rate_unit?: string; rate_amount?: number | null };
type FlexPayRun = {
  id: string;
  run_code: string;
  title: string;
  run_type: string;
  status: string;
  period_start: string;
  period_end: string;
  payout_date?: string | null;
  currency_code: string;
  invoice_count: number;
  item_count: number;
  gross_amount: number;
  tds_amount: number;
  gst_amount: number;
  net_amount: number;
  payment_reference?: string | null;
  items?: FlexPayItem[];
  invoices?: ContractorInvoice[];
  events?: FlexEvent[];
};
type ContractorInvoice = {
  id: string;
  flex_pay_run_id?: string | null;
  worker_profile_id: string;
  engagement_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  status: string;
  vendor_name: string;
  vendor_gstin?: string | null;
  place_of_supply?: string | null;
  currency_code: string;
  gross_amount: number;
  tds_section?: string | null;
  tds_rate: number;
  tds_amount: number;
  gst_rate: number;
  gst_amount: number;
  net_amount: number;
  payment_reference?: string | null;
  worker_display_name?: string | null;
  worker_code?: string | null;
  engagement_title?: string | null;
};
type FlexPayItem = {
  id: string;
  contractor_invoice_id?: string | null;
  worker_display_name?: string | null;
  worker_code?: string | null;
  engagement_title?: string | null;
  invoice_number?: string | null;
  source_type: string;
  description: string;
  quantity: number;
  rate_amount: number;
  gross_amount: number;
  tds_section?: string | null;
  tds_rate: number;
  tds_amount: number;
  gst_rate: number;
  gst_amount: number;
  net_amount: number;
  status: string;
};
type FlexEvent = { id: string; event_type: string; from_status?: string | null; to_status?: string | null; comment?: string | null; created_at: string };

type ModalState = "" | "run" | "invoice" | "item" | "action";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};
const monthEnd = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
};

function money(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value || 0);
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "-";
}

function statusClass(status: string) {
  if (["approved", "paid"].includes(status)) return "bg-[#e7f6ed] text-[#237a45]";
  if (["rejected", "cancelled"].includes(status)) return "bg-[#fee2e2] text-[#b91c1c]";
  if (["submitted", "payment_pending"].includes(status)) return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#e0f2fe] text-[#0369a1]";
}

export function FlexiblePayrollSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [tenant, setTenant] = useState<BranchTenantOption | null>(null);
  const tenantRows = useMemo(() => tenants.filter((item) => item.kind !== "ops"), [tenants]);

  if (isSuperAdmin && !tenant) {
    return (
      <main className="space-y-6 p-6 lg:p-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Flexible Payroll</h1>
        </div>
        {tenantsError ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{tenantsError}</div> : null}
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

  return <FlexiblePayrollWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setTenant(null) : undefined} tenant={tenant} />;
}

function FlexiblePayrollWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const [runs, setRuns] = useState<FlexPayRun[]>([]);
  const [invoices, setInvoices] = useState<ContractorInvoice[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [selectedRunID, setSelectedRunID] = useState("");
  const [modal, setModal] = useState<ModalState>("");
  const [action, setAction] = useState<{ target: "run" | "invoice"; id: string; action: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [runForm, setRunForm] = useState({ run_code: `FLEX-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`, title: "Flexible worker payroll", run_type: "mixed", period_start: monthStart(), period_end: monthEnd(), payout_date: today(), currency_code: "INR" });
  const [invoiceForm, setInvoiceForm] = useState({ flex_pay_run_id: "", worker_profile_id: "", engagement_id: "", invoice_number: "", invoice_date: today(), vendor_name: "", vendor_gstin: "", place_of_supply: "", gross_amount: "", tds_section: "194J", tds_rate: "0", gst_rate: "0" });
  const [itemForm, setItemForm] = useState({ contractor_invoice_id: "", worker_profile_id: "", engagement_id: "", source_type: "manual_invoice", description: "", quantity: "1", rate_amount: "", tds_section: "194J", tds_rate: "0", gst_rate: "0" });
  const [actionForm, setActionForm] = useState({ comment: "", payment_reference: "", export_batch_ref: "", tds_section: "194J", tds_rate: "0", gst_rate: "0" });

  const selectedRun = useMemo(() => runs.find((item) => item.id === selectedRunID) || runs[0], [runs, selectedRunID]);
  const runItems = selectedRun?.items || [];
  const runInvoices = selectedRun?.invoices || [];

  const load = useCallback(async () => {
    const [runRows, invoiceRows, workerRows, engagementRows] = await Promise.all([
      apiRequest<FlexPayRun[]>(`${basePath}/flex-pay-runs`).catch(() => []),
      apiRequest<ContractorInvoice[]>(`${basePath}/contractor-invoices`).catch(() => []),
      apiRequest<Worker[]>(`${basePath}/worker-profiles`).catch(() => []),
      apiRequest<Engagement[]>(`${basePath}/engagements`).catch(() => []),
    ]);
    setRuns(runRows);
    setInvoices(invoiceRows);
    setWorkers(workerRows);
    setEngagements(engagementRows);
    setSelectedRunID((current) => current || runRows[0]?.id || "");
    setInvoiceForm((current) => ({ ...current, flex_pay_run_id: current.flex_pay_run_id || runRows[0]?.id || "", worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "", engagement_id: current.engagement_id || engagementRows[0]?.id || "" }));
    setItemForm((current) => ({ ...current, worker_profile_id: current.worker_profile_id || workerRows[0]?.id || "", engagement_id: current.engagement_id || engagementRows[0]?.id || "" }));
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Unable to load flexible payroll."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveRun() {
    setError(""); setNotice("");
    try {
      const result = await apiRequest<FlexPayRun>(`${basePath}/flex-pay-runs`, { method: "POST", body: runForm });
      setNotice("Flexible pay run created.");
      setSelectedRunID(result.id);
      setModal("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create flexible pay run.");
    }
  }

  async function saveInvoice() {
    setError(""); setNotice("");
    try {
      await apiRequest<ContractorInvoice>(`${basePath}/contractor-invoices`, {
        method: "POST",
        body: {
          ...invoiceForm,
          flex_pay_run_id: invoiceForm.flex_pay_run_id || null,
          engagement_id: invoiceForm.engagement_id || null,
          vendor_gstin: invoiceForm.vendor_gstin || null,
          place_of_supply: invoiceForm.place_of_supply || null,
          gross_amount: Number(invoiceForm.gross_amount || 0),
          tds_rate: Number(invoiceForm.tds_rate || 0),
          gst_rate: Number(invoiceForm.gst_rate || 0),
        },
      });
      setNotice("Contractor invoice saved.");
      setModal("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save contractor invoice.");
    }
  }

  async function saveItem() {
    if (!selectedRun) return;
    setError(""); setNotice("");
    try {
      await apiRequest<FlexPayItem>(`${basePath}/flex-pay-runs/${selectedRun.id}/items`, {
        method: "POST",
        body: {
          ...itemForm,
          contractor_invoice_id: itemForm.contractor_invoice_id || null,
          engagement_id: itemForm.engagement_id || null,
          quantity: Number(itemForm.quantity || 0),
          rate_amount: Number(itemForm.rate_amount || 0),
          tds_rate: Number(itemForm.tds_rate || 0),
          gst_rate: Number(itemForm.gst_rate || 0),
        },
      });
      setNotice("Manual payment item added.");
      setModal("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save payment item.");
    }
  }

  async function runAction(id: string, next: string) {
    setError(""); setNotice("");
    try {
      const body = next === "generate" ? { tds_section: actionForm.tds_section, tds_rate: Number(actionForm.tds_rate || 0), gst_rate: Number(actionForm.gst_rate || 0) } : { comment: actionForm.comment || null, payment_reference: actionForm.payment_reference || null, export_batch_ref: actionForm.export_batch_ref || null };
      await apiRequest(`${basePath}/flex-pay-runs/${id}/${endpoint(next)}`, { method: "POST", body });
      setNotice(`Pay run ${next.replaceAll("_", " ")} complete.`);
      setModal("");
      setAction(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update pay run.");
    }
  }

  async function invoiceAction(id: string, next: string) {
    setError(""); setNotice("");
    try {
      await apiRequest(`${basePath}/contractor-invoices/${id}/${endpoint(next)}`, { method: "POST", body: { comment: actionForm.comment || null, payment_reference: actionForm.payment_reference || null } });
      setNotice(`Invoice ${next.replaceAll("_", " ")} complete.`);
      setModal("");
      setAction(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update contractor invoice.");
    }
  }

  async function exportRun(id: string) {
    const { blob, filename } = await apiDownload(`${basePath}/flex-pay-runs/${id}/export`);
    saveBlobDownload(blob, filename);
  }

  const totals = runs.reduce((sum, item) => ({ gross: sum.gross + item.gross_amount, tds: sum.tds + item.tds_amount, gst: sum.gst + item.gst_amount, net: sum.net + item.net_amount }), { gross: 0, tds: 0, gst: 0, net: 0 });

  return (
    <main className="space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Payroll</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{tenant ? `${tenant.name} Flexible Payroll` : "Flexible Payroll"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack ? <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back</button> : null}
          <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={() => setModal("run")} type="button">New Run</button>
          <button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={() => setModal("invoice")} type="button">New Invoice</button>
        </div>
      </div>
      {error ? <div className="rounded-xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-bold text-[#166534]">{notice}</div> : null}
      <section className="grid gap-4 md:grid-cols-4"><Metric label="Runs" value={runs.length} /><Metric label="Gross" value={money(totals.gross)} /><Metric label="TDS" value={money(totals.tds)} /><Metric label="Net" value={money(totals.net)} /></section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel title="Pay Runs" info="Generation pulls approved work logs and accepted milestones that have not already been paid. Retainer, stipend, and adjustments can be added manually.">
          <div className="space-y-3">
            {runs.length === 0 ? <Empty text="No flexible pay runs yet." /> : runs.map((run) => (
              <button className={`w-full rounded-xl border p-4 text-left ${selectedRun?.id === run.id ? "border-[#588368] bg-[#f8faf9]" : "border-[#edf1ef] bg-white"}`} key={run.id} onClick={() => setSelectedRunID(run.id)} type="button">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm text-[#111827]">{run.run_code} · {run.title}</strong><p className="mt-1 text-xs font-bold text-[#6b7280]">{dateOnly(run.period_start)} to {dateOnly(run.period_end)} · {run.run_type}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(run.status)}`}>{run.status}</span></div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-xs font-bold text-[#6b7280]"><span>{run.invoice_count} invoices</span><span>{run.item_count} items</span><span>Gross {money(run.gross_amount)}</span><span>Net {money(run.net_amount)}</span></div>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Run Review" info="Approve only after invoices, source links, TDS section/rate, GST fields, and net payable are reviewed. Export is CSV for finance/payment handoff.">
          {selectedRun ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <ActionButton label="Generate" onClick={() => openAction("run", selectedRun.id, "generate", setAction, setModal)} />
                <ActionButton label="Submit" onClick={() => openAction("run", selectedRun.id, "submit", setAction, setModal)} />
                <ActionButton label="Approve" onClick={() => openAction("run", selectedRun.id, "approve", setAction, setModal)} />
                <ActionButton label="Reject" onClick={() => openAction("run", selectedRun.id, "reject", setAction, setModal)} />
                <ActionButton label="Payment Pending" onClick={() => openAction("run", selectedRun.id, "payment_pending", setAction, setModal)} />
                <ActionButton label="Paid" onClick={() => openAction("run", selectedRun.id, "paid", setAction, setModal)} />
                <ActionButton label="Export" onClick={() => void exportRun(selectedRun.id)} />
                <ActionButton label="Manual Item" onClick={() => setModal("item")} />
              </div>
              <div className="grid gap-3 md:grid-cols-4"><MiniMetric label="Gross" value={money(selectedRun.gross_amount)} /><MiniMetric label="TDS" value={money(selectedRun.tds_amount)} /><MiniMetric label="GST" value={money(selectedRun.gst_amount)} /><MiniMetric label="Net" value={money(selectedRun.net_amount)} /></div>
              <div className="overflow-x-auto rounded-xl border border-[#edf1ef]">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-[#f8faf9] text-xs font-black uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Source</th><th>Worker</th><th>Invoice</th><th>Gross</th><th>TDS</th><th>GST</th><th>Net</th><th>Status</th></tr></thead>
                  <tbody className="divide-y divide-[#edf1ef]">{runItems.length === 0 ? <tr><td className="px-4 py-5 text-sm font-semibold text-[#6b7280]" colSpan={8}>No payment items generated.</td></tr> : runItems.map((item) => <tr key={item.id}><td className="px-4 py-3"><strong>{item.source_type}</strong><p className="text-xs font-bold text-[#6b7280]">{item.description}</p></td><td>{item.worker_display_name || "-"}</td><td>{item.invoice_number || "-"}</td><td>{money(item.gross_amount)}</td><td>{item.tds_section || "-"} · {money(item.tds_amount)}</td><td>{money(item.gst_amount)}</td><td className="font-black">{money(item.net_amount)}</td><td><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{item.status}</span></td></tr>)}</tbody>
                </table>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">{runInvoices.map((invoice) => <InvoiceCard invoice={invoice} key={invoice.id} onAction={(next) => openAction("invoice", invoice.id, next, setAction, setModal)} />)}</div>
              <div className="rounded-xl bg-[#f8faf9] p-4">
                <strong className="text-sm text-[#111827]">Audit</strong>
                <div className="mt-3 space-y-2">{(selectedRun.events || []).slice(0, 6).map((event) => <div className="text-xs font-bold text-[#6b7280]" key={event.id}>{dateOnly(event.created_at)} · {event.event_type} · {event.from_status || "-"} → {event.to_status || "-"}{event.comment ? ` · ${event.comment}` : ""}</div>)}</div>
              </div>
            </div>
          ) : <Empty text="Select or create a pay run." />}
        </Panel>
      </section>
      <Panel title="Contractor Invoices" info="Invoices can be standalone or linked to a flexible pay run. TDS/GST values are captured for payroll and finance export.">
        <div className="grid gap-3 lg:grid-cols-3">{invoices.length === 0 ? <Empty text="No contractor invoices yet." /> : invoices.map((invoice) => <InvoiceCard invoice={invoice} key={invoice.id} onAction={(next) => openAction("invoice", invoice.id, next, setAction, setModal)} />)}</div>
      </Panel>
      <HrmsModal onClose={() => setModal("")} open={modal === "run"} title="New Flexible Pay Run">
        <div className="grid gap-4">
          <FormInfo text="Create a run for the period, then generate source-linked invoices from approved work logs and accepted milestones." />
          <div className="grid gap-3 md:grid-cols-2"><Field label="Run Code" value={runForm.run_code} onChange={(value) => setRunForm({ ...runForm, run_code: value })} /><Field label="Title" value={runForm.title} onChange={(value) => setRunForm({ ...runForm, title: value })} /></div>
          <div className="grid gap-3 md:grid-cols-4"><Select label="Type" value={runForm.run_type} onChange={(value) => setRunForm({ ...runForm, run_type: value })} options={["mixed", "hourly", "milestone", "retainer", "stipend", "invoice"]} /><Field label="Period Start" type="date" value={runForm.period_start} onChange={(value) => setRunForm({ ...runForm, period_start: value })} /><Field label="Period End" type="date" value={runForm.period_end} onChange={(value) => setRunForm({ ...runForm, period_end: value })} /><Field label="Payout Date" type="date" value={runForm.payout_date} onChange={(value) => setRunForm({ ...runForm, payout_date: value })} /></div>
          <Field label="Currency" value={runForm.currency_code} onChange={(value) => setRunForm({ ...runForm, currency_code: value.toUpperCase() })} />
          <ModalActions onCancel={() => setModal("")} onSubmit={() => void saveRun()} submit="Create Run" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={() => setModal("")} open={modal === "invoice"} title="Contractor Invoice">
        <div className="grid gap-4">
          <FormInfo text="Use invoices for retainer, stipend, or vendor-submitted bills; source-generated invoices are created from the Generate action." />
          <div className="grid gap-3 md:grid-cols-2"><Select label="Pay Run" value={invoiceForm.flex_pay_run_id} onChange={(value) => setInvoiceForm({ ...invoiceForm, flex_pay_run_id: value })} options={["", ...runs.map((item) => item.id)]} labels={{ "": "Standalone", ...Object.fromEntries(runs.map((item) => [item.id, `${item.run_code} · ${item.title}`])) }} /><Select label="Worker" value={invoiceForm.worker_profile_id} onChange={(value) => setInvoiceForm({ ...invoiceForm, worker_profile_id: value, vendor_name: workers.find((item) => item.id === value)?.display_name || invoiceForm.vendor_name })} options={workers.map((item) => item.id)} labels={Object.fromEntries(workers.map((item) => [item.id, `${item.display_name}${item.worker_code ? ` (${item.worker_code})` : ""}`]))} /></div>
          <div className="grid gap-3 md:grid-cols-2"><Select label="Engagement" value={invoiceForm.engagement_id} onChange={(value) => setInvoiceForm({ ...invoiceForm, engagement_id: value })} options={["", ...engagements.map((item) => item.id)]} labels={{ "": "None", ...Object.fromEntries(engagements.map((item) => [item.id, item.title])) }} /><Field label="Invoice Number" value={invoiceForm.invoice_number} onChange={(value) => setInvoiceForm({ ...invoiceForm, invoice_number: value })} /></div>
          <div className="grid gap-3 md:grid-cols-3"><Field label="Invoice Date" type="date" value={invoiceForm.invoice_date} onChange={(value) => setInvoiceForm({ ...invoiceForm, invoice_date: value })} /><Field label="Vendor Name" value={invoiceForm.vendor_name} onChange={(value) => setInvoiceForm({ ...invoiceForm, vendor_name: value })} /><Field label="Gross Amount" type="number" value={invoiceForm.gross_amount} onChange={(value) => setInvoiceForm({ ...invoiceForm, gross_amount: value })} /></div>
          <div className="grid gap-3 md:grid-cols-4"><Select label="TDS" value={invoiceForm.tds_section} onChange={(value) => setInvoiceForm({ ...invoiceForm, tds_section: value })} options={["194C", "194J", "none"]} /><Field label="TDS Rate %" type="number" value={invoiceForm.tds_rate} onChange={(value) => setInvoiceForm({ ...invoiceForm, tds_rate: value })} /><Field label="GST Rate %" type="number" value={invoiceForm.gst_rate} onChange={(value) => setInvoiceForm({ ...invoiceForm, gst_rate: value })} /><Field label="Place of Supply" value={invoiceForm.place_of_supply} onChange={(value) => setInvoiceForm({ ...invoiceForm, place_of_supply: value })} /></div>
          <Field label="Vendor GSTIN" value={invoiceForm.vendor_gstin} onChange={(value) => setInvoiceForm({ ...invoiceForm, vendor_gstin: value })} />
          <ModalActions onCancel={() => setModal("")} onSubmit={() => void saveInvoice()} submit="Save Invoice" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={() => setModal("")} open={modal === "item"} title="Manual Payment Item">
        <div className="grid gap-4">
          <FormInfo text="Manual items cover retainer, stipend, manual invoice, or adjustment payments that do not originate from work logs or milestones." />
          <div className="grid gap-3 md:grid-cols-2"><Select label="Invoice" value={itemForm.contractor_invoice_id} onChange={(value) => setItemForm({ ...itemForm, contractor_invoice_id: value })} options={["", ...runInvoices.map((item) => item.id)]} labels={{ "": "No invoice", ...Object.fromEntries(runInvoices.map((item) => [item.id, item.invoice_number])) }} /><Select label="Worker" value={itemForm.worker_profile_id} onChange={(value) => setItemForm({ ...itemForm, worker_profile_id: value })} options={workers.map((item) => item.id)} labels={Object.fromEntries(workers.map((item) => [item.id, item.display_name]))} /></div>
          <div className="grid gap-3 md:grid-cols-2"><Select label="Source Type" value={itemForm.source_type} onChange={(value) => setItemForm({ ...itemForm, source_type: value })} options={["manual_invoice", "retainer", "stipend", "adjustment"]} /><Select label="Engagement" value={itemForm.engagement_id} onChange={(value) => setItemForm({ ...itemForm, engagement_id: value })} options={["", ...engagements.map((item) => item.id)]} labels={{ "": "None", ...Object.fromEntries(engagements.map((item) => [item.id, item.title])) }} /></div>
          <Field label="Description" value={itemForm.description} onChange={(value) => setItemForm({ ...itemForm, description: value })} />
          <div className="grid gap-3 md:grid-cols-5"><Field label="Qty" type="number" value={itemForm.quantity} onChange={(value) => setItemForm({ ...itemForm, quantity: value })} /><Field label="Rate" type="number" value={itemForm.rate_amount} onChange={(value) => setItemForm({ ...itemForm, rate_amount: value })} /><Select label="TDS" value={itemForm.tds_section} onChange={(value) => setItemForm({ ...itemForm, tds_section: value })} options={["194C", "194J", "none"]} /><Field label="TDS %" type="number" value={itemForm.tds_rate} onChange={(value) => setItemForm({ ...itemForm, tds_rate: value })} /><Field label="GST %" type="number" value={itemForm.gst_rate} onChange={(value) => setItemForm({ ...itemForm, gst_rate: value })} /></div>
          <ModalActions onCancel={() => setModal("")} onSubmit={() => void saveItem()} submit="Add Item" />
        </div>
      </HrmsModal>
      <HrmsModal onClose={() => setModal("")} open={modal === "action"} title="Confirm Action">
        <div className="grid gap-4">
          {action?.action === "generate" ? <div className="grid gap-3 md:grid-cols-3"><Select label="Default TDS" value={actionForm.tds_section} onChange={(value) => setActionForm({ ...actionForm, tds_section: value })} options={["194C", "194J", "none"]} /><Field label="TDS Rate %" type="number" value={actionForm.tds_rate} onChange={(value) => setActionForm({ ...actionForm, tds_rate: value })} /><Field label="GST Rate %" type="number" value={actionForm.gst_rate} onChange={(value) => setActionForm({ ...actionForm, gst_rate: value })} /></div> : <><Field label="Comment" value={actionForm.comment} onChange={(value) => setActionForm({ ...actionForm, comment: value })} /><div className="grid gap-3 md:grid-cols-2"><Field label="Payment Reference" value={actionForm.payment_reference} onChange={(value) => setActionForm({ ...actionForm, payment_reference: value })} /><Field label="Export Batch Ref" value={actionForm.export_batch_ref} onChange={(value) => setActionForm({ ...actionForm, export_batch_ref: value })} /></div></>}
          <ModalActions onCancel={() => setModal("")} onSubmit={() => action ? action.target === "run" ? void runAction(action.id, action.action) : void invoiceAction(action.id, action.action) : undefined} submit="Confirm" />
        </div>
      </HrmsModal>
    </main>
  );
}

function endpoint(action: string) {
  return action === "payment_pending" ? "payment-pending" : action;
}

function openAction(target: "run" | "invoice", id: string, action: string, setAction: (value: { target: "run" | "invoice"; id: string; action: string }) => void, setModal: (value: ModalState) => void) {
  setAction({ target, id, action });
  setModal("action");
}

function Panel({ children, info, title }: { children: ReactNode; info?: string; title: string }) {
  return <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-[#111827]">{title}</h2>{info ? <InfoButton label={info} /> : null}</div>{children}</section>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><p className="mt-2 text-2xl font-black text-[#111827]">{value}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f8faf9] p-4"><p className="text-xs font-black uppercase text-[#6b7280]">{label}</p><p className="mt-1 text-lg font-black text-[#111827]">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">{text}</p>;
}

function InfoButton({ label }: { label: string }) {
  return <button aria-label={label} className="grid h-8 w-8 place-items-center rounded-full border border-[#dbe0e5] text-sm font-black text-[#588368]" title={label} type="button">i</button>;
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] hover:border-[#588368] hover:text-[#588368]" onClick={onClick} type="button">{label}</button>;
}

function InvoiceCard({ invoice, onAction }: { invoice: ContractorInvoice; onAction: (next: string) => void }) {
  return (
    <div className="rounded-xl border border-[#edf1ef] p-4">
      <div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-[#111827]">{invoice.invoice_number}</strong><p className="text-xs font-bold text-[#6b7280]">{invoice.worker_display_name || invoice.vendor_name} · {dateOnly(invoice.invoice_date)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(invoice.status)}`}>{invoice.status}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold text-[#6b7280]"><span>Gross {money(invoice.gross_amount)}</span><span>TDS {money(invoice.tds_amount)}</span><span>Net {money(invoice.net_amount)}</span></div>
      <div className="mt-4 flex flex-wrap gap-2"><ActionButton label="Submit" onClick={() => onAction("submit")} /><ActionButton label="Approve" onClick={() => onAction("approve")} /><ActionButton label="Reject" onClick={() => onAction("reject")} /><ActionButton label="Paid" onClick={() => onAction("paid")} /></div>
    </div>
  );
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="text-sm font-black text-[#374151]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function Select({ label, labels = {}, onChange, options, value }: { label: string; labels?: Record<string, string>; onChange: (value: string) => void; options: string[]; value: string }) {
  return <label className="text-sm font-black text-[#374151]">{label}<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option || "empty"} value={option}>{labels[option] || option.replaceAll("_", " ")}</option>)}</select></label>;
}

function FormInfo({ text }: { text: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-[#f8faf9] px-4 py-3"><strong className="text-sm text-[#111827]">Details</strong><InfoButton label={text} /></div>;
}

function ModalActions({ onCancel, onSubmit, submit }: { onCancel: () => void; onSubmit: () => void; submit: string }) {
  return <div className="flex justify-end gap-3 pt-2"><button className="rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]" onClick={onCancel} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white" onClick={onSubmit} type="button">{submit}</button></div>;
}
