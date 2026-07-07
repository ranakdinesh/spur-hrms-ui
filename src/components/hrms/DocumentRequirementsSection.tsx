"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type DocumentRequirement = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_required: boolean;
  instructions?: string | null;
  allowed_content_types?: string | null;
  max_file_size_bytes?: number | null;
  display_order?: number;
  inactive: boolean;
  created_at?: string;
  updated_at?: string;
};

type DocumentRequirementForm = {
  name: string;
  description: string;
  isRequired: boolean;
  instructions: string;
  allowedContentTypes: string;
  maxFileSizeMB: string;
  displayOrder: string;
};

const defaultAllowedContentTypes = "application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const emptyForm: DocumentRequirementForm = {
  name: "",
  description: "",
  isRequired: true,
  instructions: "",
  allowedContentTypes: defaultAllowedContentTypes,
  maxFileSizeMB: "10",
  displayOrder: "0",
};

const documentPresets: Array<DocumentRequirementForm & { country: string; category: string; note: string }> = [
  { country: "India", category: "Identity/KYC", name: "PAN Card", description: "Permanent Account Number proof for payroll, tax and KYC.", isRequired: true, instructions: "Upload a clear self-attested copy. Name should match payroll records.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "Commonly required for Indian payroll and statutory KYC." },
  { country: "India", category: "Identity/KYC", name: "Aadhaar Card or Aadhaar Acknowledgement", description: "Aadhaar proof or acknowledgement where applicable for Indian statutory KYC.", isRequired: true, instructions: "Mask Aadhaar if your policy requires it. Upload front and back in one PDF or image set.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Used by many employers for EPF/UAN KYC." },
  { country: "India", category: "Payroll", name: "Bank Account Proof / Cancelled Cheque", description: "Salary account proof with account number, IFSC and account holder name.", isRequired: true, instructions: "Upload cancelled cheque, passbook first page, or bank letter. Account holder name should match employee name.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "30", note: "Needed for salary credit and PF KYC." },
  { country: "India", category: "Statutory", name: "EPF Form 11 / UAN Declaration", description: "Employee Provident Fund declaration including previous PF/UAN details where applicable.", isRequired: true, instructions: "Upload signed Form 11 or completed declaration. Include previous PF/UAN details if you were previously employed.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "40", note: "Relevant for establishments covered by EPF." },
  { country: "India", category: "Statutory", name: "ESIC Declaration / Insurance Details", description: "ESIC declaration and family details where the employee is eligible.", isRequired: false, instructions: "Upload only if HR confirms ESIC applicability based on salary and location.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "50", note: "Conditional statutory requirement." },
  { country: "India", category: "Career", name: "Educational Certificates", description: "Degree, diploma and professional qualification certificates.", isRequired: false, instructions: "Upload highest qualification and role-relevant certificates.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "15", displayOrder: "60", note: "Often required for background verification." },
  { country: "India", category: "Career", name: "Experience / Relieving Letters", description: "Previous employment proof such as relieving letter, experience certificate or service letter.", isRequired: false, instructions: "Upload documents from recent employers. Combine multiple documents into one PDF if possible.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "15", displayOrder: "70", note: "Useful for joining validation and background checks." },
  { country: "India", category: "Tax", name: "Investment / Tax Declaration", description: "Employee declaration for tax deductions and payroll planning.", isRequired: false, instructions: "Upload only if your payroll team requests declaration documents at joining.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "80", note: "Can also be collected later in payroll cycle." },
  { country: "Global", category: "Core", name: "Signed Offer Letter / Employment Contract", description: "Accepted offer letter, appointment letter or employment agreement.", isRequired: true, instructions: "Upload the signed copy with all pages included.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "15", displayOrder: "5", note: "Common across countries as employment record." },
  { country: "Global", category: "Core", name: "Government ID / Passport", description: "Official identity proof for employee record and right-to-work checks.", isRequired: true, instructions: "Upload passport or government-issued ID as applicable in your country.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "15", note: "Use country-specific right-to-work rules." },
  { country: "Global", category: "Core", name: "Address Proof", description: "Residential address proof for employee master, compliance and emergency records.", isRequired: false, instructions: "Upload utility bill, bank statement, rental agreement, passport address page, or accepted local proof.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "25", note: "Often needed for HR records." },
  { country: "Global", category: "Core", name: "Passport Size Photo", description: "Employee photograph for ID card, HR records and access systems.", isRequired: false, instructions: "Upload a recent photo with plain background.", allowedContentTypes: "image/jpeg,image/png,image/webp", maxFileSizeMB: "5", displayOrder: "35", note: "Operational requirement, not always statutory." },
  { country: "Global", category: "Core", name: "Emergency Contact Form", description: "Emergency contact and medical alert information.", isRequired: true, instructions: "Upload completed emergency contact form or enter the details in the employee profile.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "45", note: "Common HR safety record." },
  { country: "Global", category: "Policy", name: "Employee Handbook Acknowledgement", description: "Acknowledgement that the employee received and accepted company policies.", isRequired: false, instructions: "Upload signed acknowledgement after reading company handbook and key policies.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "90", note: "Useful for policy compliance." },
  { country: "Global", category: "Policy", name: "NDA / Confidentiality Agreement", description: "Signed confidentiality, IP assignment or non-disclosure agreement.", isRequired: false, instructions: "Upload signed agreement if your role or department requires it.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "95", note: "Role and industry dependent." },
  { country: "Global", category: "Compliance", name: "Background Verification Consent", description: "Consent form for employment verification, education verification and reference checks.", isRequired: false, instructions: "Upload signed consent if background verification is part of onboarding.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "100", note: "Collect only where lawful and necessary." },
  { country: "Global", category: "Compliance", name: "Work Permit / Visa", description: "Work authorization proof for foreign nationals or expatriates.", isRequired: false, instructions: "Upload current work visa, work permit, residence permit or immigration approval if applicable.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "15", displayOrder: "110", note: "Required when employee is not a local citizen/resident." },
  { country: "United States", category: "Tax/Eligibility", name: "Form I-9 Employment Eligibility Verification", description: "US employment eligibility verification record.", isRequired: true, instructions: "Upload completed Form I-9 or supporting workflow output according to company policy.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "US employer compliance document." },
  { country: "United States", category: "Tax/Eligibility", name: "Form W-4 Federal Tax Withholding", description: "US federal tax withholding form.", isRequired: true, instructions: "Upload completed W-4 or complete it through payroll workflow if integrated.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Required for US payroll withholding." },
  { country: "United States", category: "Payroll", name: "State Tax Withholding Form", description: "State-specific tax withholding form where applicable.", isRequired: false, instructions: "Upload the correct state tax form if your work location or residence requires it.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "30", note: "State dependent." },
  { country: "United Kingdom", category: "Right to Work", name: "Right to Work Evidence", description: "UK right-to-work share code or acceptable proof.", isRequired: true, instructions: "Upload right-to-work evidence or share code confirmation according to HR instructions.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "UK employment eligibility check." },
  { country: "United Kingdom", category: "Payroll", name: "P45 or HMRC Starter Checklist", description: "Payroll starter information used for PAYE tax code setup.", isRequired: true, instructions: "Upload P45 if available, otherwise upload completed HMRC starter checklist.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Used for payroll/tax setup." },
  { country: "United Kingdom", category: "Payroll", name: "National Insurance Number", description: "National Insurance number proof or declaration.", isRequired: false, instructions: "Upload NI proof if requested by payroll.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "30", note: "Common payroll identifier." },
  { country: "Australia", category: "Payroll", name: "Tax File Number Declaration", description: "Australian TFN declaration for tax withholding.", isRequired: true, instructions: "Upload completed TFN declaration or complete through payroll workflow if integrated.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "Australian payroll setup." },
  { country: "Australia", category: "Payroll", name: "Superannuation Standard Choice Form", description: "Employee choice of superannuation fund.", isRequired: true, instructions: "Upload completed super choice form or fund details.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Used for super contributions." },
  { country: "Australia", category: "Right to Work", name: "Right to Work / Visa Evidence", description: "Australian work rights or visa proof where applicable.", isRequired: false, instructions: "Upload visa/work rights evidence if you are not an Australian citizen or permanent resident.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "30", note: "Conditional employment eligibility check." },
  { country: "Canada", category: "Payroll", name: "Social Insurance Number Proof", description: "SIN confirmation for Canadian payroll and tax reporting.", isRequired: true, instructions: "Upload SIN confirmation according to privacy policy, or enter SIN in the secure payroll field.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "Sensitive identifier; collect only with strict controls." },
  { country: "Canada", category: "Payroll", name: "Federal and Provincial TD1 Forms", description: "Canadian personal tax credit forms for payroll withholding.", isRequired: true, instructions: "Upload completed federal TD1 and applicable provincial/territorial TD1.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Required for payroll withholding calculations." },
  { country: "Singapore", category: "Identity/Work Pass", name: "NRIC / FIN / Passport Copy", description: "Identity or foreign identification document for Singapore employee records.", isRequired: true, instructions: "Upload NRIC/FIN/passport copy as applicable. Mask fields if your policy requires it.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "Used for employee identity and payroll records." },
  { country: "Singapore", category: "Identity/Work Pass", name: "Employment Pass / S Pass / Work Permit", description: "Singapore work pass proof for foreign employees.", isRequired: false, instructions: "Upload valid work pass or approval letter if applicable.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Conditional for non-citizen/resident employees." },
  { country: "UAE", category: "Immigration", name: "Passport Copy", description: "Passport copy for UAE employment and visa processing.", isRequired: true, instructions: "Upload passport bio page and relevant visa pages if available.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "Common UAE onboarding requirement." },
  { country: "UAE", category: "Immigration", name: "Emirates ID / Application", description: "Emirates ID copy or application record.", isRequired: true, instructions: "Upload Emirates ID copy or application receipt as instructed by HR/PRO.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Used for UAE employment records." },
  { country: "UAE", category: "Immigration", name: "Visa Medical Test Result", description: "Medical test result for visa/employment processing where applicable.", isRequired: false, instructions: "Upload medical test result when requested by HR/PRO.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "30", note: "Often part of UAE employment visa process." },
  { country: "Germany", category: "Payroll", name: "Tax Identification Number", description: "German Steuer-ID proof or declaration for payroll tax setup.", isRequired: true, instructions: "Upload tax ID letter or enter the number through secure payroll fields.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "10", note: "Needed for German payroll registration." },
  { country: "Germany", category: "Payroll", name: "Social Security Number", description: "German Sozialversicherungsnummer proof or declaration.", isRequired: true, instructions: "Upload social security number proof if available.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "20", note: "Needed for social security reporting." },
  { country: "Germany", category: "Payroll", name: "Health Insurance Certificate", description: "Health insurance provider certificate/details.", isRequired: true, instructions: "Upload proof of statutory or private health insurance.", allowedContentTypes: defaultAllowedContentTypes, maxFileSizeMB: "10", displayOrder: "30", note: "Common payroll and social insurance requirement." },
];

const presetCountries = ["All", ...Array.from(new Set(documentPresets.map((preset) => preset.country))).sort((a, b) => a.localeCompare(b))];

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name} ${tenant.code}`.toLowerCase();
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function mbFromBytes(value?: number | null) {
  if (!value || value <= 0) return "10";
  return String(Math.max(1, Math.round(value / 1024 / 1024)));
}

function bytesFromMB(value: string) {
  const mb = Number.parseInt(value || "10", 10);
  return Math.max(1, Number.isFinite(mb) ? mb : 10) * 1024 * 1024;
}

function requirementToForm(item: DocumentRequirement): DocumentRequirementForm {
  return {
    name: item.name || "",
    description: item.description || "",
    isRequired: item.is_required,
    instructions: item.instructions || "",
    allowedContentTypes: item.allowed_content_types || defaultAllowedContentTypes,
    maxFileSizeMB: mbFromBytes(item.max_file_size_bytes),
    displayOrder: String(item.display_order || 0),
  };
}

function payload(form: DocumentRequirementForm) {
  return {
    name: form.name.trim(),
    description: optionalString(form.description),
    is_required: form.isRequired,
    instructions: optionalString(form.instructions),
    allowed_content_types: form.allowedContentTypes.trim() || defaultAllowedContentTypes,
    max_file_size_bytes: bytesFromMB(form.maxFileSizeMB),
    display_order: Number.parseInt(form.displayOrder || "0", 10) || 0,
  };
}

function formatBytes(value?: number | null) {
  if (!value) return "10 MB";
  return `${Math.round(value / 1024 / 1024)} MB`;
}

function mimeSummary(value?: string | null) {
  const parts = (value || defaultAllowedContentTypes).split(",").map((item) => item.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2}`;
}

export function DocumentRequirementsSection({ isSuperAdmin, tenants, tenantsLoading, tenantsError }: { isSuperAdmin: boolean; tenants: BranchTenantOption[]; tenantsLoading: boolean; tenantsError: string }) {
  const [selectedTenant, setSelectedTenant] = useState<BranchTenantOption | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    return tenants
      .filter((tenant) => !query || [tenant.name, tenant.code, tenant.kind, tenant.status, tenant.plan].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b)));
  }, [tenantSearch, tenants]);

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Document Requirements</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to configure which onboarding documents employees must upload.</p>
          </div>
          <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setTenantSearch(event.target.value)} placeholder="Search tenants" value={tenantSearch} />
        </div>
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5"><h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2><p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : null}
                {!tenantsLoading && filteredTenants.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>No tenants match your search.</td></tr> : null}
                {!tenantsLoading && filteredTenants.map((tenant) => <tr className="hover:bg-[#f8faf9]" key={tenant.id}><td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td><td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td><td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td><td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Documents</button></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <DocumentRequirementsWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function DocumentRequirementsWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [items, setItems] = useState<DocumentRequirement[]>([]);
  const [form, setForm] = useState<DocumentRequirementForm>(emptyForm);
  const [editing, setEditing] = useState<DocumentRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [requiredFilter, setRequiredFilter] = useState("all");
  const [presetCountry, setPresetCountry] = useState("India");
  const [formOpen, setFormOpen] = useState(false);
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}/document-types` : "/hrms/document-types";
  const title = tenant ? `${tenant.name} Document Requirements` : "Document Requirements";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<DocumentRequirement[]>(basePath);
      setItems([...result].sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load document requirements.");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !query || [item.name, item.description || "", item.instructions || "", item.allowed_content_types || ""].some((value) => value.toLowerCase().includes(query));
      const matchesRequired = requiredFilter === "all" || (requiredFilter === "required" ? item.is_required : !item.is_required);
      return matchesQuery && matchesRequired;
    });
  }, [items, requiredFilter, search]);

  const stats = useMemo(() => ({ total: items.length, required: items.filter((item) => item.is_required).length, optional: items.filter((item) => !item.is_required).length, customLimits: items.filter((item) => Boolean(item.allowed_content_types) || Boolean(item.max_file_size_bytes)).length }), [items]);
  const presetItems = useMemo(() => documentPresets.filter((preset) => presetCountry === "All" || preset.country === presetCountry), [presetCountry]);
  const existingNames = useMemo(() => new Set(items.map((item) => item.name.trim().toLowerCase())), [items]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(item: DocumentRequirement) {
    setEditing(item);
    setForm(requirementToForm(item));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    resetForm();
  }

  async function saveRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const body = payload(form);
    if (!body.name) {
      setSaving(false);
      setError("Document name is required.");
      return;
    }
    try {
      if (editing) {
        await apiRequest<DocumentRequirement>(`${basePath}/${editing.id}`, { method: "PUT", body });
        setMessage("Document requirement updated.");
      } else {
        await apiRequest<DocumentRequirement>(basePath, { method: "POST", body });
        setMessage("Document requirement created.");
      }
      closeForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save document requirement.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequirement(item: DocumentRequirement) {
    if (!window.confirm(`Deactivate ${item.name}? Existing uploaded documents remain on employee records.`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<void>(`${basePath}/${item.id}`, { method: "DELETE" });
      setMessage("Document requirement deactivated.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate document requirement.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRequired(item: DocumentRequirement) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<DocumentRequirement>(`${basePath}/${item.id}`, { method: "PUT", body: { ...payload(requirementToForm(item)), is_required: !item.is_required } });
      setMessage(`${item.name} marked ${item.is_required ? "optional" : "required"}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update required flag.");
    } finally {
      setSaving(false);
    }
  }

  async function addPreset(preset: DocumentRequirementForm & { country: string; category: string; note: string }) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest<DocumentRequirement>(basePath, { method: "POST", body: payload(preset) });
      setMessage(`${preset.name} added to tenant requirements.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add preset document.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Settings / Onboarding</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Choose the documents employees must upload during onboarding. Required documents drive onboarding completeness and employee self-service upload checklist.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {onBack ? <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={onBack} type="button">Back to tenants</button> : null}
          <button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={() => void loadData()} type="button">Refresh</button>
          <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button">Add Document</button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Total documents" value={String(stats.total)} />
        <StatCard label="Required" value={String(stats.required)} />
        <StatCard label="Optional" value={String(stats.optional)} />
        <StatCard label="Upload rules" value={String(stats.customLimits)} />
      </div>

      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="mb-6 rounded-2xl border border-[#dfe6e2] bg-[#fbf7ee] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b45309]">Research-backed presets</p>
            <h2 className="mt-2 text-xl font-black text-[#111827]">Add common onboarding documents</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#6b7280]">Use these as a starting point only. Tenants should enable documents that are legally required or operationally necessary for their country, industry and employee category.</p>
          </div>
          <select className="h-11 rounded-xl border border-[#d7cbb6] bg-white px-4 text-sm font-black text-[#374151] outline-none focus:border-[#b45309]" onChange={(event) => setPresetCountry(event.target.value)} value={presetCountry}>
            {presetCountries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {presetItems.map((preset) => {
            const alreadyAdded = existingNames.has(preset.name.trim().toLowerCase());
            return (
              <article className="rounded-2xl border border-[#eadfcc] bg-white p-4" key={`${preset.country}-${preset.name}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#b45309]">{preset.country} · {preset.category}</span>
                    <h3 className="mt-3 text-sm font-black text-[#111827]">{preset.name}</h3>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#6b7280]">{preset.note}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${preset.isRequired ? "bg-[#fff4e6] text-[#b45309]" : "bg-[#eef4f1] text-[#588368]"}`}>{preset.isRequired ? "Required" : "Optional"}</span>
                </div>
                <button className="mt-4 w-full rounded-xl bg-[#588368] px-4 py-2.5 text-xs font-black text-white disabled:bg-[#cbd5d1]" disabled={saving || alreadyAdded} onClick={() => void addPreset(preset)} type="button">{alreadyAdded ? "Already Added" : "Add to Requirements"}</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#111827]">Onboarding Document Checklist</h2>
            <p className="mt-1 text-sm font-semibold text-[#6b7280]">Keep this list short and strict. Only collect documents that are necessary for employment, payroll, compliance, or access control.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[280px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" value={search} />
            <select className="h-11 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-bold outline-none focus:border-[#588368]" onChange={(event) => setRequiredFilter(event.target.value)} value={requiredFilter}>
              <option value="all">All documents</option>
              <option value="required">Required only</option>
              <option value="optional">Optional only</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]"><tr><th className="px-5 py-4">Document</th><th className="px-5 py-4">Requirement</th><th className="px-5 py-4">Upload Rules</th><th className="px-5 py-4">Employee Instructions</th><th className="px-5 py-4">Order</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>Loading document requirements...</td></tr> : null}
              {!loading && filteredItems.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>No document requirements found.</td></tr> : null}
              {!loading && filteredItems.map((item) => (
                <tr className="hover:bg-[#f8faf9]" key={item.id}>
                  <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{item.name}</strong><span className="mt-1 block max-w-[320px] text-xs font-semibold leading-5 text-[#6b7280]">{item.description || "No description"}</span></td>
                  <td className="px-5 py-5"><button className={`rounded-full px-3 py-1 text-xs font-black ${item.is_required ? "bg-[#fff4e6] text-[#b45309]" : "bg-[#eef4f1] text-[#588368]"}`} disabled={saving} onClick={() => void toggleRequired(item)} type="button">{item.is_required ? "Required" : "Optional"}</button></td>
                  <td className="px-5 py-5"><span className="block text-sm font-bold text-[#374151]">Max {formatBytes(item.max_file_size_bytes)}</span><span className="mt-1 block max-w-[260px] text-xs font-semibold text-[#6b7280]">{mimeSummary(item.allowed_content_types)}</span></td>
                  <td className="px-5 py-5"><span className="block max-w-[300px] text-sm font-semibold leading-6 text-[#4b5563]">{item.instructions || "No employee-facing instructions"}</span></td>
                  <td className="px-5 py-5 text-sm font-black text-[#374151]">{item.display_order || 0}</td>
                  <td className="px-5 py-5"><div className="flex justify-end gap-2"><button className="rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-xs font-black text-[#374151] hover:border-[#588368] hover:text-[#588368]" onClick={() => openEditForm(item)} type="button">Edit</button><button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-60" disabled={saving} onClick={() => void deleteRequirement(item)} type="button">Deactivate</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <HrmsModal description="This controls the employee onboarding checklist and upload validation rules." onClose={closeForm} open={formOpen} title={editing ? "Edit Document Requirement" : "Add Document Requirement"}>
        <form className="space-y-5" onSubmit={saveRequirement}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-[#374151]">Document name<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="PAN Card, Passport, Signed Offer Letter" value={form.name} /></label>
            <label className="block text-sm font-bold text-[#374151]">Display order<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min="0" onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} type="number" value={form.displayOrder} /></label>
          </div>
          <label className="block text-sm font-bold text-[#374151]">Description<textarea className="mt-2 min-h-[80px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Why this document is collected" value={form.description} /></label>
          <label className="flex items-start gap-3 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4 text-sm font-bold text-[#374151]"><input checked={form.isRequired} className="mt-1" onChange={(event) => setForm((current) => ({ ...current, isRequired: event.target.checked }))} type="checkbox" /><span><span className="block text-[#111827]">Required for onboarding completion</span><span className="mt-1 block text-xs font-semibold leading-5 text-[#6b7280]">If enabled, employees remain incomplete until this document is uploaded and approved.</span></span></label>
          <label className="block text-sm font-bold text-[#374151]">Employee instructions<textarea className="mt-2 min-h-[90px] w-full rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Example: Upload front and back in one PDF. Name must match payroll records." value={form.instructions} /></label>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <label className="block text-sm font-bold text-[#374151]">Allowed content types<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setForm((current) => ({ ...current, allowedContentTypes: event.target.value }))} value={form.allowedContentTypes} /></label>
            <label className="block text-sm font-bold text-[#374151]">Max file size MB<input className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" min="1" onChange={(event) => setForm((current) => ({ ...current, maxFileSizeMB: event.target.value }))} type="number" value={form.maxFileSizeMB} /></label>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button className="rounded-xl border border-[#dbe0e5] bg-white px-5 py-3 text-sm font-black text-[#374151]" onClick={closeForm} type="button">Cancel</button><button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Save Changes" : "Create Requirement"}</button></div>
        </form>
      </HrmsModal>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p><strong className="mt-3 block text-3xl text-[#111827]">{value}</strong></article>;
}
