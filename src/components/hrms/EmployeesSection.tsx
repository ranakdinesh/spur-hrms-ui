"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { HrmsModal } from "@/components/hrms/HrmsModal";
import { apiRequest } from "@/lib/api";

type SetupOption = { id: string; name?: string; branch_name?: string; description?: string | null; is_required?: boolean; instructions?: string | null; allowed_content_types?: string; max_file_size_bytes?: number; display_order?: number };
type ViewMode = "list" | "grid";
type TenantSortKey = "name" | "status" | "plan" | "joined";
type EmployeeEditTab = "identity" | "job" | "personal" | "payroll" | "statutory" | "documents" | "roles";

type IdentityRole = {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  name: string;
  code?: string | null;
  description?: string | null;
  is_system?: boolean;
};

type EmployeeRow = {
  id: string;
  tenant_id?: string;
  user_id: string;
  employee_code?: string | null;
  firstname: string;
  middle_name?: string | null;
  lastname?: string | null;
  email?: string | null;
  mobile?: string | null;
  dob?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  blood_group?: string | null;
  profile_photo_path?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  emergency_contact?: string | null;
  role?: string | null;
  joining_date?: string | null;
  resignation_date?: string | null;
  grade?: string | null;
  experience_year?: number;
  experience_month?: number;
  probation_status?: string;
  probation_start_date?: string | null;
  probation_end_date?: string | null;
  probation_duration_days?: number;
  probation_confirmed_at?: string | null;
  is_payroll_staff?: boolean;
  department_id?: string | null;
  branch_id?: string | null;
  designation_id?: string | null;
  employment_type_id?: string | null;
  reporting_manager_id?: string | null;
  department_name?: string | null;
  branch_name?: string | null;
  designation_name?: string | null;
  employment_type_name?: string | null;
  inactive: boolean;
  created_at: string;
};

type EmployeeStatutory = {
  pf_no?: string | null;
  uan_no?: string | null;
  esic_no?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  pt_applicable: boolean;
  pf_applicable: boolean;
  esic_applicable: boolean;
  lwf_applicable: boolean;
};

type EmployeeBank = {
  id: string;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  account_type?: string | null;
  branch_name?: string | null;
  is_primary: boolean;
};

type EmployeeDocument = {
  id: string;
  document_type_name?: string | null;
  document_type_id?: string | null;
  title?: string | null;
  file_path?: string | null;
  status?: string;
  review_remarks?: string | null;
  original_file_name?: string | null;
  content_type?: string | null;
  file_size_bytes?: number | null;
  encrypted?: boolean;
  encryption_algorithm?: string | null;
  created_at: string;
};

type EmployeeCredentialEvent = {
  id: string;
  event_type: "resend_credentials" | "reset_temporary_password";
  delivery_channel: string;
  delivery_target: string;
  status: "sent" | "failed";
  failure_reason?: string | null;
  created_at: string;
  created_by?: string | null;
};

type EmployeeProfile = {
  employee: EmployeeRow;
  statutory?: EmployeeStatutory | null;
  banks: EmployeeBank[];
  documents: EmployeeDocument[];
  onboarding: {
    status: string;
    is_complete: boolean;
    required_documents: number;
    uploaded_required_documents: number;
    approved_required_documents: number;
    pending_review_documents: number;
    rejected_documents: number;
    missing_required_documents: string[];
  };
  lookups: {
    branches: SetupOption[];
    departments: SetupOption[];
    designations: SetupOption[];
    employment_types: SetupOption[];
    document_types: SetupOption[];
  };
};

type EmployeeForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  employeeCode: string;
  role: string;
  joiningDate: string;
  branchID: string;
  departmentID: string;
  designationID: string;
  reportingManagerID: string;
  employmentTypeID: string;
  grade: string;
  experienceYear: string;
  experienceMonth: string;
  gender: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  emergencyContact: string;
  probationStatus: string;
  probationStartDate: string;
  probationEndDate: string;
  probationDurationDays: string;
  probationConfirmedAt: string;
  isPayrollStaff: boolean;
  pfApplicable: boolean;
  esicApplicable: boolean;
  ptApplicable: boolean;
  lwfApplicable: boolean;
};

type EmployeeFormErrorKey = keyof EmployeeForm | "documents";
type EmployeeFormErrors = Partial<Record<EmployeeFormErrorKey, string>>;

type EmployeeEditForm = EmployeeForm & {
  resignationDate: string;
  maritalStatus: string;
  bloodGroup: string;
  profilePhotoPath: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  bankBranchName: string;
  pfNo: string;
  uanNo: string;
  esicNo: string;
  pan: string;
  aadhaar: string;
  ptApplicable: boolean;
  pfApplicable: boolean;
  esicApplicable: boolean;
};

type EmployeeDocumentForm = {
  documentTypeID: string;
  title: string;
  filePath: string;
  fileName: string;
  fileContentType: string;
  fileContentBase64: string;
};

const emptyForm: EmployeeForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  mobile: "",
  password: "",
  employeeCode: "",
  role: "employee",
  joiningDate: "",
  branchID: "",
  departmentID: "",
  designationID: "",
  reportingManagerID: "",
  employmentTypeID: "",
  grade: "",
  experienceYear: "0",
  experienceMonth: "0",
  gender: "",
  dob: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  emergencyContact: "",
  probationStatus: "probation",
  probationStartDate: "",
  probationEndDate: "",
  probationDurationDays: "180",
  probationConfirmedAt: "",
  isPayrollStaff: true,
  pfApplicable: false,
  esicApplicable: false,
  ptApplicable: false,
  lwfApplicable: false,
};

const emptyDocumentForm: EmployeeDocumentForm = {
  documentTypeID: "",
  title: "",
  filePath: "",
  fileName: "",
  fileContentType: "",
  fileContentBase64: "",
};

type OnboardingDocumentUpload = {
  documentTypeID: string;
  title: string;
  fileName: string;
  fileContentType: string;
  fileContentBase64: string;
};

const onboardingSteps = ["Identity", "Personal", "Employment", "Documents", "Review"];
const employeeEditTabs: { id: EmployeeEditTab; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "job", label: "Job" },
  { id: "personal", label: "Personal" },
  { id: "payroll", label: "Payroll" },
  { id: "statutory", label: "Statutory" },
  { id: "documents", label: "Documents" },
  { id: "roles", label: "Roles & Access" },
];
const genderOptions = ["Female", "Male", "Non-binary", "Prefer not to say"];
const gradeOptions = ["Trainee", "Junior", "Associate", "Senior", "Lead", "Manager", "Director"];
const platformRoleCodes = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_SUPPORT", "BILLING_OPS", "ACCESS_ADMIN", "READ_ONLY_AUDITOR", "IMPLEMENTATION_SPECIALIST", "PRODUCT_MANAGER"]);
const nonEmployeeTenantRoleCodes = new Set(["APPLICANT"]);
const probationStatuses = [
  { id: "not_applicable", name: "Not applicable" },
  { id: "probation", name: "Probation" },
  { id: "confirmed", name: "Confirmed" },
  { id: "extended", name: "Extended" },
];
const documentStatusLabels: Record<string, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  resubmission_requested: "Resubmission Requested",
};
const onboardingStatusLabels: Record<string, string> = {
  not_configured: "Checklist Not Ready",
  not_started: "Not Started",
  documents_pending: "Documents Pending",
  review_pending: "Review Pending",
  rework_required: "Rework Required",
  complete: "Complete",
};

function tenantSortValue(tenant: BranchTenantOption, key: TenantSortKey) {
  if (key === "name") return tenant.name;
  if (key === "status") return tenant.status;
  if (key === "plan") return tenant.plan;
  return tenant.joined;
}

function optionLabel(item: SetupOption) {
  return item.name || item.branch_name || item.id;
}

function normalizeRoleCode(value?: string | null) {
  return (value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function roleCode(role: IdentityRole) {
  return normalizeRoleCode(role.code || role.name);
}

function roleName(role: IdentityRole) {
  return role.name || role.code || role.id;
}

function roleTenantID(role: IdentityRole) {
  return role.tenant_id || role.tenantId || "";
}

function isEmployeeAssignableTenantRole(role: IdentityRole, employeeTenantID?: string) {
  const code = roleCode(role);
  if (platformRoleCodes.has(code) || nonEmployeeTenantRoleCodes.has(code)) return false;
  const tenantID = roleTenantID(role);
  return !employeeTenantID || !tenantID || tenantID === employeeTenantID;
}

function managerOptions(employees: EmployeeRow[], excludedEmployeeID?: string): SetupOption[] {
  return employees
    .filter((employee) => !employee.inactive && employee.id !== excludedEmployeeID)
    .map((employee) => ({
      id: employee.user_id,
      name: `${fullName(employee)}${employee.employee_code ? ` (${employee.employee_code})` : ""}`,
    }));
}

function approvedDocumentTypeIDs(documents: EmployeeDocument[]) {
  return new Set(documents.filter((document) => document.status === "approved" && document.document_type_id).map((document) => document.document_type_id as string));
}

function fullName(employee: EmployeeRow) {
  return [employee.firstname, employee.middle_name, employee.lastname].filter(Boolean).join(" ");
}

function initials(employee: EmployeeRow) {
  const first = employee.firstname?.[0] || "E";
  const last = employee.lastname?.[0] || "";
  return `${first}${last}`.toUpperCase();
}

function displayDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function displayDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function dateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isThisMonth(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function optionalString(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function mobileLooksValid(value: string) {
  return /^[0-9+\-\s()]{7,20}$/.test(value.trim());
}

function dateValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateEmployeeCreateStep(step: number, form: EmployeeForm, documentTypes: SetupOption[], onboardingDocuments: Record<string, OnboardingDocumentUpload>): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};
  if (step === 0) {
    if (!form.firstName.trim()) errors.firstName = "First name is required.";
    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!emailLooksValid(form.email)) errors.email = "Enter a valid email address.";
    if (!form.mobile.trim()) errors.mobile = "Mobile number is required.";
    else if (!mobileLooksValid(form.mobile)) errors.mobile = "Enter a valid mobile number.";
    if (!form.password) errors.password = "Temporary password is required.";
    else if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  }
  if (step === 1) {
    if (form.dob && !dateValue(form.dob)) errors.dob = "Enter a valid date of birth.";
    if (form.pincode && !/^[0-9A-Za-z -]{3,12}$/.test(form.pincode.trim())) errors.pincode = "Enter a valid pincode.";
    if (form.emergencyContact && !mobileLooksValid(form.emergencyContact)) errors.emergencyContact = "Enter a valid emergency contact.";
  }
  if (step === 2) {
    if (!form.branchID) errors.branchID = "Branch is required.";
    if (!form.departmentID) errors.departmentID = "Department is required.";
    if (!form.designationID) errors.designationID = "Designation is required.";
    if (!form.employmentTypeID) errors.employmentTypeID = "Employment type is required.";
    if (!form.joiningDate) errors.joiningDate = "Joining date is required.";
    else if (!dateValue(form.joiningDate)) errors.joiningDate = "Enter a valid joining date.";
    const years = Number.parseInt(form.experienceYear || "0", 10);
    const months = Number.parseInt(form.experienceMonth || "0", 10);
    if (Number.isNaN(years) || years < 0) errors.experienceYear = "Years cannot be negative.";
    if (Number.isNaN(months) || months < 0 || months > 11) errors.experienceMonth = "Months must be between 0 and 11.";
    const durationDays = Number.parseInt(form.probationDurationDays || "0", 10);
    if (form.isPayrollStaff && form.probationStatus === "probation" && durationDays < 180) errors.probationDurationDays = "Payroll staff probation must be at least 180 days.";
    if (form.probationStartDate && !dateValue(form.probationStartDate)) errors.probationStartDate = "Enter a valid start date.";
    if (form.probationEndDate && !dateValue(form.probationEndDate)) errors.probationEndDate = "Enter a valid end date.";
    if (form.probationConfirmedAt && !dateValue(form.probationConfirmedAt)) errors.probationConfirmedAt = "Enter a valid confirmed date.";
    const start = dateValue(form.probationStartDate);
    const end = dateValue(form.probationEndDate);
    if (start && end && end < start) errors.probationEndDate = "End date must be after start date.";
  }
  if (step === 3) {
    const missingRequiredDocuments = documentTypes.filter((documentType) => documentType.is_required && !onboardingDocuments[documentType.id]);
    if (missingRequiredDocuments.length) errors.documents = `Upload required documents: ${missingRequiredDocuments.map(optionLabel).join(", ")}.`;
  }
  return errors;
}

function validateEmployeeCreateForm(form: EmployeeForm, documentTypes: SetupOption[], onboardingDocuments: Record<string, OnboardingDocumentUpload>): EmployeeFormErrors {
  return onboardingSteps.reduce<EmployeeFormErrors>((allErrors, _, step) => ({ ...allErrors, ...validateEmployeeCreateStep(step, form, documentTypes, onboardingDocuments) }), {});
}

function firstEmployeeCreateErrorStep(errors: EmployeeFormErrors) {
  if (["firstName", "email", "mobile", "password"].some((key) => errors[key as EmployeeFormErrorKey])) return 0;
  if (["dob", "pincode", "emergencyContact"].some((key) => errors[key as EmployeeFormErrorKey])) return 1;
  if (["branchID", "departmentID", "designationID", "employmentTypeID", "joiningDate", "experienceYear", "experienceMonth", "probationDurationDays", "probationStartDate", "probationEndDate", "probationConfirmedAt"].some((key) => errors[key as EmployeeFormErrorKey])) return 2;
  if (errors.documents) return 3;
  return 4;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function profileToEditForm(profile: EmployeeProfile): EmployeeEditForm {
  const employee = profile.employee;
  const bank = profile.banks.find((item) => item.is_primary) || profile.banks[0];
  const statutory = profile.statutory;
  return {
    firstName: employee.firstname || "",
    middleName: employee.middle_name || "",
    lastName: employee.lastname || "",
    email: employee.email || "",
    mobile: employee.mobile || "",
    password: "",
    employeeCode: employee.employee_code || "",
    role: employee.role || "employee",
    joiningDate: dateInputValue(employee.joining_date),
    resignationDate: dateInputValue(employee.resignation_date),
    branchID: employee.branch_id || "",
    departmentID: employee.department_id || "",
    designationID: employee.designation_id || "",
    reportingManagerID: employee.reporting_manager_id || "",
    employmentTypeID: employee.employment_type_id || "",
    grade: employee.grade || "",
    experienceYear: String(employee.experience_year || 0),
    experienceMonth: String(employee.experience_month || 0),
    probationStatus: employee.probation_status || "confirmed",
    probationStartDate: dateInputValue(employee.probation_start_date),
    probationEndDate: dateInputValue(employee.probation_end_date),
    probationDurationDays: String(employee.probation_duration_days || 0),
    probationConfirmedAt: dateInputValue(employee.probation_confirmed_at),
    isPayrollStaff: employee.is_payroll_staff || false,
    gender: employee.gender || "",
    dob: dateInputValue(employee.dob),
    address: employee.address || "",
    city: employee.city || "",
    state: employee.state || "",
    country: employee.country || "",
    pincode: employee.pincode || "",
    emergencyContact: employee.emergency_contact || "",
    maritalStatus: employee.marital_status || "",
    bloodGroup: employee.blood_group || "",
    profilePhotoPath: employee.profile_photo_path || "",
    bankName: bank?.bank_name || "",
    accountNumber: bank?.account_number || "",
    ifscCode: bank?.ifsc_code || "",
    accountType: bank?.account_type || "",
    bankBranchName: bank?.branch_name || "",
    pfNo: statutory?.pf_no || "",
    uanNo: statutory?.uan_no || "",
    esicNo: statutory?.esic_no || "",
    pan: statutory?.pan || "",
    aadhaar: statutory?.aadhaar || "",
    ptApplicable: statutory?.pt_applicable || false,
    pfApplicable: statutory?.pf_applicable || false,
    esicApplicable: statutory?.esic_applicable || false,
    lwfApplicable: statutory?.lwf_applicable || false,
  };
}

function employeeUpdatePayload(form: EmployeeEditForm) {
  return {
    first_name: form.firstName.trim(),
    middle_name: optionalString(form.middleName),
    last_name: optionalString(form.lastName),
    email: optionalString(form.email),
    mobile: optionalString(form.mobile),
    employee_code: optionalString(form.employeeCode),
    role: form.role,
    joining_date: form.joiningDate,
    resignation_date: form.resignationDate,
    branch_id: form.branchID || null,
    department_id: form.departmentID || null,
    designation_id: form.designationID || null,
    reporting_manager_id: form.reportingManagerID || null,
    employment_type_id: form.employmentTypeID || null,
    grade: optionalString(form.grade),
    experience_year: Number.parseInt(form.experienceYear || "0", 10) || 0,
    experience_month: Number.parseInt(form.experienceMonth || "0", 10) || 0,
    probation_status: form.probationStatus,
    probation_start_date: form.probationStartDate,
    probation_end_date: form.probationEndDate,
    probation_duration_days: Number.parseInt(form.probationDurationDays || "0", 10) || 0,
    probation_confirmed_at: form.probationConfirmedAt,
    is_payroll_staff: form.isPayrollStaff,
    gender: optionalString(form.gender),
    dob: form.dob,
    marital_status: optionalString(form.maritalStatus),
    blood_group: optionalString(form.bloodGroup),
    profile_photo_path: optionalString(form.profilePhotoPath),
    address: optionalString(form.address),
    city: optionalString(form.city),
    state: optionalString(form.state),
    country: optionalString(form.country),
    pincode: optionalString(form.pincode),
    emergency_contact: optionalString(form.emergencyContact),
    bank: {
      bank_name: optionalString(form.bankName),
      account_number: optionalString(form.accountNumber),
      ifsc_code: optionalString(form.ifscCode),
      account_type: optionalString(form.accountType),
      branch_name: optionalString(form.bankBranchName),
    },
    statutory: {
      pf_no: optionalString(form.pfNo),
      uan_no: optionalString(form.uanNo),
      esic_no: optionalString(form.esicNo),
      pan: optionalString(form.pan),
      aadhaar: optionalString(form.aadhaar),
      pt_applicable: form.ptApplicable,
      pf_applicable: form.pfApplicable,
      esic_applicable: form.esicApplicable,
      lwf_applicable: form.lwfApplicable,
    },
  };
}

export function EmployeesSection({
  isSuperAdmin,
  tenants,
  tenantsLoading,
  tenantsError,
}: {
  isSuperAdmin: boolean;
  tenants: BranchTenantOption[];
  tenantsLoading: boolean;
  tenantsError: string;
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
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employees</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">Employee Directory</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">Select a tenant to view employee list, grid cards, and the employee creation wizard.</p>
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
        {tenantsError ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{tenantsError}</p> : null}
        <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] p-5">
            <h2 className="text-lg font-black text-[#111827]">Tenant Directory</h2>
            <p className="text-sm text-[#6b7280]">{filteredTenants.length} shown from {tenants.length} tenants.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {tenantsLoading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={4}>Loading tenants...</td></tr> : null}
                {!tenantsLoading && filteredTenants.map((tenant) => (
                  <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                    <td className="px-5 py-5"><strong className="block text-sm text-[#111827]">{tenant.name}</strong><span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} - {tenant.kind}</span></td>
                    <td className="px-5 py-5"><span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span></td>
                    <td className="px-5 py-5 text-sm font-bold text-[#4b5563]">{tenant.status}</td>
                    <td className="px-5 py-5 text-right"><button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white hover:bg-[#456d58]" onClick={() => setSelectedTenant(tenant)} type="button">Manage Employees</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return <EmployeeWorkspace isSuperAdmin={isSuperAdmin} onBack={isSuperAdmin ? () => setSelectedTenant(null) : undefined} tenant={selectedTenant} />;
}

function EmployeeWorkspace({ isSuperAdmin, tenant, onBack }: { isSuperAdmin: boolean; tenant: BranchTenantOption | null; onBack?: () => void }) {
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [branches, setBranches] = useState<SetupOption[]>([]);
  const [departments, setDepartments] = useState<SetupOption[]>([]);
  const [designations, setDesignations] = useState<SetupOption[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<SetupOption[]>([]);
  const [documentTypes, setDocumentTypes] = useState<SetupOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState<EmployeeRow | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<EmployeeRow | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedEmployeeID, setSelectedEmployeeID] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [createError, setCreateError] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState<EmployeeFormErrors>({});
  const [onboardingDocuments, setOnboardingDocuments] = useState<Record<string, OnboardingDocumentUpload>>({});
  const basePath = isSuperAdmin && tenant ? `/hrms/tenants/${tenant.id}` : "/hrms";
  const title = tenant ? `${tenant.name} Employees` : "Employees";

  const loadData = useCallback(async () => {
    setLoading(true);
    setEmployeesLoading(true);
    setError("");
    try {
      const [branchResult, departmentResult, designationResult, employmentResult, documentTypeResult, employeeResult] = await Promise.all([
        apiRequest<SetupOption[]>(`${basePath}/branches`),
        apiRequest<SetupOption[]>(`${basePath}/departments`),
        apiRequest<SetupOption[]>(`${basePath}/designations`),
        apiRequest<SetupOption[]>(`${basePath}/employment-types`),
        apiRequest<SetupOption[]>(`${basePath}/document-types`),
        apiRequest<EmployeeRow[]>(`${basePath}/employees`),
      ]);
      setBranches(branchResult);
      setDepartments(departmentResult);
      setDesignations(designationResult);
      setEmploymentTypes(employmentResult);
      setDocumentTypes(documentTypeResult);
      setEmployees(employeeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load employees.");
    } finally {
      setLoading(false);
      setEmployeesLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const values = [fullName(employee), employee.employee_code || "", employee.email || "", employee.mobile || "", employee.department_name || "", employee.designation_name || "", employee.branch_name || ""];
      const matchesQuery = !query || values.some((value) => value.toLowerCase().includes(query));
      const matchesDepartment = !departmentFilter || employee.department_name === departmentFilter;
      const matchesDesignation = !designationFilter || employee.designation_name === designationFilter;
      return matchesQuery && matchesDepartment && matchesDesignation;
    });
  }, [departmentFilter, designationFilter, employees, search]);

  const stats = useMemo(() => {
    const active = employees.filter((employee) => !employee.inactive).length;
    const newJoiners = employees.filter((employee) => isThisMonth(employee.joining_date || employee.created_at)).length;
    const departmentCount = new Set(employees.map((employee) => employee.department_name).filter(Boolean)).size;
    return { active, departmentCount, newJoiners, total: employees.length };
  }, [employees]);

  function update<K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    setCreateFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors, ...validateEmployeeCreateStep(createStep, nextForm, documentTypes, onboardingDocuments) };
      if (!nextErrors[key]) delete nextErrors[key];
      if (key === "probationStartDate" || key === "probationEndDate") {
        delete nextErrors.probationEndDate;
        Object.assign(nextErrors, validateEmployeeCreateStep(2, nextForm, documentTypes, onboardingDocuments));
      }
      return nextErrors;
    });
    setCreateError("");
  }

  function openCreateForm() {
    setForm(emptyForm);
    setCreateError("");
    setCreateFieldErrors({});
    setNotice("");
    setCreated(null);
    setCreateStep(0);
    setOnboardingDocuments({});
    setCreateOpen(true);
  }

  function closeCreateForm() {
    setForm(emptyForm);
    setCreateStep(0);
    setCreateError("");
    setCreateFieldErrors({});
    setOnboardingDocuments({});
    setCreateOpen(false);
  }

  function validateAndGoToStep(nextStep: number) {
    if (nextStep <= createStep) {
      setCreateStep(nextStep);
      setCreateError("");
      return;
    }
    const errors = Array.from({ length: nextStep - createStep }, (_, index) => createStep + index).reduce<EmployeeFormErrors>((allErrors, step) => ({ ...allErrors, ...validateEmployeeCreateStep(step, form, documentTypes, onboardingDocuments) }), {});
    setCreateFieldErrors((current) => ({ ...current, ...errors }));
    if (Object.keys(errors).length) {
      setCreateStep(firstEmployeeCreateErrorStep(errors));
      setCreateError("Please correct the highlighted fields before continuing.");
      return;
    }
    setCreateError("");
    setCreateStep(nextStep);
  }

  function payload() {
    return {
      first_name: form.firstName.trim(),
      middle_name: optionalString(form.middleName),
      last_name: optionalString(form.lastName),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      password: form.password,
      employee_code: optionalString(form.employeeCode),
      role: form.role,
      joining_date: form.joiningDate,
      branch_id: form.branchID || null,
      department_id: form.departmentID || null,
      designation_id: form.designationID || null,
      reporting_manager_id: form.reportingManagerID || null,
      employment_type_id: form.employmentTypeID || null,
      grade: optionalString(form.grade),
      experience_year: Number.parseInt(form.experienceYear || "0", 10) || 0,
      experience_month: Number.parseInt(form.experienceMonth || "0", 10) || 0,
      probation_status: form.probationStatus,
      probation_start_date: form.probationStartDate,
      probation_end_date: form.probationEndDate,
      probation_duration_days: Number.parseInt(form.probationDurationDays || "0", 10) || 0,
      probation_confirmed_at: form.probationConfirmedAt,
      is_payroll_staff: form.isPayrollStaff,
      gender: optionalString(form.gender),
      dob: form.dob,
      address: optionalString(form.address),
      city: optionalString(form.city),
      state: optionalString(form.state),
      country: optionalString(form.country),
      pincode: optionalString(form.pincode),
      emergency_contact: optionalString(form.emergencyContact),
      statutory: {
        pf_applicable: form.pfApplicable,
        esic_applicable: form.esicApplicable,
        pt_applicable: form.ptApplicable,
        lwf_applicable: form.lwfApplicable,
      },
    };
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateEmployeeCreateForm(form, documentTypes, onboardingDocuments);
    setCreateFieldErrors(errors);
    if (Object.keys(errors).length) {
      setCreateStep(firstEmployeeCreateErrorStep(errors));
      setCreateError("Please correct the highlighted fields before creating the employee.");
      return;
    }
    setSaving(true);
    setCreateError("");
    setNotice("");
    setCreated(null);
    try {
      const result = await apiRequest<EmployeeRow>(`${basePath}/employees`, { method: "POST", body: payload() });
      for (const document of Object.values(onboardingDocuments)) {
        if (!document.fileContentBase64) continue;
        await apiRequest<EmployeeDocument>(`${basePath}/employees/${result.id}/documents`, {
          method: "POST",
          body: {
            document_type_id: document.documentTypeID || null,
            title: document.title || document.fileName,
            file_name: document.fileName,
            file_content_type: document.fileContentType,
            file_content_base64: document.fileContentBase64,
          },
        });
      }
      setCreated(result);
      setForm(emptyForm);
      setOnboardingDocuments({});
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create employee.");
    } finally {
      setSaving(false);
    }
  }

  async function attachOnboardingDocument(documentType: SetupOption, file?: File) {
    if (!file) return;
    setCreateError("");
    try {
      const content = await readFileAsBase64(file);
      setOnboardingDocuments((current) => ({
        ...current,
        [documentType.id]: {
          documentTypeID: documentType.id,
          title: optionLabel(documentType),
          fileName: file.name,
          fileContentType: file.type || "application/octet-stream",
          fileContentBase64: content,
        },
      }));
      setCreateFieldErrors((current) => {
        const nextDocuments = {
          ...onboardingDocuments,
          [documentType.id]: {
            documentTypeID: documentType.id,
            title: optionLabel(documentType),
            fileName: file.name,
            fileContentType: file.type || "application/octet-stream",
            fileContentBase64: content,
          },
        };
        const next = { ...current };
        delete next.documents;
        Object.assign(next, validateEmployeeCreateStep(3, form, documentTypes, nextDocuments));
        return next;
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to read selected file.");
    }
  }

  async function deactivateEmployee() {
    if (!confirmDeactivate) return;
    setDeactivating(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`${basePath}/employees/${confirmDeactivate.id}`, { method: "DELETE" });
      setNotice(`Emergency deactivated ${fullName(confirmDeactivate)}. Use Employee Exits for normal resignations, clearance, and final settlement.`);
      setConfirmDeactivate(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate employee.");
    } finally {
      setDeactivating(false);
    }
  }

  if (selectedEmployeeID) {
    return <EmployeeProfileView basePath={basePath} employeeID={selectedEmployeeID} onBack={() => setSelectedEmployeeID("")} />;
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {onBack ? <button className="mb-4 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to tenants</button> : null}
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employee</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">List active employees by tenant with department, branch, designation, and employment type context.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#456d58]" onClick={openCreateForm} type="button">New Employee</button>
          <div className="flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white p-1 shadow-sm">
            <button className={`rounded-lg px-4 py-2 text-sm font-black ${viewMode === "list" ? "bg-[#588368] text-white" : "text-[#4b5563]"}`} onClick={() => setViewMode("list")} type="button">List</button>
            <button className={`rounded-lg px-4 py-2 text-sm font-black ${viewMode === "grid" ? "bg-[#588368] text-white" : "text-[#4b5563]"}`} onClick={() => setViewMode("grid")} type="button">Grid</button>
          </div>
        </div>
      </div>

      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {notice ? <p className="mb-5 rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-4 py-3 text-sm font-semibold text-[#16803c]">{notice}</p> : null}
      {created ? <p className="mb-5 rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-4 py-3 text-sm font-semibold text-[#16803c]">Created {fullName(created)} with code {created.employee_code || "generated"}.</p> : null}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <MetricCard label="Total Employee" value={stats.total} tone="dark" />
        <MetricCard label="Active" value={stats.active} tone="green" />
        <MetricCard label="Departments" value={stats.departmentCount} tone="red" />
        <MetricCard label="New Joiners" value={stats.newJoiners} tone="blue" />
      </div>

      <section className="mb-6 rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#111827]">{viewMode === "list" ? "Employees List" : "Employees Grid"}</h2>
            <p className="text-sm text-[#6b7280]">{filteredEmployees.length} shown from {employees.length} active employees.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="h-10 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setSearch(event.target.value)} placeholder="Search employee" value={search} />
            <select className="h-10 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDepartmentFilter(event.target.value)} value={departmentFilter}>
              <option value="">All departments</option>
              {[...new Set(employees.map((employee) => employee.department_name).filter(Boolean))].map((name) => <option key={name || ""} value={name || ""}>{name}</option>)}
            </select>
            <select className="h-10 rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDesignationFilter(event.target.value)} value={designationFilter}>
              <option value="">All designations</option>
              {[...new Set(employees.map((employee) => employee.designation_name).filter(Boolean))].map((name) => <option key={name || ""} value={name || ""}>{name}</option>)}
            </select>
          </div>
        </div>
        {confirmDeactivate ? (
          <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-red-700">Confirm Deactivation</p>
                <h3 className="mt-2 text-xl font-black text-[#111827]">Emergency deactivate {fullName(confirmDeactivate)}?</h3>
                <p className="mt-2 text-sm leading-6 text-[#6b7280]">For normal resignation or termination, use Employee Exits so approval, handover, F&F, assets, and access revocation are tracked before deactivation.</p>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-red-800">This soft-deletes the HRMS employee record and disables the linked identity user. The employee will no longer appear in the active employee directory.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-[#374151]" disabled={deactivating} onClick={() => setConfirmDeactivate(null)} type="button">Cancel</button>
                <button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60" disabled={deactivating} onClick={deactivateEmployee} type="button">{deactivating ? "Deactivating..." : "Emergency Deactivate"}</button>
              </div>
            </div>
          </div>
        ) : null}
        {viewMode === "list" ? <EmployeeTable employees={filteredEmployees} loading={employeesLoading} onDeactivate={setConfirmDeactivate} onOpen={setSelectedEmployeeID} /> : <EmployeeGrid employees={filteredEmployees} loading={employeesLoading} onDeactivate={setConfirmDeactivate} onOpen={setSelectedEmployeeID} />}
      </section>

      <HrmsModal description="Create an employee profile, assign role details, and collect required documents for HR review." onClose={closeCreateForm} open={createOpen} title="Employee Onboarding">
        <form className="space-y-6" onSubmit={save}>
          {createError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{createError}</p> : null}
          <div className="grid gap-2 sm:grid-cols-5">
            {onboardingSteps.map((step, index) => <button className={`rounded-2xl border px-3 py-3 text-xs font-black ${createStep === index ? "border-[#588368] bg-[#eef4f1] text-[#315f3d]" : "border-[#edf1ef] bg-white text-[#6b7280]"}`} key={step} onClick={() => validateAndGoToStep(index)} type="button">{index + 1}. {step}</button>)}
          </div>

          {createStep === 0 ? (
            <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
              <h2 className="text-lg font-black text-[#111827]">Identity</h2>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">Create login access and share temporary credentials with the employee.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field error={createFieldErrors.firstName} label="First name" required value={form.firstName} onChange={(value) => update("firstName", value)} />
                <Field label="Middle name" value={form.middleName} onChange={(value) => update("middleName", value)} />
                <Field label="Last name" value={form.lastName} onChange={(value) => update("lastName", value)} />
                <Field error={createFieldErrors.email} label="Email" required type="email" value={form.email} onChange={(value) => update("email", value)} />
                <Field error={createFieldErrors.mobile} label="Mobile" required value={form.mobile} onChange={(value) => update("mobile", value)} />
                <Field error={createFieldErrors.password} label="Temporary password" required type="password" value={form.password} onChange={(value) => update("password", value)} />
                <Field label="Employee code" placeholder="Auto if blank" value={form.employeeCode} onChange={(value) => update("employeeCode", value)} />
              </div>
            </section>
          ) : null}

          {createStep === 1 ? (
            <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
              <h2 className="text-lg font-black text-[#111827]">Personal Information</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-[#374151]">Gender<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => update("gender", event.target.value)} value={form.gender}><option value="">Select gender</option>{genderOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <Field error={createFieldErrors.dob} label="Date of birth" type="date" value={form.dob} onChange={(value) => update("dob", value)} />
                <Field label="Address" value={form.address} onChange={(value) => update("address", value)} wide />
                <Field label="City" value={form.city} onChange={(value) => update("city", value)} />
                <Field label="State" value={form.state} onChange={(value) => update("state", value)} />
                <Field label="Country" value={form.country} onChange={(value) => update("country", value)} />
                <Field error={createFieldErrors.pincode} label="Pincode" value={form.pincode} onChange={(value) => update("pincode", value)} />
                <Field error={createFieldErrors.emergencyContact} label="Emergency contact" value={form.emergencyContact} onChange={(value) => update("emergencyContact", value)} />
              </div>
            </section>
          ) : null}

          {createStep === 2 ? (
            <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
              <h2 className="text-lg font-black text-[#111827]">Employment Assignment</h2>
              {loading ? <p className="mt-5 rounded-lg bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#6b7280]">Loading setup masters...</p> : null}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SelectField error={createFieldErrors.branchID} label="Branch" value={form.branchID} onChange={(value) => update("branchID", value)} options={branches} />
                <SelectField error={createFieldErrors.departmentID} label="Department" value={form.departmentID} onChange={(value) => update("departmentID", value)} options={departments} />
                <SelectField error={createFieldErrors.designationID} label="Designation" value={form.designationID} onChange={(value) => update("designationID", value)} options={designations} />
                <SelectField label="Reporting manager" value={form.reportingManagerID} onChange={(value) => update("reportingManagerID", value)} options={managerOptions(employees)} />
                <SelectField error={createFieldErrors.employmentTypeID} label="Employment type" value={form.employmentTypeID} onChange={(value) => update("employmentTypeID", value)} options={employmentTypes} />
                <label className="block text-sm font-bold text-[#374151]">Role<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" value={form.role} onChange={(event) => update("role", event.target.value)}><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr">HR</option></select></label>
                <label className="block text-sm font-bold text-[#374151]">Grade<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => update("grade", event.target.value)} value={form.grade}><option value="">Select grade</option>{gradeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <Field error={createFieldErrors.joiningDate} label="Joining date" type="date" value={form.joiningDate} onChange={(value) => update("joiningDate", value)} />
                <div className="grid gap-3 sm:grid-cols-2"><Field error={createFieldErrors.experienceYear} label="Experience years" type="number" value={form.experienceYear} onChange={(value) => update("experienceYear", value)} /><Field error={createFieldErrors.experienceMonth} label="Experience months" type="number" value={form.experienceMonth} onChange={(value) => update("experienceMonth", value)} /></div>
              </div>
              <div className="mt-5 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Probation</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-black text-[#374151]"><input checked={form.isPayrollStaff} className="h-5 w-5 accent-[#588368]" onChange={(event) => update("isPayrollStaff", event.target.checked)} type="checkbox" /> Payroll staff</label>
                  <SelectField label="Probation status" value={form.probationStatus} onChange={(value) => update("probationStatus", value)} options={probationStatuses} />
                  <Field error={createFieldErrors.probationDurationDays} label="Duration days" type="number" value={form.probationDurationDays} onChange={(value) => update("probationDurationDays", value)} />
                  <Field error={createFieldErrors.probationStartDate} label="Start date" type="date" value={form.probationStartDate} onChange={(value) => update("probationStartDate", value)} />
                  <Field error={createFieldErrors.probationEndDate} label="End date" type="date" value={form.probationEndDate} onChange={(value) => update("probationEndDate", value)} />
                  <Field error={createFieldErrors.probationConfirmedAt} label="Confirmed date" type="date" value={form.probationConfirmedAt} onChange={(value) => update("probationConfirmedAt", value)} />
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Statutory Applicability</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  <CheckField label="PF applicable" checked={form.pfApplicable} onChange={(value) => update("pfApplicable", value)} />
                  <CheckField label="ESIC applicable" checked={form.esicApplicable} onChange={(value) => update("esicApplicable", value)} />
                  <CheckField label="PT applicable" checked={form.ptApplicable} onChange={(value) => update("ptApplicable", value)} />
                  <CheckField label="LWF applicable" checked={form.lwfApplicable} onChange={(value) => update("lwfApplicable", value)} />
                </div>
              </div>
            </section>
          ) : null}

          {createStep === 3 ? (
            <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
              <h2 className="text-lg font-black text-[#111827]">Required Documents</h2>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">Upload the required joining documents for HR review.</p>
              {createFieldErrors.documents ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{createFieldErrors.documents}</p> : null}
              <div className="mt-5 grid gap-3">
                {documentTypes.map((documentType) => <label className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={documentType.id}><span className="block text-sm font-black text-[#111827]">{optionLabel(documentType)}{documentType.is_required ? " *" : ""}</span><span className="mt-1 block text-xs font-semibold text-[#6b7280]">Max {Math.round((documentType.max_file_size_bytes || 10485760) / 1024 / 1024)} MB</span><input accept={documentType.allowed_content_types || undefined} className="mt-3 block w-full rounded-xl border border-dashed border-[#b9c8c0] bg-white px-4 py-3 text-sm font-semibold text-[#4b5563] file:mr-4 file:rounded-lg file:border-0 file:bg-[#588368] file:px-4 file:py-2 file:text-sm file:font-black file:text-white" onChange={(event) => void attachOnboardingDocument(documentType, event.target.files?.[0])} type="file" />{onboardingDocuments[documentType.id] ? <span className="mt-2 block text-xs font-black text-[#588368]">Selected: {onboardingDocuments[documentType.id].fileName}</span> : null}</label>)}
                {documentTypes.length === 0 ? <p className="rounded-xl bg-[#f8faf9] px-4 py-5 text-sm font-semibold text-[#6b7280]">No document requirements yet. Add document types from employee document settings first.</p> : null}
              </div>
            </section>
          ) : null}

          {createStep === 4 ? (
            <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
              <h2 className="text-lg font-black text-[#111827]">Review</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SummaryItem label="Name" value={[form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") || "-"} />
                <SummaryItem label="Email" value={form.email || "-"} />
                <SummaryItem label="Mobile" value={form.mobile || "-"} />
                <SummaryItem label="Gender" value={form.gender || "-"} />
                <SummaryItem label="Joining" value={form.joiningDate || "-"} />
                <SummaryItem label="Grade" value={form.grade || "-"} />
                <SummaryItem label="Probation" value={`${probationStatuses.find((item) => item.id === form.probationStatus)?.name || form.probationStatus} · ${form.probationDurationDays || 0} days`} />
                <SummaryItem label="Statutory" value={[form.pfApplicable ? "PF" : "", form.esicApplicable ? "ESIC" : "", form.ptApplicable ? "PT" : "", form.lwfApplicable ? "LWF" : ""].filter(Boolean).join(", ") || "-"} />
                <SummaryItem label="Documents selected" value={`${Object.keys(onboardingDocuments).length}/${documentTypes.length}`} />
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap justify-between gap-3 border-t border-[#edf1ef] pt-5">
            <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={closeCreateForm} type="button">Cancel</button>
            <div className="flex gap-3">
              <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151] disabled:opacity-50" disabled={createStep === 0} onClick={() => setCreateStep((step) => Math.max(0, step - 1))} type="button">Back</button>
              {createStep < onboardingSteps.length - 1 ? <button className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white" onClick={() => validateAndGoToStep(Math.min(onboardingSteps.length - 1, createStep + 1))} type="button">Next</button> : <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Creating..." : "Create Employee"}</button>}
            </div>
          </div>
        </form>
      </HrmsModal>
    </div>
  );
}

function EmployeeProfileView({ basePath, employeeID, onBack }: { basePath: string; employeeID: string; onBack: () => void }) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [credentialEvents, setCredentialEvents] = useState<EmployeeCredentialEvent[]>([]);
  const [editForm, setEditForm] = useState<EmployeeEditForm | null>(null);
  const [tenantRoles, setTenantRoles] = useState<IdentityRole[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<IdentityRole[]>([]);
  const [selectedRoleIDs, setSelectedRoleIDs] = useState<string[]>([]);
  const [managerRows, setManagerRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [savingDocumentType, setSavingDocumentType] = useState(false);
  const [credentialSaving, setCredentialSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rolesError, setRolesError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<EmployeeEditTab>("identity");
  const [documentForm, setDocumentForm] = useState<EmployeeDocumentForm>(emptyDocumentForm);
  const [documentTypeName, setDocumentTypeName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const loadUserRoles = useCallback(async (userID: string, employeeTenantID?: string) => {
    if (!userID) return;
    setRolesLoading(true);
    setRolesError("");
    try {
      const [rolesResult, assignedResult] = await Promise.all([
        apiRequest<IdentityRole[]>("/roles/"),
        apiRequest<IdentityRole[]>(`/users/${userID}/roles/`),
      ]);
      const assignableRoles = rolesResult.filter((role) => isEmployeeAssignableTenantRole(role, employeeTenantID));
      const assignableRoleIDs = new Set(assignableRoles.map((role) => role.id));
      const visibleAssignedRoles = assignedResult.filter((role) => assignableRoleIDs.has(role.id) || isEmployeeAssignableTenantRole(role, employeeTenantID));
      setTenantRoles(assignableRoles);
      setAssignedRoles(visibleAssignedRoles);
      setSelectedRoleIDs(visibleAssignedRoles.filter((role) => assignableRoleIDs.has(role.id)).map((role) => role.id));
    } catch (err) {
      setTenantRoles([]);
      setAssignedRoles([]);
      setSelectedRoleIDs([]);
      setRolesError(err instanceof Error ? err.message : "Unable to load employee role assignments.");
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, employeeRows, events] = await Promise.all([
        apiRequest<EmployeeProfile>(`${basePath}/employees/${employeeID}`),
        apiRequest<EmployeeRow[]>(`${basePath}/employees`),
        apiRequest<EmployeeCredentialEvent[]>(`${basePath}/employees/${employeeID}/credential-events?limit=10`),
      ]);
      setProfile(result);
      setEditForm(profileToEditForm(result));
      setManagerRows(employeeRows);
      setCredentialEvents(events);
      await loadUserRoles(result.employee.user_id, result.employee.tenant_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load employee profile.");
    } finally {
      setLoading(false);
    }
  }, [basePath, employeeID, loadUserRoles]);

  useEffect(() => {
    const timer = window.setTimeout(loadProfile, 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  if (loading) {
    return <div className="px-4 py-8 lg:px-6"><button className="mb-5 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to employees</button><p className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-center text-sm font-semibold text-[#6b7280]">Loading employee profile...</p></div>;
  }
  if (error || !profile) {
    return <div className="px-4 py-8 lg:px-6"><button className="mb-5 text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to employees</button><p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error || "Employee profile not found."}</p></div>;
  }

  const employee = profile.employee;
  const primaryBank = profile.banks.find((bank) => bank.is_primary) || profile.banks[0];
  const statutory = profile.statutory;
  const onboarding = profile.onboarding || { status: "not_started", is_complete: false, required_documents: 0, uploaded_required_documents: 0, approved_required_documents: 0, pending_review_documents: 0, rejected_documents: 0, missing_required_documents: [] };
  const lockedDocumentTypes = approvedDocumentTypeIDs(profile.documents);
  const availableDocumentTypes = profile.lookups.document_types.filter((item) => !lockedDocumentTypes.has(item.id));
  const selectedDocumentType = availableDocumentTypes.find((item) => item.id === documentForm.documentTypeID);
  const experience = `${employee.experience_year || 0}y ${employee.experience_month || 0}m`;
  const address = [employee.address, employee.city, employee.state, employee.country, employee.pincode].filter(Boolean).join(", ");
  const reportingManager = managerRows.find((row) => row.user_id === employee.reporting_manager_id);
  const accessRoleSummary = assignedRoles.length ? assignedRoles.map(roleName).join(", ") : employee.role || "Employee";

  function updateEdit<K extends keyof EmployeeEditForm>(key: K, value: EmployeeEditForm[K]) {
    setEditForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateDocumentForm<K extends keyof EmployeeDocumentForm>(key: K, value: EmployeeDocumentForm[K]) {
    setDocumentForm((current) => ({ ...current, [key]: value }));
  }

  async function handleDocumentFile(file: File | undefined) {
    if (!file) {
      setDocumentForm((current) => ({ ...current, fileName: "", fileContentType: "", fileContentBase64: "" }));
      return;
    }
    try {
      const content = await readFileAsBase64(file);
      setDocumentForm((current) => ({ ...current, fileName: file.name, fileContentType: file.type || "application/octet-stream", fileContentBase64: content }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read selected file.");
    }
  }

  async function uploadProfilePhoto(file: File | undefined) {
    if (!file || !editForm) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Profile photo must be JPG, PNG, or WebP.");
      setActiveEditTab("identity");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const content = await readFileAsBase64(file);
      const document = await apiRequest<EmployeeDocument>(`${basePath}/employees/${employeeID}/documents`, {
        method: "POST",
        body: {
          document_type_id: null,
          title: "Profile Photo",
          file_name: file.name,
          file_content_type: file.type || "application/octet-stream",
          file_content_base64: content,
        },
      });
      if (!document.file_path) {
        throw new Error("Profile photo was uploaded but no storage path was returned.");
      }
      const nextForm = { ...editForm, profilePhotoPath: document.file_path };
      const result = await apiRequest<EmployeeProfile>(`${basePath}/employees/${employeeID}`, { method: "PUT", body: employeeUpdatePayload(nextForm) });
      setProfile(result);
      setEditForm(profileToEditForm(result));
      await loadProfile();
      setSuccess("Profile photo uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload profile photo.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest<EmployeeProfile>(`${basePath}/employees/${employeeID}`, { method: "PUT", body: employeeUpdatePayload(editForm) });
      setProfile(result);
      setEditForm(profileToEditForm(result));
      setSuccess("Employee profile updated.");
      setEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update employee profile.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSelectedRole(roleID: string, checked: boolean) {
    setSelectedRoleIDs((current) => {
      if (checked) return current.includes(roleID) ? current : [...current, roleID];
      return current.filter((id) => id !== roleID);
    });
    setRolesError("");
  }

  async function saveRoleAssignments() {
    if (!profile) return;
    if (selectedRoleIDs.length === 0) {
      setRolesError("Select at least one tenant role. Remove Employee only after adding another workforce role such as HR, Manager, Consultant, or Vendor.");
      setActiveEditTab("roles");
      return;
    }
    setRolesSaving(true);
    setRolesError("");
    setError("");
    setSuccess("");
    try {
      const assignableRoleIDs = new Set(tenantRoles.map((role) => role.id));
      const current = new Set(assignedRoles.filter((role) => assignableRoleIDs.has(role.id)).map((role) => role.id));
      const desired = new Set(selectedRoleIDs.filter((roleID) => assignableRoleIDs.has(roleID)));
      await Promise.all([
        ...Array.from(desired).filter((roleID) => !current.has(roleID)).map((roleID) => apiRequest<void>(`/users/${profile.employee.user_id}/roles/`, { method: "POST", body: { role_id: roleID } })),
        ...Array.from(current).filter((roleID) => !desired.has(roleID)).map((roleID) => apiRequest<void>(`/users/${profile.employee.user_id}/roles/${roleID}`, { method: "DELETE" })),
      ]);
      await loadUserRoles(profile.employee.user_id, profile.employee.tenant_id);
      setSuccess("Employee access roles updated.");
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : "Unable to update employee roles.");
    } finally {
      setRolesSaving(false);
    }
  }

  async function saveDocumentType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDocumentType(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest<SetupOption>(`${basePath}/document-types`, { method: "POST", body: { name: documentTypeName.trim(), is_required: true } });
      setDocumentTypeName("");
      await loadProfile();
      setSuccess("Document type added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save document type.");
    } finally {
      setSavingDocumentType(false);
    }
  }

  async function deleteDocumentType(documentTypeID: string) {
    setSavingDocumentType(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest<void>(`${basePath}/document-types/${documentTypeID}`, { method: "DELETE" });
      await loadProfile();
      setSuccess("Document type deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate document type.");
    } finally {
      setSavingDocumentType(false);
    }
  }

  async function saveDocument(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSavingDocument(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest<EmployeeDocument>(`${basePath}/employees/${employeeID}/documents`, {
        method: "POST",
        body: {
          document_type_id: documentForm.documentTypeID || null,
          title: optionalString(documentForm.title),
          file_path: optionalString(documentForm.filePath),
          file_name: documentForm.fileName,
          file_content_type: documentForm.fileContentType,
          file_content_base64: documentForm.fileContentBase64,
        },
      });
      setDocumentForm(emptyDocumentForm);
      await loadProfile();
      setSuccess("Employee document saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save employee document.");
    } finally {
      setSavingDocument(false);
    }
  }

  async function deleteDocument(documentID: string) {
    setSavingDocument(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest<void>(`${basePath}/employees/${employeeID}/documents/${documentID}`, { method: "DELETE" });
      await loadProfile();
      setSuccess("Employee document removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove employee document.");
    } finally {
      setSavingDocument(false);
    }
  }

  async function reviewDocument(documentID: string, status: string) {
    const remarks = status === "approved" ? "" : window.prompt("Add review remarks for the employee.") || "";
    setSavingDocument(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest<EmployeeDocument>(`${basePath}/employees/${employeeID}/documents/${documentID}/review`, {
        method: "POST",
        body: { status, remarks: optionalString(remarks) },
      });
      await loadProfile();
      setSuccess("Document review updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review employee document.");
    } finally {
      setSavingDocument(false);
    }
  }

  async function resendCredentials() {
    setCredentialSaving(true);
    setError("");
    setSuccess("");
    try {
      const event = await apiRequest<EmployeeCredentialEvent>(`${basePath}/employees/${employeeID}/resend-credentials`, { method: "POST", body: {} });
      setCredentialEvents((current) => [event, ...current].slice(0, 10));
      setSuccess(event.status === "sent" ? "Credential recovery email sent." : event.failure_reason || "Credential recovery failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend credentials.");
    } finally {
      setCredentialSaving(false);
    }
  }

  async function resetTemporaryPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredentialSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest<EmployeeCredentialEvent>(`${basePath}/employees/${employeeID}/reset-temporary-password`, {
        method: "POST",
        body: { temporary_password: temporaryPassword },
      });
      setCredentialEvents((current) => [result, ...current].slice(0, 10));
      setTemporaryPassword("");
      setSuccess(result.status === "sent" ? "Temporary password set and recovery email sent." : result.failure_reason || "Temporary password reset failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset temporary password.");
    } finally {
      setCredentialSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button className="text-left text-sm font-black text-[#588368]" onClick={onBack} type="button">&lt; Back to employees</button>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl bg-[#588368] px-4 py-2 text-xs font-black text-white" onClick={() => { setActiveEditTab("identity"); setEditOpen(true); }} type="button">Edit Employee</button>
          <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{profile.documents.length} Documents</span>
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-black text-[#2563eb]">{profile.banks.length} Bank Records</span>
          <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-black text-[#92400e]">{profile.lookups.document_types.length} Document Types</span>
        </div>
      </div>
      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {success ? <p className="mb-5 rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-4 py-3 text-sm font-semibold text-[#16803c]">{success}</p> : null}

      <div className="grid gap-8">
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white shadow-sm">
            <div className="h-24 bg-[radial-gradient(circle_at_20%_20%,#cfe8d8,transparent_30%),linear-gradient(135deg,#588368,#111827)]" />
            <div className="-mt-10 px-5 pb-5 text-center">
              <span className="mx-auto flex size-20 items-center justify-center rounded-full border-4 border-white bg-[#588368] text-2xl font-black text-white shadow-sm">{initials(employee)}</span>
              <h1 className="mt-3 text-2xl font-black text-[#111827]">{fullName(employee)}</h1>
              <p className="mt-1 text-sm font-semibold text-[#6b7280]">{employee.designation_name || employee.role || "Employee"}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-[#111827] px-3 py-1 text-xs font-bold text-white">{employee.employee_code || "No code"}</span>
                <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-bold text-[#588368]">{experience} experience</span>
              </div>
            </div>
            <div className="border-t border-[#edf1ef] p-5">
              <InfoRow label="Department" value={employee.department_name || "-"} />
              <InfoRow label="Branch" value={employee.branch_name || "-"} />
              <InfoRow label="Employment" value={employee.employment_type_name || "-"} />
              <InfoRow label="Reporting Manager" value={reportingManager ? fullName(reportingManager) : "-"} />
              <InfoRow label="Access Roles" value={accessRoleSummary} />
              <InfoRow label="Joining" value={displayDate(employee.joining_date)} />
              <InfoRow label="Grade" value={employee.grade || "-"} />
              <InfoRow label="Probation" value={`${probationStatuses.find((item) => item.id === employee.probation_status)?.name || employee.probation_status || "-"}${employee.is_payroll_staff ? " · Payroll" : ""}`} />
              <InfoRow label="Probation End" value={displayDate(employee.probation_end_date)} />
            </div>
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Basic Information</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Phone" value={employee.mobile || "-"} />
              <InfoRow label="Email" value={employee.email || "-"} />
              <InfoRow label="Gender" value={employee.gender || "-"} />
              <InfoRow label="Birthday" value={displayDate(employee.dob)} />
              <InfoRow label="Blood Group" value={employee.blood_group || "-"} />
              <InfoRow label="Emergency" value={employee.emergency_contact || "-"} />
            </div>
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Personal Information</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Marital" value={employee.marital_status || "-"} />
              <InfoRow label="Address" value={address || "-"} />
              <InfoRow label="City" value={employee.city || "-"} />
              <InfoRow label="State" value={employee.state || "-"} />
              <InfoRow label="Country" value={employee.country || "-"} />
            </div>
          </section>
        </aside>

        <main className="space-y-5">
          {editForm ? (
            <HrmsModal description="Update one employee section at a time. Access roles are tenant-scoped and saved separately." onClose={() => setEditOpen(false)} open={editOpen} title={`Edit ${fullName(employee)}`}>
              <form className="space-y-5" onSubmit={saveProfile}>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
                  {employeeEditTabs.map((tab) => (
                    <button className={`rounded-2xl border px-3 py-3 text-xs font-black ${activeEditTab === tab.id ? "border-[#588368] bg-[#eef4f1] text-[#315f3d]" : "border-[#edf1ef] bg-white text-[#6b7280] hover:border-[#b9c8c0]"}`} key={tab.id} onClick={() => setActiveEditTab(tab.id)} type="button">{tab.label}</button>
                  ))}
                </div>

                {activeEditTab === "identity" ? (
                  <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Identity</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <Field label="First name" required value={editForm.firstName} onChange={(value) => updateEdit("firstName", value)} />
                      <Field label="Middle name" value={editForm.middleName} onChange={(value) => updateEdit("middleName", value)} />
                      <Field label="Last name" value={editForm.lastName} onChange={(value) => updateEdit("lastName", value)} />
                      <Field label="Employee code" value={editForm.employeeCode} onChange={(value) => updateEdit("employeeCode", value)} />
                      <Field label="Email" type="email" value={editForm.email} onChange={(value) => updateEdit("email", value)} />
                      <Field label="Mobile" required value={editForm.mobile} onChange={(value) => updateEdit("mobile", value)} />
                      <label className="block text-sm font-bold text-[#374151] md:col-span-2">
                        Profile photo
                        <input accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-xl border border-dashed border-[#b9c8c0] bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#4b5563] file:mr-4 file:rounded-lg file:border-0 file:bg-[#588368] file:px-4 file:py-2 file:text-sm file:font-black file:text-white" disabled={saving} onChange={(event) => void uploadProfilePhoto(event.target.files?.[0])} type="file" />
                        {editForm.profilePhotoPath ? <span className="mt-2 block truncate text-xs font-semibold text-[#6b7280]">{editForm.profilePhotoPath}</span> : null}
                      </label>
                    </div>
                  </section>
                ) : null}

                {activeEditTab === "job" ? (
                  <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Job Assignment</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <SelectField label="Branch" value={editForm.branchID} onChange={(value) => updateEdit("branchID", value)} options={profile.lookups.branches} />
                      <SelectField label="Department" value={editForm.departmentID} onChange={(value) => updateEdit("departmentID", value)} options={profile.lookups.departments} />
                      <SelectField label="Designation" value={editForm.designationID} onChange={(value) => updateEdit("designationID", value)} options={profile.lookups.designations} />
                      <SelectField label="Reporting manager" value={editForm.reportingManagerID} onChange={(value) => updateEdit("reportingManagerID", value)} options={managerOptions(managerRows, employee.id)} />
                      <SelectField label="Employment type" value={editForm.employmentTypeID} onChange={(value) => updateEdit("employmentTypeID", value)} options={profile.lookups.employment_types} />
                      <label className="block text-sm font-bold text-[#374151]">Workforce classification<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" value={editForm.role} onChange={(event) => updateEdit("role", event.target.value)}><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr">HR</option></select></label>
                      <label className="block text-sm font-bold text-[#374151]">Grade<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => updateEdit("grade", event.target.value)} value={editForm.grade}><option value="">Select grade</option>{gradeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                      <Field label="Joining date" type="date" value={editForm.joiningDate} onChange={(value) => updateEdit("joiningDate", value)} />
                      <Field label="Resignation date" type="date" value={editForm.resignationDate} onChange={(value) => updateEdit("resignationDate", value)} />
                      <Field label="Experience years" type="number" value={editForm.experienceYear} onChange={(value) => updateEdit("experienceYear", value)} />
                      <Field label="Experience months" type="number" value={editForm.experienceMonth} onChange={(value) => updateEdit("experienceMonth", value)} />
                    </div>
                  </section>
                ) : null}

                {activeEditTab === "personal" ? (
                  <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Personal Details</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <Field label="Date of birth" type="date" value={editForm.dob} onChange={(value) => updateEdit("dob", value)} />
                      <label className="block text-sm font-bold text-[#374151]">Gender<select className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 font-normal outline-none focus:border-[#588368]" onChange={(event) => updateEdit("gender", event.target.value)} value={editForm.gender}><option value="">Select gender</option>{genderOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                      <Field label="Marital status" value={editForm.maritalStatus} onChange={(value) => updateEdit("maritalStatus", value)} />
                      <Field label="Blood group" value={editForm.bloodGroup} onChange={(value) => updateEdit("bloodGroup", value)} />
                      <Field label="Emergency contact" value={editForm.emergencyContact} onChange={(value) => updateEdit("emergencyContact", value)} />
                      <Field label="Address" value={editForm.address} onChange={(value) => updateEdit("address", value)} wide />
                      <Field label="City" value={editForm.city} onChange={(value) => updateEdit("city", value)} />
                      <Field label="State" value={editForm.state} onChange={(value) => updateEdit("state", value)} />
                      <Field label="Country" value={editForm.country} onChange={(value) => updateEdit("country", value)} />
                      <Field label="Pincode" value={editForm.pincode} onChange={(value) => updateEdit("pincode", value)} />
                    </div>
                  </section>
                ) : null}

                {activeEditTab === "payroll" ? (
                  <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Payroll & Bank</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] bg-[#f8faf9] px-4 py-3 text-sm font-black text-[#374151]"><input checked={editForm.isPayrollStaff} className="h-5 w-5 accent-[#588368]" onChange={(event) => updateEdit("isPayrollStaff", event.target.checked)} type="checkbox" /> Payroll staff</label>
                      <SelectField label="Probation status" value={editForm.probationStatus} onChange={(value) => updateEdit("probationStatus", value)} options={probationStatuses} />
                      <Field label="Duration days" type="number" value={editForm.probationDurationDays} onChange={(value) => updateEdit("probationDurationDays", value)} />
                      <Field label="Start date" type="date" value={editForm.probationStartDate} onChange={(value) => updateEdit("probationStartDate", value)} />
                      <Field label="End date" type="date" value={editForm.probationEndDate} onChange={(value) => updateEdit("probationEndDate", value)} />
                      <Field label="Confirmed date" type="date" value={editForm.probationConfirmedAt} onChange={(value) => updateEdit("probationConfirmedAt", value)} />
                      <Field label="Bank name" value={editForm.bankName} onChange={(value) => updateEdit("bankName", value)} />
                      <Field label="Account number" value={editForm.accountNumber} onChange={(value) => updateEdit("accountNumber", value)} />
                      <Field label="IFSC code" value={editForm.ifscCode} onChange={(value) => updateEdit("ifscCode", value)} />
                      <Field label="Account type" value={editForm.accountType} onChange={(value) => updateEdit("accountType", value)} />
                      <Field label="Bank branch" value={editForm.bankBranchName} onChange={(value) => updateEdit("bankBranchName", value)} />
                    </div>
                  </section>
                ) : null}

                {activeEditTab === "statutory" ? (
                  <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Statutory Details</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <Field label="PAN" value={editForm.pan} onChange={(value) => updateEdit("pan", value)} />
                      <Field label="Aadhaar" value={editForm.aadhaar} onChange={(value) => updateEdit("aadhaar", value)} />
                      <Field label="UAN" value={editForm.uanNo} onChange={(value) => updateEdit("uanNo", value)} />
                      <Field label="PF number" value={editForm.pfNo} onChange={(value) => updateEdit("pfNo", value)} />
                      <Field label="ESIC number" value={editForm.esicNo} onChange={(value) => updateEdit("esicNo", value)} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <CheckField label="PF applicable" checked={editForm.pfApplicable} onChange={(value) => updateEdit("pfApplicable", value)} />
                      <CheckField label="ESIC applicable" checked={editForm.esicApplicable} onChange={(value) => updateEdit("esicApplicable", value)} />
                      <CheckField label="PT applicable" checked={editForm.ptApplicable} onChange={(value) => updateEdit("ptApplicable", value)} />
                      <CheckField label="LWF applicable" checked={editForm.lwfApplicable} onChange={(value) => updateEdit("lwfApplicable", value)} />
                    </div>
                  </section>
                ) : null}

                {activeEditTab === "documents" ? (
                  <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Documents</h3>
                        <p className="mt-1 text-sm font-semibold text-[#6b7280]">Upload employee documents and review existing files.</p>
                      </div>
                      <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{profile.documents.length} documents</span>
                    </div>
                    <div className="mt-5 rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4">
                      <h4 className="text-xs font-black uppercase tracking-wide text-[#588368]">Upload Document</h4>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <SelectField label="Document type" value={documentForm.documentTypeID} onChange={(value) => updateDocumentForm("documentTypeID", value)} options={profile.lookups.document_types} />
                        <Field label="Title" value={documentForm.title} onChange={(value) => updateDocumentForm("title", value)} />
                        <Field label="Existing document link" placeholder="Optional if file is uploaded" value={documentForm.filePath} onChange={(value) => updateDocumentForm("filePath", value)} wide />
                        <label className="block text-sm font-bold text-[#374151] md:col-span-2">
                          Upload file
                          <input accept={selectedDocumentType?.allowed_content_types || undefined} className="mt-2 block w-full rounded-xl border border-dashed border-[#b9c8c0] bg-white px-4 py-3 text-sm font-semibold text-[#4b5563] file:mr-4 file:rounded-lg file:border-0 file:bg-[#588368] file:px-4 file:py-2 file:text-sm file:font-black file:text-white" onChange={(event) => void handleDocumentFile(event.target.files?.[0])} type="file" />
                        </label>
                      </div>
                      {selectedDocumentType ? <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#6b7280]">Allowed: {selectedDocumentType.allowed_content_types || "standard HR document types"} · Max {Math.round((selectedDocumentType.max_file_size_bytes || 10485760) / 1024 / 1024)} MB</p> : null}
                      {documentForm.fileName ? <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#588368]">Selected: {documentForm.fileName}</p> : null}
                      <button className="mt-4 rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={savingDocument} onClick={() => void saveDocument()} type="button">{savingDocument ? "Saving..." : "Save Document"}</button>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {profile.documents.map((document) => (
                        <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={document.id}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-wide text-[#588368]">{document.document_type_name || "Document"}</p>
                              <h4 className="mt-1 font-black text-[#111827]">{document.title || "Untitled document"}</h4>
                              <p className="mt-2 truncate rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#6b7280]">{document.original_file_name || document.file_path || "No file attached"}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-black ${document.status === "approved" ? "bg-[#ecfdf3] text-[#16803c]" : document.status === "rejected" ? "bg-red-50 text-red-700" : "bg-[#fef3c7] text-[#92400e]"}`}>{documentStatusLabels[document.status || "pending_review"] || "Pending Review"}</span>
                              <button className="rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-3 py-2 text-xs font-black text-[#16803c] hover:bg-[#ecfdf3] disabled:opacity-60" disabled={savingDocument} onClick={() => void reviewDocument(document.id, "approved")} type="button">Approve</button>
                              <button className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-black text-[#92400e] hover:bg-[#fef3c7] disabled:opacity-60" disabled={savingDocument} onClick={() => void reviewDocument(document.id, "resubmission_requested")} type="button">Ask Again</button>
                              <button className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={savingDocument} onClick={() => void deleteDocument(document.id)} type="button">Remove</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {profile.documents.length === 0 ? <EmptyText text="No documents added yet." /> : null}
                    </div>
                  </section>
                ) : null}

                {activeEditTab === "roles" ? (
                  <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Tenant Roles</h3>
                        <p className="mt-1 text-sm font-semibold text-[#6b7280]">These roles control access through identity. Platform roles and applicant roles are not assignable here.</p>
                      </div>
                      <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{selectedRoleIDs.length} selected</span>
                    </div>
                    {rolesError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{rolesError}</p> : null}
                    {rolesLoading ? <p className="mt-4 rounded-xl bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#6b7280]">Loading tenant roles...</p> : null}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {tenantRoles.map((role) => {
                        const checked = selectedRoleIDs.includes(role.id);
                        return (
                          <label className={`rounded-2xl border p-4 ${checked ? "border-[#588368] bg-[#eef4f1]" : "border-[#edf1ef] bg-[#f8faf9]"}`} key={role.id}>
                            <span className="flex items-start gap-3">
                              <input checked={checked} className="mt-1 h-5 w-5 accent-[#588368]" onChange={(event) => toggleSelectedRole(role.id, event.target.checked)} type="checkbox" />
                              <span>
                                <span className="block text-sm font-black text-[#111827]">{roleName(role)}</span>
                                <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{roleCode(role) || "CUSTOM_ROLE"}</span>
                                {role.description ? <span className="mt-2 block text-xs font-semibold leading-5 text-[#6b7280]">{role.description}</span> : null}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {!rolesLoading && tenantRoles.length === 0 ? <EmptyText text="No tenant roles are available for this employee." /> : null}
                    <div className="mt-5 flex flex-wrap gap-3 border-t border-[#edf1ef] pt-5">
                      <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={rolesSaving || rolesLoading || tenantRoles.length === 0} onClick={() => void saveRoleAssignments()} type="button">{rolesSaving ? "Saving roles..." : "Save Role Assignments"}</button>
                      <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" disabled={rolesSaving} onClick={() => setSelectedRoleIDs(assignedRoles.filter((role) => tenantRoles.some((tenantRole) => tenantRole.id === role.id)).map((role) => role.id))} type="button">Reset Roles</button>
                    </div>
                  </section>
                ) : null}

                {activeEditTab !== "roles" ? (
                  <div className="flex gap-3">
                    <button className="rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : "Save Changes"}</button>
                    <button className="rounded-xl border border-[#dbe0e5] px-5 py-3 text-sm font-black text-[#374151]" onClick={() => setEditForm(profileToEditForm(profile))} type="button">Reset</button>
                  </div>
                ) : null}
              </form>
            </HrmsModal>
          ) : null}

          <ProfilePanel title="About Employee">
            <p className="text-sm leading-6 text-[#6b7280]">{fullName(employee)} is assigned to {employee.department_name || "an unassigned department"} as {employee.designation_name || employee.role || "an employee"}. Profile details are sourced from HRMS employee, bank, statutory, and document records.</p>
          </ProfilePanel>

          <ProfilePanel title="Login Recovery">
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div className="space-y-3">
                <button className="w-full rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#1f2937] disabled:opacity-60" disabled={credentialSaving || !employee.email} onClick={() => void resendCredentials()} type="button">Resend Credentials</button>
                <form className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4" onSubmit={resetTemporaryPassword}>
                  <Field label="Temporary password" required type="password" value={temporaryPassword} onChange={setTemporaryPassword} />
                  <button className="mt-3 w-full rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={credentialSaving || temporaryPassword.trim().length < 8} type="submit">{credentialSaving ? "Processing..." : "Reset Access"}</button>
                </form>
                {!employee.email ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Add an employee email before sending credential recovery.</p> : null}
              </div>
              <div className="rounded-2xl border border-[#edf1ef] bg-white">
                <div className="border-b border-[#edf1ef] px-4 py-3">
                  <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Recent Delivery Events</h3>
                </div>
                {credentialEvents.length ? (
                  <div className="divide-y divide-[#edf1ef]">
                    {credentialEvents.map((event) => (
                      <div className="p-4" key={event.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-[#111827]">{event.event_type === "reset_temporary_password" ? "Temporary password reset" : "Credential resend"}</p>
                            <p className="mt-1 text-xs font-semibold text-[#6b7280]">{event.delivery_channel} to {event.delivery_target || "-"}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${event.status === "sent" ? "bg-[#ecfdf3] text-[#16803c]" : "bg-red-50 text-red-700"}`}>{event.status}</span>
                        </div>
                        {event.failure_reason ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{event.failure_reason}</p> : null}
                        <p className="mt-2 text-xs font-bold text-[#9ca3af]">{displayDateTime(event.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : <EmptyText text="No credential delivery events recorded yet." />}
              </div>
            </div>
          </ProfilePanel>

          <ProfilePanel title="Onboarding Status">
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryItem label="Status" value={onboardingStatusLabels[onboarding.status] || onboarding.status} />
              <SummaryItem label="Required Uploaded" value={`${onboarding.uploaded_required_documents}/${onboarding.required_documents}`} />
              <SummaryItem label="Required Approved" value={`${onboarding.approved_required_documents}/${onboarding.required_documents}`} />
              <SummaryItem label="Pending Review" value={String(onboarding.pending_review_documents)} />
            </div>
            {onboarding.missing_required_documents.length ? <p className="mt-4 rounded-xl bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#92400e]">Missing required documents: {onboarding.missing_required_documents.join(", ")}</p> : null}
            {onboarding.is_complete ? <p className="mt-4 rounded-xl bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">All required documents are uploaded and approved.</p> : null}
          </ProfilePanel>

          <ProfilePanel title="Bank Information">
            {primaryBank ? <div className="grid gap-4 md:grid-cols-4"><SummaryItem label="Bank Name" value={primaryBank.bank_name || "-"} /><SummaryItem label="Account No" value={primaryBank.account_number || "-"} /><SummaryItem label="IFSC Code" value={primaryBank.ifsc_code || "-"} /><SummaryItem label="Branch" value={primaryBank.branch_name || "-"} /></div> : <EmptyText text="No bank information added yet." />}
          </ProfilePanel>

          <ProfilePanel title="Statutory Information">
            {statutory ? <div className="grid gap-4 md:grid-cols-3"><SummaryItem label="PAN" value={statutory.pan || "-"} /><SummaryItem label="Aadhaar" value={statutory.aadhaar || "-"} /><SummaryItem label="UAN" value={statutory.uan_no || "-"} /><SummaryItem label="PF No" value={statutory.pf_no || "-"} /><SummaryItem label="ESIC No" value={statutory.esic_no || "-"} /><SummaryItem label="Flags" value={[statutory.pf_applicable ? "PF" : "", statutory.esic_applicable ? "ESIC" : "", statutory.pt_applicable ? "PT" : "", statutory.lwf_applicable ? "LWF" : ""].filter(Boolean).join(", ") || "-"} /></div> : <EmptyText text="No statutory information added yet." />}
          </ProfilePanel>

          <ProfilePanel title="Documents">
            <div className="grid gap-8">
              <div className="space-y-4">
                <form className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-4" onSubmit={saveDocument}>
                  <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Upload Document</h3>
                  <div className="mt-4 space-y-4">
                    <SelectField label="Document type" value={documentForm.documentTypeID} onChange={(value) => updateDocumentForm("documentTypeID", value)} options={profile.lookups.document_types} />
                    <Field label="Title" value={documentForm.title} onChange={(value) => updateDocumentForm("title", value)} />
                    <Field label="Existing document link" placeholder="Optional if file is uploaded" value={documentForm.filePath} onChange={(value) => updateDocumentForm("filePath", value)} />
                    <label className="block text-sm font-bold text-[#374151]">
                      Upload file
                      <input accept={selectedDocumentType?.allowed_content_types || undefined} className="mt-2 block w-full rounded-xl border border-dashed border-[#b9c8c0] bg-white px-4 py-3 text-sm font-semibold text-[#4b5563] file:mr-4 file:rounded-lg file:border-0 file:bg-[#588368] file:px-4 file:py-2 file:text-sm file:font-black file:text-white" onChange={(event) => void handleDocumentFile(event.target.files?.[0])} type="file" />
                    </label>
                    {selectedDocumentType ? <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#6b7280]">Allowed: {selectedDocumentType.allowed_content_types || "standard HR document types"} · Max {Math.round((selectedDocumentType.max_file_size_bytes || 10485760) / 1024 / 1024)} MB</p> : null}
                    {documentForm.fileName ? <p className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#588368]">Selected: {documentForm.fileName}</p> : null}
                    <button className="w-full rounded-xl bg-[#111827] px-5 py-3 text-sm font-black text-white hover:bg-[#1f2937] disabled:opacity-60" disabled={savingDocument} type="submit">{savingDocument ? "Saving..." : "Save Document"}</button>
                  </div>
                </form>
                <form className="rounded-2xl border border-[#edf1ef] bg-white p-4" onSubmit={saveDocumentType}>
                  <h3 className="text-sm font-black uppercase tracking-wide text-[#588368]">Document Types</h3>
                  <div className="mt-4 flex gap-2">
                    <input className="h-11 min-w-0 flex-1 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368]" onChange={(event) => setDocumentTypeName(event.target.value)} placeholder="e.g. Passport, PAN, Contract" value={documentTypeName} />
                    <button className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={savingDocumentType} type="submit">Add</button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.lookups.document_types.map((item) => <button className="rounded-full border border-[#dbe0e5] bg-[#f8faf9] px-3 py-2 text-xs font-black text-[#374151] hover:border-red-200 hover:bg-red-50 hover:text-red-700" disabled={savingDocumentType} key={item.id} onClick={() => void deleteDocumentType(item.id)} type="button">{optionLabel(item)} x</button>)}
                    {profile.lookups.document_types.length === 0 ? <p className="text-sm font-semibold text-[#6b7280]">No document types yet.</p> : null}
                  </div>
                </form>
              </div>
              <div>
                {profile.documents.length ? (
                  <div className="grid gap-3">
                    {profile.documents.map((document) => (
                      <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={document.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-wide text-[#588368]">{document.document_type_name || "Document"}</p>
                            <h3 className="mt-1 font-black text-[#111827]">{document.title || "Untitled document"}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-black ${document.status === "approved" ? "bg-[#ecfdf3] text-[#16803c]" : document.status === "rejected" ? "bg-red-50 text-red-700" : "bg-[#fef3c7] text-[#92400e]"}`}>{documentStatusLabels[document.status || "pending_review"] || "Pending Review"}</span>
                              {document.encrypted ? <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">Encrypted</span> : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button className="rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-3 py-2 text-xs font-black text-[#16803c] hover:bg-[#ecfdf3] disabled:opacity-60" disabled={savingDocument} onClick={() => void reviewDocument(document.id, "approved")} type="button">Approve</button>
                            <button className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-black text-[#92400e] hover:bg-[#fef3c7] disabled:opacity-60" disabled={savingDocument} onClick={() => void reviewDocument(document.id, "resubmission_requested")} type="button">Ask Again</button>
                            <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-60" disabled={savingDocument} onClick={() => void reviewDocument(document.id, "rejected")} type="button">Reject</button>
                            <button className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={savingDocument} onClick={() => void deleteDocument(document.id)} type="button">Remove</button>
                          </div>
                        </div>
                        <p className="mt-3 truncate rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#6b7280]">{document.original_file_name || document.file_path || "No document attached"}</p>
                        {document.review_remarks ? <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#92400e]">Remarks: {document.review_remarks}</p> : null}
                        <p className="mt-2 text-xs font-bold text-[#9ca3af]">{displayDate(document.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : <EmptyText text="No documents added yet." />}
              </div>
            </div>
          </ProfilePanel>

          <ProfilePanel title="Setup Lookups">
            <div className="grid gap-4 md:grid-cols-5">
              <SummaryItem label="Branches" value={String(profile.lookups.branches.length)} />
              <SummaryItem label="Departments" value={String(profile.lookups.departments.length)} />
              <SummaryItem label="Designations" value={String(profile.lookups.designations.length)} />
              <SummaryItem label="Employment Types" value={String(profile.lookups.employment_types.length)} />
              <SummaryItem label="Document Types" value={String(profile.lookups.document_types.length)} />
            </div>
          </ProfilePanel>
        </main>
      </div>
    </div>
  );
}

export function EmployeeSelfOnboardingSection() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [documentForm, setDocumentForm] = useState<EmployeeDocumentForm>(emptyDocumentForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfile(await apiRequest<EmployeeProfile>("/hrms/employees/me"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load onboarding profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadProfile, 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  function updateDocumentForm<K extends keyof EmployeeDocumentForm>(key: K, value: EmployeeDocumentForm[K]) {
    setDocumentForm((current) => ({ ...current, [key]: value }));
  }

  async function handleDocumentFile(file: File | undefined) {
    if (!file) {
      setDocumentForm((current) => ({ ...current, fileName: "", fileContentType: "", fileContentBase64: "" }));
      return;
    }
    try {
      const content = await readFileAsBase64(file);
      setDocumentForm((current) => ({ ...current, fileName: file.name, fileContentType: file.type || "application/octet-stream", fileContentBase64: content }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read selected file.");
    }
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest<EmployeeDocument>("/hrms/employees/me/documents", {
        method: "POST",
        body: {
          document_type_id: documentForm.documentTypeID || null,
          title: optionalString(documentForm.title),
          file_name: documentForm.fileName,
          file_content_type: documentForm.fileContentType,
          file_content_base64: documentForm.fileContentBase64,
        },
      });
      setDocumentForm(emptyDocumentForm);
      await loadProfile();
      setSuccess("Document uploaded for HR review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload document.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="px-4 py-8 lg:px-6"><p className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-center text-sm font-semibold text-[#6b7280]">Loading onboarding checklist...</p></div>;
  }
  if (error || !profile) {
    return <div className="px-4 py-8 lg:px-6"><p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error || "Onboarding profile not found."}</p></div>;
  }

  const onboarding = profile.onboarding || { status: "not_started", is_complete: false, required_documents: 0, uploaded_required_documents: 0, approved_required_documents: 0, pending_review_documents: 0, rejected_documents: 0, missing_required_documents: [] };
  const lockedDocumentTypes = approvedDocumentTypeIDs(profile.documents);
  const availableDocumentTypes = profile.lookups.document_types.filter((item) => !lockedDocumentTypes.has(item.id));
  const selectedDocumentType = availableDocumentTypes.find((item) => item.id === documentForm.documentTypeID);

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Employee Onboarding</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111827]">My Documents</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">Upload required onboarding documents. HR will approve them or request resubmission with remarks.</p>
      </div>
      {success ? <p className="mb-5 rounded-lg border border-[#ccebd8] bg-[#f4fbf8] px-4 py-3 text-sm font-semibold text-[#16803c]">{success}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <main className="space-y-5">
          <ProfilePanel title="Checklist Status">
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryItem label="Status" value={onboardingStatusLabels[onboarding.status] || onboarding.status} />
              <SummaryItem label="Uploaded" value={`${onboarding.uploaded_required_documents}/${onboarding.required_documents}`} />
              <SummaryItem label="Approved" value={`${onboarding.approved_required_documents}/${onboarding.required_documents}`} />
              <SummaryItem label="Pending Review" value={String(onboarding.pending_review_documents)} />
            </div>
            {onboarding.missing_required_documents.length ? <p className="mt-4 rounded-xl bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#92400e]">Missing: {onboarding.missing_required_documents.join(", ")}</p> : null}
          </ProfilePanel>

          <ProfilePanel title="Uploaded Documents">
            {profile.documents.length ? (
              <div className="grid gap-3">
                {profile.documents.map((document) => (
                  <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={document.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#588368]">{document.document_type_name || "Document"}</p>
                        <h3 className="mt-1 font-black text-[#111827]">{document.title || document.original_file_name || "Uploaded document"}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${document.status === "approved" ? "bg-[#ecfdf3] text-[#16803c]" : document.status === "rejected" || document.status === "resubmission_requested" ? "bg-red-50 text-red-700" : "bg-[#fef3c7] text-[#92400e]"}`}>{documentStatusLabels[document.status || "pending_review"] || "Pending Review"}</span>
                    </div>
                    {document.review_remarks ? <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#92400e]">HR remarks: {document.review_remarks}</p> : null}
                  </div>
                ))}
              </div>
            ) : <EmptyText text="No documents uploaded yet." />}
          </ProfilePanel>
        </main>

        <aside className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-[#111827]">Upload Document</h2>
          <form className="mt-5 space-y-4" onSubmit={saveDocument}>
            <SelectField label="Document type" value={documentForm.documentTypeID} onChange={(value) => updateDocumentForm("documentTypeID", value)} options={availableDocumentTypes} />
            <Field label="Title" value={documentForm.title} onChange={(value) => updateDocumentForm("title", value)} />
            <label className="block text-sm font-bold text-[#374151]">File<input accept={selectedDocumentType?.allowed_content_types || undefined} className="mt-2 block w-full rounded-xl border border-dashed border-[#b9c8c0] bg-white px-4 py-3 text-sm font-semibold text-[#4b5563] file:mr-4 file:rounded-lg file:border-0 file:bg-[#588368] file:px-4 file:py-2 file:text-sm file:font-black file:text-white" onChange={(event) => void handleDocumentFile(event.target.files?.[0])} type="file" /></label>
            {selectedDocumentType ? <p className="rounded-lg bg-[#f8faf9] px-3 py-2 text-xs font-semibold text-[#6b7280]">Allowed: {selectedDocumentType.allowed_content_types || "standard HR document types"} · Max {Math.round((selectedDocumentType.max_file_size_bytes || 10485760) / 1024 / 1024)} MB</p> : null}
            {availableDocumentTypes.length === 0 ? <p className="rounded-lg bg-[#ecfdf3] px-3 py-2 text-xs font-semibold text-[#16803c]">All approved document types are locked. Contact HR if a verified document must be changed.</p> : null}
            {documentForm.fileName ? <p className="rounded-lg bg-[#f4fbf8] px-3 py-2 text-xs font-bold text-[#588368]">Selected: {documentForm.fileName}</p> : null}
            <button className="w-full rounded-xl bg-[#588368] px-5 py-3 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60" disabled={saving || availableDocumentTypes.length === 0} type="submit">{saving ? "Uploading..." : "Upload for Review"}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function ProfilePanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#edf1ef] bg-white shadow-sm"><div className="border-b border-[#edf1ef] px-5 py-4"><h2 className="text-lg font-black text-[#111827]">{title}</h2></div><div className="p-5">{children}</div></section>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-[#9ca3af]">{label}</p><p className="mt-1 break-words text-sm font-black text-[#111827]">{value}</p></div>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-xl bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#6b7280]">{text}</p>;
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "dark" | "green" | "red" | "blue" }) {
  const tones = { dark: "bg-[#111827]", green: "bg-[#16a34a]", red: "bg-[#ef4444]", blue: "bg-[#3b82f6]" };
  return <div className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><span className={`flex size-12 items-center justify-center rounded-full text-lg font-black text-white ${tones[tone]}`}>{value}</span><div><p className="text-xs font-bold text-[#6b7280]">{label}</p><h3 className="text-2xl font-black text-[#111827]">{value}</h3></div></div></div>;
}

function EmployeeTable({
  employees,
  loading,
  onDeactivate,
  onOpen,
}: {
  employees: EmployeeRow[];
  loading: boolean;
  onDeactivate: (employee: EmployeeRow) => void;
  onOpen: (employeeID: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-left">
        <thead className="bg-[#f3f5f4] text-xs font-black uppercase tracking-wide text-[#4b5563]">
          <tr>
            <th className="px-5 py-4">Emp ID</th>
            <th className="px-5 py-4">Name</th>
            <th className="px-5 py-4">Email</th>
            <th className="px-5 py-4">Phone</th>
            <th className="px-5 py-4">Designation</th>
            <th className="px-5 py-4">Joining Date</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1ef] bg-white">
          {loading ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={8}>Loading employees...</td></tr> : null}
          {!loading && employees.length === 0 ? <tr><td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={8}>No employees found.</td></tr> : null}
          {!loading && employees.map((employee) => (
            <tr className="hover:bg-[#f8faf9]" key={employee.id}>
              <td className="px-5 py-4 text-sm font-black text-[#111827]">{employee.employee_code || "-"}</td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#eef4f1] text-sm font-black text-[#588368]">{initials(employee)}</span>
                  <div>
                    <strong className="block text-sm text-[#111827]">{fullName(employee)}</strong>
                    <span className="text-xs font-semibold text-[#6b7280]">{employee.department_name || "No department"}</span>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-[#4b5563]">{employee.email || "-"}</td>
              <td className="px-5 py-4 text-sm text-[#4b5563]">{employee.mobile || "-"}</td>
              <td className="px-5 py-4 text-sm font-semibold text-[#111827]">{employee.designation_name || "-"}</td>
              <td className="px-5 py-4 text-sm text-[#4b5563]">{displayDate(employee.joining_date)}</td>
              <td className="px-5 py-4"><span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-black text-[#16803c]">Active</span></td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-black text-[#374151] hover:border-[#588368] hover:text-[#588368]" onClick={() => onOpen(employee.id)} type="button">Profile</button>
                  <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100" onClick={() => onDeactivate(employee)} type="button">Emergency Deactivate</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeGrid({
  employees,
  loading,
  onDeactivate,
  onOpen,
}: {
  employees: EmployeeRow[];
  loading: boolean;
  onDeactivate: (employee: EmployeeRow) => void;
  onOpen: (employeeID: string) => void;
}) {
  if (loading) return <p className="p-8 text-center text-sm font-semibold text-[#6b7280]">Loading employees...</p>;
  if (employees.length === 0) return <p className="p-8 text-center text-sm font-semibold text-[#6b7280]">No employees found.</p>;
  return (
    <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
      {employees.map((employee) => (
        <article className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md" key={employee.id}>
          <div className="flex justify-center"><span className="relative flex size-16 items-center justify-center rounded-full border-4 border-[#dcece2] bg-[#588368] text-xl font-black text-white after:absolute after:bottom-0 after:right-1 after:size-3 after:rounded-full after:border-2 after:border-white after:bg-[#16a34a]">{initials(employee)}</span></div>
          <div className="mt-4 text-center"><h3 className="text-base font-black text-[#111827]">{fullName(employee)}</h3><p className="mt-1 text-xs font-bold text-[#6b7280]">Employee ID: {employee.employee_code || "-"}</p></div>
          <dl className="mt-5 space-y-3 text-sm"><InfoRow label="Designation" value={employee.designation_name || "-"} /><InfoRow label="Department" value={employee.department_name || "-"} /><InfoRow label="Branch" value={employee.branch_name || "-"} /><InfoRow label="Email" value={employee.email || "-"} /><InfoRow label="Joined" value={displayDate(employee.joining_date)} /></dl>
          <div className="mt-5 grid gap-2">
            <button className="w-full rounded-xl bg-[#111827] px-4 py-3 text-sm font-black text-white hover:bg-[#1f2937]" onClick={() => onOpen(employee.id)} type="button">View Profile</button>
            <button className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100" onClick={() => onDeactivate(employee)} type="button">Emergency Deactivate</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-xs font-bold uppercase tracking-wide text-[#9ca3af]">{label}</dt><dd className="truncate text-right font-semibold text-[#374151]">{value}</dd></div>;
}

function Field({ error, label, value, onChange, type = "text", required = false, placeholder, wide = false }: { error?: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; wide?: boolean }) {
  return (
    <label className={`block text-sm font-bold text-[#374151] ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <input
        aria-invalid={Boolean(error)}
        className={`mt-2 h-11 w-full rounded-xl border px-4 font-normal outline-none focus:border-[#588368] ${error ? "border-red-300 bg-red-50/50" : "border-[#dbe0e5]"}`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {error ? <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-bold text-[#374151]"><input className="size-4 rounded border-[#dbe0e5] text-[#588368]" checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}

function SelectField({ error, label, value, onChange, options }: { error?: string; label: string; value: string; onChange: (value: string) => void; options: SetupOption[] }) {
  return (
    <label className="block text-sm font-bold text-[#374151]">
      {label}
      <select aria-invalid={Boolean(error)} className={`mt-2 h-11 w-full rounded-xl border bg-white px-4 font-normal outline-none focus:border-[#588368] ${error ? "border-red-300 bg-red-50/50" : "border-[#dbe0e5]"}`} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Not assigned</option>
        {options.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
      </select>
      {error ? <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}
