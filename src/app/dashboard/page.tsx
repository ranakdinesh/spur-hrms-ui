"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  Eye,
  Headphones,
  Home,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  Mail,
  Menu,
  PackageCheck,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCog,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import { ApiRequestError, apiRequest } from "@/lib/api";
import { DEFAULT_TENANT_BRANDING, type TenantBranding, useTenantBranding } from "@/lib/tenant-branding";
import { clearAuthSession, isAuthenticated } from "@/lib/auth";
import { getTenantBaseDomain, tenantHost, TENANT_BASE_DOMAIN } from "@/lib/tenant-domain";
import { validateTenantSubdomain } from "@/lib/tenant-subdomain-validation";
import { asset } from "@/lib/site-data";
import { AgreementsSection } from "@/components/hrms/AgreementsSection";
import { ApplicantPortalSection } from "@/components/hrms/ApplicantPortalSection";
import { AssetAccessLifecycleSection } from "@/components/hrms/AssetAccessLifecycleSection";
import { AttendanceLeavePolicySetupSection } from "@/components/hrms/AttendanceLeavePolicySetupSection";
import { AttendanceSection } from "@/components/hrms/AttendanceSection";
import { BenefitsClaimsSection } from "@/components/hrms/BenefitsClaimsSection";
import { BranchesSection, type BranchTenantOption } from "@/components/hrms/BranchesSection";
import { CandidateApplicationsSection } from "@/components/hrms/CandidateApplicationsSection";
import { CandidateOnboardingProgressSection } from "@/components/hrms/CandidateOnboardingProgressSection";
import { CandidatesSection } from "@/components/hrms/CandidatesSection";
import { CelebrationsSection } from "@/components/hrms/CelebrationsSection";
import { CelebrationJobsSection } from "@/components/hrms/CelebrationJobsSection";
import { CelebrationTypesSection } from "@/components/hrms/CelebrationTypesSection";
import { CommunicationProviderSettingsSection } from "@/components/hrms/CommunicationProviderSettingsSection";
import { CompensationReviewSection } from "@/components/hrms/CompensationReviewSection";
import { ComplianceSection } from "@/components/hrms/ComplianceSection";
import { SuccessionPlanningSection } from "@/components/hrms/SuccessionPlanningSection";
import { DepartmentsSection } from "@/components/hrms/DepartmentsSection";
import { DesignationsSection } from "@/components/hrms/DesignationsSection";
import { DocumentSignSection } from "@/components/hrms/DocumentSignSection";
import { EngagementsSection } from "@/components/hrms/EngagementsSection";
import { ProjectsSection } from "@/components/hrms/ProjectsSection";
import { WorkforceHubSection } from "@/components/hrms/WorkforceHubSection";
import { WorkforceTypesSection } from "@/components/hrms/WorkforceTypesSection";
import { WorkLogsSection } from "@/components/hrms/WorkLogsSection";
import { DocumentRequirementsSection } from "@/components/hrms/DocumentRequirementsSection";
import { EmployeeDashboardSection } from "@/components/hrms/EmployeeDashboardSection";
import { EmployeeExitsSection } from "@/components/hrms/EmployeeExitsSection";
import { EmployeeLettersSection } from "@/components/hrms/EmployeeLettersSection";
import { EmployeeRelationsSection } from "@/components/hrms/EmployeeRelationsSection";
import { EmploymentLookupsSection } from "@/components/hrms/EmploymentLookupsSection";
import { EmployeesSection, EmployeeSelfOnboardingSection } from "@/components/hrms/EmployeesSection";
import { EmployeeSalarySection } from "@/components/hrms/EmployeeSalarySection";
import { FinancialYearsSection } from "@/components/hrms/FinancialYearsSection";
import { FlexiblePayrollSection } from "@/components/hrms/FlexiblePayrollSection";
import { HolidaysSection } from "@/components/hrms/HolidaysSection";
import { HRCommandCenterSection } from "@/components/hrms/HRCommandCenterSection";
import { HRDashboardSection } from "@/components/hrms/HRDashboardSection";
import { HRCaseManagementSection } from "@/components/hrms/HRCaseManagementSection";
import { InsightsSection } from "@/components/hrms/InsightsSection";
import { InterviewRoundsSection } from "@/components/hrms/InterviewRoundsSection";
import { JobPostingsSection } from "@/components/hrms/JobPostingsSection";
import { JobPositionsSection } from "@/components/hrms/JobPositionsSection";
import { JobRequisitionsSection } from "@/components/hrms/JobRequisitionsSection";
import { LeavePoliciesSection } from "@/components/hrms/LeavePoliciesSection";
import { EmployeeLeavesSection } from "@/components/hrms/EmployeeLeavesSection";
import { LeaveApprovalsSection } from "@/components/hrms/LeaveApprovalsSection";
import { LeaveApprovalWorkflowsSection } from "@/components/hrms/LeaveApprovalWorkflowsSection";
import { LeaveFoundationSection } from "@/components/hrms/LeaveFoundationSection";
import { LeaveReportsSection } from "@/components/hrms/LeaveReportsSection";
import { LeaveTypesSection } from "@/components/hrms/LeaveTypesSection";
import { LearningSection } from "@/components/hrms/LearningSection";
import { NotificationCenterSection } from "@/components/hrms/NotificationCenterSection";
import { NotificationInboxSection } from "@/components/hrms/NotificationInboxSection";
import { NotificationSettingsSection } from "@/components/hrms/NotificationSettingsSection";
import { OKRSection } from "@/components/hrms/OKRSection";
import { OfferLettersSection } from "@/components/hrms/OfferLettersSection";
import { OnboardingWorkflowsSection } from "@/components/hrms/OnboardingWorkflowsSection";
import { OperationsWorkbenchSection } from "@/components/hrms/OperationsWorkbenchSection";
import { PayrollOperationsSection } from "@/components/hrms/PayrollOperationsSection";
import { PayrollSettingsSection } from "@/components/hrms/PayrollSettingsSection";
import { PayslipsSection } from "@/components/hrms/PayslipsSection";
import { PerformanceSection } from "@/components/hrms/PerformanceSection";
import { PeopleAnalyticsSection } from "@/components/hrms/PeopleAnalyticsSection";
import { PoliciesSection } from "@/components/hrms/PoliciesSection";
import { PrivacyEcosystemSection } from "@/components/hrms/PrivacyEcosystemSection";
import { PushProviderSettingsSection } from "@/components/hrms/PushProviderSettingsSection";
import { ReportsSection } from "@/components/hrms/ReportsSection";
import { SalaryTemplatesSection } from "@/components/hrms/SalaryTemplatesSection";
import { ShiftSchedulingSection } from "@/components/hrms/ShiftSchedulingSection";
import { SkillGapsSection } from "@/components/hrms/SkillGapsSection";
import { SkillsSection } from "@/components/hrms/SkillsSection";
import { StorageProviderSettingsSection } from "@/components/hrms/StorageProviderSettingsSection";
import { SubscriptionPlansSection } from "@/components/hrms/SubscriptionPlansSection";
import { SubscriptionsSection } from "@/components/hrms/SubscriptionsSection";
import { TalentMarketplaceSection } from "@/components/hrms/TalentMarketplaceSection";
import { TenantOperationsGovernanceSection } from "@/components/hrms/TenantOperationsGovernanceSection";
import { UnifiedInboxSection } from "@/components/hrms/UnifiedInboxSection";
import { WellbeingSection } from "@/components/hrms/WellbeingSection";
import { WorkingHoursSection } from "@/components/hrms/WorkingHoursSection";
import { WorkflowInboxSection } from "@/components/hrms/WorkflowInboxSection";

type NavItem = {
  icon: ReactNode;
  label: string;
  permission: string;
  active?: boolean;
  badge?: string;
  children?: Array<{
    label: string;
    permission: string;
    href?: string;
  }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type IdentityTenant = {
  id: string;
  name: string;
  kind: "ops" | "customer" | string;
  subdomain?: string | null;
  display_name?: string | null;
  trial_ends_at?: string | null;
  subscription_plan?: string | null;
  admin_user_id?: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
  admin_mobile?: string | null;
  created_at: string;
  updated_at: string;
};

type TenantRow = {
	id: string;
	name: string;
	code: string;
	kind: string;
	subdomain: string;
	subdomainUrl: string;
	admin: string;
	users: string;
  status: "Active" | "Inactive" | "Pending" | "Ops";
  plan: string;
  joined: string;
  createdAt: string;
  trialEndsAt: string;
};

type TenantCatalogPlan = {
  id: string;
  code: string;
  name: string;
  price_amount: number;
  price_basis: string;
  minimum_amount: number;
  included_employees: number;
  overage_amount: number;
  currency_code: string;
  billing_cycle: string;
  employee_limit: number;
  trial_days: number;
  visibility: string;
  is_active: boolean;
};

type MasterCountry = {
  code: string;
  name: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  flag_emoji: string;
  default_timezone_id?: string | null;
};

type MasterTimezone = {
  id: string;
  display_name: string;
  region: string;
  utc_offset_minutes: number;
  utc_offset: string;
};

type TenantSubscriptionRecord = {
  id: string;
  tenant_id: string;
  plan_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  max_employees: number;
};

type AssistedTenantProvisionResponse = {
  tenant_id: string;
  tenant_name: string;
  subdomain: string;
  tenant_url: string;
  admin_user_id: string;
  admin_email: string;
  subscription_id: string;
  plan_code: string;
  trial_ends_at?: string | null;
  provisioning_status: string;
  invite_status: "sent" | "not_sent" | "not_available" | string;
};

type SignupIntent = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  company_name: string;
  subdomain: string;
  tenant_url: string;
  country: string;
  timezone: string;
  trial_days: number;
  status: "pending_email_verification" | "email_verified" | "provisioned" | "expired" | "cancelled" | string;
  email_token_expired: boolean;
  verification_sent_at: string;
  email_verified_at?: string | null;
  expires_at: string;
  provisioned_tenant_id?: string | null;
  provisioned_user_id?: string | null;
  provisioned_subscription_id?: string | null;
  created_at: string;
  updated_at: string;
};

type SignupIntentEditForm = {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  company_name: string;
  subdomain: string;
  country: string;
  timezone: string;
  trial_days: string;
};

type AssistedTenantWizardForm = {
  company_name: string;
  legal_name: string;
  subdomain: string;
  employee_estimate: string;
  country: string;
  timezone: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_mobile: string;
  send_invite: boolean;
  use_temporary_password: boolean;
  temporary_password: string;
  plan_id: string;
  trial_days: string;
  billing_mode: "manual_billing";
  payment_method_status: "manual_billing";
};

type AssistedTenantWizardField = keyof AssistedTenantWizardForm;

type AssistedTenantWizardErrors = Partial<Record<AssistedTenantWizardField, string>>;

type IdentityPermission = {
  id: string;
  module: string;
  key: string;
  description?: string;
};

type IdentityRole = {
  id: string;
  tenant_id: string;
  tenantId?: string;
  tenant_kind?: string;
  tenantKind?: string;
  name: string;
  code?: string;
  description?: string;
  is_system?: boolean;
  created_at?: string;
};

type IdentityUser = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  is_active: boolean;
  is_locked?: boolean;
  is_super_admin?: boolean;
  email_verified_at?: string | null;
  created_at?: string;
};

type UserRoleMap = Record<string, IdentityRole[]>;

type CurrentUser = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_super_admin: boolean;
  roles?: string[];
  permissions?: string[];
};

type TenantProfile = {
  tenant_id: string;
  subdomain: string;
  mobile_activation_code: string;
  display_name?: string | null;
  logo_object_key?: string | null;
};

type ActiveSection = "superadmin-dashboard" | "tenants" | "signup-requests" | "tenant-operations" | "users" | "roles" | "employee-dashboard" | "applicant-portal" | "inbox" | "completed" | "hr-command-center" | "hr-dashboard" | "operations-workbench" | "workflow-inbox" | "hr-helpdesk" | "employee-relations" | "notification-inbox" | "job-positions" | "career-site" | "job-requisitions" | "job-postings" | "candidates" | "candidate-applications" | "interview-rounds" | "offer-letters" | "onboarding-workflows" | "candidate-onboarding" | "celebrations" | "celebration-jobs" | "employees" | "workforce-hub" | "engagements" | "projects" | "work-logs" | "compliance" | "skills" | "skill-gaps" | "learning" | "talent-marketplace" | "succession-planning" | "asset-access" | "okrs" | "performance" | "wellbeing" | "people-analytics" | "privacy-ecosystem" | "employee-letters" | "agreements" | "document-sign" | "employee-exits" | "my-onboarding" | "portal-branding" | "branches" | "departments" | "designations" | "workforce-types" | "document-requirements" | "lookups" | "celebration-types" | "notification-settings" | "notification-center" | "communication-providers" | "storage-providers" | "push-providers" | "financial-years" | "working-hours" | "holidays" | "leave-types" | "leave-policies" | "attendance-leave-policies" | "payroll-settings" | "payroll-operations" | "flexible-payroll" | "compensation-review" | "salary-templates" | "employee-salary" | "payslips" | "benefits-claims" | "leaves" | "leave-approvals" | "leave-reports" | "reports" | "insights" | "attendance" | "shift-scheduling" | "policies" | "subscription-plans" | "subscriptions";

// MVP navigation intentionally hides implemented advanced modules. This is product navigation only;
// backend authorization and future module entitlements must remain enforced outside this menu config.
const navGroups: NavGroup[] = [
  {
    title: "Main Menu",
    items: [
      {
        icon: <LayoutDashboard className="h-4 w-4" />,
        label: "Platform Dashboard",
        permission: "superadmin.tenants",
      },
      {
        icon: <Building2 className="h-4 w-4" />,
        label: "Tenants",
        permission: "superadmin.tenants",
      },
      {
        icon: <ClipboardCheck className="h-4 w-4" />,
        label: "Signup Requests",
        permission: "superadmin.tenants",
      },
      {
        icon: <IndianRupee className="h-4 w-4" />,
        label: "Plans",
        permission: "superadmin.billing.plans",
      },
      {
        icon: <CreditCard className="h-4 w-4" />,
        label: "Subscriptions",
        permission: "superadmin.billing.subscriptions",
      },
      {
        icon: <Headphones className="h-4 w-4" />,
        label: "Tenant Support",
        permission: "superadmin.tenants",
      },
      {
        icon: <ShieldCheck className="h-4 w-4" />,
        label: "Access & Roles",
        permission: "identity.roles.list",
        children: [
          { label: "Platform Users", permission: "identity.users.list" },
          { label: "Platform Roles", permission: "identity.roles.list" },
        ],
      },
    ],
  },
];

const tenantAdminHrNavItems: NavItem[] = [
  {
    icon: "◈",
    label: "Command Center",
    permission: "hrms.dashboard.hr.view",
  },
  {
    icon: "▣",
    label: "Workbench",
    permission: "hrms.dashboard.employee.view",
    children: [
      { label: "Inbox", permission: "hrms.dashboard.employee.view" },
      { label: "Completed", permission: "hrms.dashboard.employee.view" },
    ],
  },
  {
    icon: "☷",
    label: "Employees",
    permission: "hrms.employees.list",
  },
  {
    icon: "◷",
    label: "Attendance",
    permission: "hrms.attendance.check_in",
  },
  {
    icon: "◱",
    label: "Leave",
    permission: "hrms.leaves.apply",
    children: [
      { label: "Leave", permission: "hrms.leaves.apply" },
      { label: "Leave Approvals", permission: "hrms.leaves.approve" },
      { label: "Leave Settings", permission: "hrms.leave_policies.list" },
      { label: "Leave Reports", permission: "hrms.leaves.report" },
    ],
  },
  {
    icon: "₹",
    label: "Payroll",
    permission: "hrms.salary_slips.list",
    children: [
      { label: "Payroll Operations", permission: "hrms.payroll_imports.list" },
      { label: "Salary Templates", permission: "hrms.salary_templates.list" },
      { label: "Employee Salary", permission: "hrms.employee_salaries.list" },
      { label: "Payslips", permission: "hrms.salary_slips.list" },
      { label: "Payroll Settings", permission: "hrms.pay_cycles.view" },
    ],
  },
  {
    icon: "▧",
    label: "Hiring",
    permission: "hrms.job_positions.list",
    children: [
      { label: "Career Site", permission: "hrms.tenant_settings.update" },
      { label: "Job Positions", permission: "hrms.job_positions.list" },
      { label: "Job Requisitions", permission: "hrms.job_requisitions.list" },
      { label: "Job Postings", permission: "hrms.job_postings.list" },
      { label: "Candidates", permission: "hrms.candidates.list" },
      { label: "Applications", permission: "hrms.candidate_applications.list" },
      { label: "Interviews", permission: "hrms.interview_rounds.list" },
      { label: "Offers", permission: "hrms.offer_letters.list" },
    ],
  },
  {
    icon: "▥",
    label: "Onboarding",
    permission: "hrms.onboarding.list",
    children: [
      { label: "Onboarding Flows", permission: "hrms.onboarding_workflows.manage" },
      { label: "Candidate Onboarding", permission: "hrms.onboarding.list" },
    ],
  },
  {
    icon: "□",
    label: "Documents",
    permission: "hrms.employees.documents.manage",
    children: [
      { label: "Document Requirements", permission: "hrms.employees.documents.manage" },
      { label: "HR Letters", permission: "hrms.employee_letters.list" },
      { label: "Agreements", permission: "hrms.agreements.list" },
      { label: "Document Sign", permission: "document_sign.requests.list" },
    ],
  },
  {
    icon: "▤",
    label: "Reports",
    permission: "hrms.reports.view",
    children: [
      { label: "Report Builder", permission: "hrms.reports.view" },
      { label: "Leave Reports", permission: "hrms.leaves.report" },
    ],
  },
  {
    icon: "⚙",
    label: "Setup",
    permission: "hrms.settings",
    children: [
      { label: "Portal Branding", permission: "hrms.branding.view" },
      { label: "Branches", permission: "hrms.branches.list" },
      { label: "Departments", permission: "hrms.departments.list" },
      { label: "Designations", permission: "hrms.designations.list" },
      { label: "Lookups", permission: "hrms.lookups.list" },
      { label: "Financial Years", permission: "hrms.financial_years.list" },
      { label: "Working Hours", permission: "hrms.working_hours.list" },
      { label: "Holidays", permission: "hrms.holidays.list" },
      { label: "Attendance & Leave Policies", permission: "hrms.attendance.policy.view" },
      { label: "Policies", permission: "hrms.policies.list" },
    ],
  },
];

const managerNavItems: NavItem[] = [
  { icon: "⌂", label: "Home", permission: "hrms.dashboard.employee.view" },
  { icon: "▥", label: "My Team", permission: "hrms.employees.list" },
  {
    icon: "✓",
    label: "Approvals",
    permission: "hrms.leaves.approve",
    children: [
      { label: "Leave Approvals", permission: "hrms.leaves.approve" },
      { label: "Workflow Inbox", permission: "hrms.workflow.tasks.list" },
    ],
  },
  { icon: "◷", label: "My Attendance", permission: "hrms.attendance.check_in" },
  {
    icon: "◱",
    label: "Leave",
    permission: "hrms.leaves.apply",
    children: [
      { label: "Leave", permission: "hrms.leaves.apply" },
      { label: "Leave Reports", permission: "hrms.leaves.report" },
    ],
  },
  { icon: "▤", label: "Reports", permission: "hrms.reports.view" },
];

const employeeNavItems: NavItem[] = [
  { icon: "⌂", label: "Home", permission: "hrms.dashboard.employee.view" },
  { icon: "◷", label: "Attendance", permission: "hrms.attendance.check_in" },
  { icon: "◱", label: "Leave", permission: "hrms.leaves.apply" },
  { icon: "₹", label: "Payslips", permission: "hrms.salary_slips.view" },
  { icon: "□", label: "Documents", permission: "hrms.employees.documents.manage" },
  { icon: "☰", label: "Policies", permission: "hrms.policies.view" },
  { icon: "▣", label: "Inbox", permission: "hrms.notifications.read" },
];

const applicantNavItems: NavItem[] = [
  { icon: "▧", label: "My Applications", permission: "hrms.applicant.portal.view" },
];

const sectionByNavLabel: Record<string, ActiveSection> = {
  Overview: "superadmin-dashboard",
  Dashboard: "superadmin-dashboard",
  "Platform Dashboard": "superadmin-dashboard",
  Home: "employee-dashboard",
  "My Applications": "applicant-portal",
  "Employee Dashboard": "employee-dashboard",
  Companies: "tenants",
  "Tenant List": "tenants",
  Tenants: "tenants",
  "Signup Requests": "signup-requests",
  "Governance Queue": "tenant-operations",
  "Tenant Support": "tenant-operations",
  "My Tasks": "workflow-inbox",
  Approvals: "workflow-inbox",
  Requests: "hr-helpdesk",
  "All Work": "operations-workbench",
  Notifications: "notification-inbox",
  Users: "users",
  "Platform Users": "users",
  Roles: "roles",
  "Platform Roles": "roles",
  "Access & Roles": "roles",
  "Roles & Permissions": "roles",
  "HR Dashboard": "hr-command-center",
  "Command Center": "hr-command-center",
  "Business Dashboard": "hr-command-center",
  "Operations Workbench": "operations-workbench",
  "Workflow Inbox": "workflow-inbox",
  "HR Helpdesk": "hr-helpdesk",
  "Employee Relations": "employee-relations",
  Workbench: "inbox",
  Inbox: "inbox",
  Completed: "completed",
  Complete: "completed",
  "My Team": "employees",
  "Portal Branding": "portal-branding",
  "Career Site": "career-site",
  "Job Positions": "job-positions",
  "Job Requisitions": "job-requisitions",
  "Job Postings": "job-postings",
  Candidates: "candidates",
  Applications: "candidate-applications",
  Interviews: "interview-rounds",
  Offers: "offer-letters",
  "Onboarding Flows": "onboarding-workflows",
  "Candidate Onboarding": "candidate-onboarding",
  Celebrations: "celebrations",
  "Celebration Jobs": "celebration-jobs",
  "Scheduled Jobs": "celebration-jobs",
  Employees: "employees",
  "Workforce Hub": "workforce-hub",
  Engagements: "engagements",
  Projects: "projects",
  "Work Logs": "work-logs",
  Compliance: "compliance",
  Skills: "skills",
  "Skill Gaps": "skill-gaps",
  Learning: "learning",
  "Talent Marketplace": "talent-marketplace",
  OKRs: "okrs",
  Performance: "performance",
  Wellbeing: "wellbeing",
  "HR Letters": "employee-letters",
  Agreements: "agreements",
  "Document Sign": "document-sign",
  "Asset & Access": "asset-access",
  "Employee Exits": "employee-exits",
  "My Onboarding": "my-onboarding",
  "My Documents": "my-onboarding",
  Branches: "branches",
  Departments: "departments",
  Designations: "designations",
  "Workforce Types": "workforce-types",
  "Document Requirements": "document-requirements",
  Lookups: "lookups",
  "Celebration Types": "celebration-types",
  "Notification Settings": "notification-settings",
  "Notification Center": "notification-center",
  "SMS & WhatsApp": "communication-providers",
  "Storage Providers": "storage-providers",
  "Push Providers": "push-providers",
  "Financial Years": "financial-years",
  "Working Hours": "working-hours",
  Holidays: "holidays",
  "Leave Types": "leave-types",
  "Leave Settings": "leave-policies",
  "Attendance & Leave Policies": "attendance-leave-policies",
  "Leave Balances": "leave-policies",
  "Payroll Settings": "payroll-settings",
  "Payroll Operations": "payroll-operations",
  "Flexible Payroll": "flexible-payroll",
  "Compensation Review": "compensation-review",
  "Succession Planning": "succession-planning",
  "Salary Templates": "salary-templates",
  "Employee Salary": "employee-salary",
  Payslips: "payslips",
  "Payslip Format": "payslips",
  Leave: "leaves",
  Leaves: "leaves",
  "Leave Approvals": "leave-approvals",
  "Leave Reports": "leave-reports",
  Reports: "reports",
  "Report Builder": "reports",
  Reviews: "performance",
  Insights: "insights",
  "People Analytics": "people-analytics",
  Attendance: "attendance",
  "My Attendance": "attendance",
  "Shift Scheduling": "shift-scheduling",
  "Benefits & Claims": "benefits-claims",
  Documents: "my-onboarding",
  Policies: "policies",
  "Privacy & Ecosystem": "privacy-ecosystem",
  Plans: "subscription-plans",
  "Tenant Subscriptions": "subscriptions",
  Subscriptions: "subscriptions",
  Broadcasts: "notification-center",
  Settings: "leave-policies",
};

const groupedSectionsByNavLabel: Partial<Record<string, ActiveSection[]>> = {
  Dashboard: ["superadmin-dashboard"],
  "Platform Dashboard": ["superadmin-dashboard"],
  Home: ["employee-dashboard"],
  "My Work": ["employee-dashboard", "inbox", "completed", "attendance", "shift-scheduling", "benefits-claims", "projects", "work-logs", "learning", "talent-marketplace", "okrs", "performance", "wellbeing", "leaves", "payslips", "agreements", "policies", "hr-helpdesk", "employee-relations", "notification-inbox", "my-onboarding"],
  "My Team": ["employees"],
  Workspace: ["employee-dashboard", "inbox", "completed", "hr-command-center", "hr-dashboard", "notification-inbox"],
  Tenants: ["tenants"],
  "Signup Requests": ["signup-requests"],
  "Super Admin": ["superadmin-dashboard", "tenants", "signup-requests", "roles"],
  "Access Control": ["users", "roles"],
  "Access & Roles": ["users", "roles"],
  "Platform Users": ["users"],
  "Platform Roles": ["roles"],
  People: ["hr-command-center", "operations-workbench", "workflow-inbox", "hr-helpdesk", "employee-relations", "employees", "workforce-hub", "engagements", "projects", "work-logs", "compliance", "skills", "skill-gaps", "learning", "talent-marketplace", "succession-planning", "asset-access", "okrs", "performance", "wellbeing", "people-analytics", "employee-letters", "agreements", "document-sign", "employee-exits", "my-onboarding"],
  Recruitment: ["career-site", "job-positions", "job-requisitions", "job-postings", "candidates", "candidate-applications", "interview-rounds", "offer-letters", "onboarding-workflows", "candidate-onboarding"],
  Hiring: ["career-site", "job-positions", "job-requisitions", "job-postings", "candidates", "candidate-applications", "interview-rounds", "offer-letters", "candidate-onboarding"],
  Onboarding: ["onboarding-workflows", "candidate-onboarding"],
  "Time & Leave": ["attendance", "shift-scheduling", "benefits-claims", "leaves", "leave-approvals", "leave-policies", "attendance-leave-policies", "leave-reports", "reports", "insights"],
  Time: ["attendance", "shift-scheduling", "leaves", "leave-approvals", "leave-policies", "attendance-leave-policies", "leave-reports"],
  Leave: ["leaves", "leave-approvals", "leave-policies", "attendance-leave-policies", "leave-reports"],
  Payroll: ["payroll-settings", "payroll-operations", "salary-templates", "employee-salary", "payslips"],
  Workbench: ["inbox", "completed"],
  Inbox: ["inbox"],
  Completed: ["completed"],
  Approvals: ["leave-approvals", "workflow-inbox"],
  Performance: ["okrs", "performance", "skills", "skill-gaps", "learning", "talent-marketplace", "succession-planning", "wellbeing"],
  Reports: ["reports", "leave-reports"],
  "Tenant Operations": ["tenant-operations", "hr-command-center", "operations-workbench", "workflow-inbox", "hr-helpdesk", "employee-relations", "employees", "workforce-hub", "engagements", "projects", "work-logs", "compliance", "skills", "skill-gaps", "learning", "talent-marketplace", "succession-planning", "asset-access", "okrs", "performance", "wellbeing", "people-analytics", "attendance", "shift-scheduling", "benefits-claims", "leaves", "leave-approvals", "leave-policies", "leave-reports", "reports", "insights", "payroll-operations", "flexible-payroll", "compensation-review", "employee-salary", "payslips", "employee-letters", "agreements", "document-sign", "employee-exits"],
  "Tenant Support": ["tenant-operations"],
  "Company Setup": ["branches", "departments", "designations", "workforce-types", "document-requirements", "lookups", "financial-years", "working-hours", "holidays", "leave-types", "leave-policies", "attendance-leave-policies", "policies", "privacy-ecosystem"],
  Setup: ["portal-branding", "branches", "departments", "designations", "lookups", "financial-years", "working-hours", "holidays", "attendance-leave-policies", "policies"],
  Documents: ["document-requirements", "employee-letters", "agreements", "document-sign", "my-onboarding"],
  Communication: ["notification-settings", "notification-center", "communication-providers", "storage-providers", "push-providers"],
  "System Operations": ["celebration-jobs", "notification-center", "notification-settings", "communication-providers", "storage-providers", "push-providers", "privacy-ecosystem"],
  Culture: ["celebrations", "celebration-types", "celebration-jobs"],
  Commercial: ["subscription-plans", "subscriptions"],
  Subscriptions: ["subscription-plans", "subscriptions"],
  Support: ["notification-inbox", "notification-center"],
  Settings: ["branches", "departments", "designations", "workforce-types", "document-requirements", "lookups", "financial-years", "working-hours", "holidays", "leave-types", "leave-policies", "attendance-leave-policies", "payroll-settings", "salary-templates", "policies"],
};

function navLabelSection(label: string): ActiveSection | undefined {
  return sectionByNavLabel[label];
}

function navItemActive(label: string, activeSection: ActiveSection) {
  return groupedSectionsByNavLabel[label]?.includes(activeSection) || navLabelSection(label) === activeSection;
}

function visibleSectionsFromNavItems(items: NavItem[]) {
  const sections = new Set<ActiveSection>();
  const addLabel = (label: string) => {
    const section = navLabelSection(label);
    if (section) {
      sections.add(section);
    }
  };
  for (const item of items) {
    addLabel(item.label);
    for (const child of item.children || []) {
      addLabel(child.label);
    }
  }
  return sections;
}

function dashboardSectionFromURL(fallback: ActiveSection) {
  if (typeof window === "undefined") return fallback;
  const params = new URLSearchParams(window.location.search);
  const rawSection = params.get("section") || window.location.hash.replace(/^#/, "");
  if (!rawSection) return fallback;
  return isKnownDashboardSection(rawSection) ? rawSection : fallback;
}

function writeDashboardSectionURL(section: ActiveSection, mode: "push" | "replace" = "push") {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (section === "superadmin-dashboard") {
    url.searchParams.delete("section");
  } else {
    url.searchParams.set("section", section);
  }
  const nextURL = `${url.pathname}${url.search}${url.hash}`;
  const currentURL = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextURL === currentURL) return;
  window.history[mode === "replace" ? "replaceState" : "pushState"]({ section }, "", nextURL);
}

function isKnownDashboardSection(value: string): value is ActiveSection {
  return Object.values(sectionByNavLabel).includes(value as ActiveSection) || Object.values(groupedSectionsByNavLabel).some((sections) => sections?.includes(value as ActiveSection));
}

function normalizeRoleCode(role: string) {
  return role.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function currentUserRoleCodes(user: CurrentUser | null) {
  return (user?.roles || []).map(normalizeRoleCode);
}

function hasRoleCode(user: CurrentUser | null, roleCodes: string[]) {
  const roles = currentUserRoleCodes(user);
  return roleCodes.some((roleCode) => roles.includes(roleCode));
}

function canUseHrDashboard(user: CurrentUser | null) {
  if (!user || user.is_super_admin) {
    return false;
  }
  const roles = currentUserRoleCodes(user);
  const permissions = new Set(user.permissions || []);
  return roles.includes("HR") || roles.includes("TENANT_ADMIN") || permissions.has("hrms.dashboard.hr.view") || permissions.has("hrms.command_center.view");
}

function isApplicantUser(user: CurrentUser | null) {
  if (!user || user.is_super_admin) {
    return false;
  }
  return hasRoleCode(user, ["APPLICANT"]) || canView(user, "hrms.applicant.portal.view");
}

function isManagerUser(user: CurrentUser | null) {
  if (!user || user.is_super_admin || canUseHrDashboard(user)) {
    return false;
  }
  return hasRoleCode(user, ["MANAGER", "REPORTING_MANAGER", "TEAM_LEAD"]) || canView(user, "hrms.leaves.approve");
}

function selectTenantNavItems(user: CurrentUser | null): NavItem[] {
  if (isApplicantUser(user) && !canUseHrDashboard(user) && !canView(user, "hrms.dashboard.employee.view")) {
    return applicantNavItems;
  }
  if (canUseHrDashboard(user)) {
    return tenantAdminHrNavItems;
  }
  if (isManagerUser(user)) {
    return managerNavItems;
  }
  if (isApplicantUser(user)) {
    return applicantNavItems;
  }
  return employeeNavItems;
}

function defaultSectionForUser(user: CurrentUser | null): ActiveSection {
  if (!user || user.is_super_admin) {
    return "superadmin-dashboard";
  }
  if (isApplicantUser(user) && !canUseHrDashboard(user) && !canView(user, "hrms.dashboard.employee.view")) {
    return "applicant-portal";
  }
  return canUseHrDashboard(user) ? "hr-command-center" : "employee-dashboard";
}

function allowedSectionsForUser(user: CurrentUser | null) {
  const sections = new Set<ActiveSection>();
  if (!user) {
    return sections;
  }
  if (user.is_super_admin) {
    Object.values(sectionByNavLabel).forEach((section) => sections.add(section));
    Object.values(groupedSectionsByNavLabel).forEach((groupSections) => groupSections?.forEach((section) => sections.add(section)));
    return sections;
  }
  const sourceItems = selectTenantNavItems(user);
  for (const section of visibleSectionsFromNavItems(sourceItems)) {
    sections.add(section);
  }
  sections.add(defaultSectionForUser(user));
  if (canUseHrDashboard(user)) {
    sections.add("hr-command-center");
    sections.add("hr-dashboard");
  }
  if (canView(user, "hrms.operations_workbench.view")) {
    sections.add("operations-workbench");
  }
  return sections;
}

function isSectionAllowedForUser(section: ActiveSection, user: CurrentUser | null) {
  return allowedSectionsForUser(user).has(section);
}

function sectionForUserOrDefault(section: ActiveSection, user: CurrentUser | null) {
  return isSectionAllowedForUser(section, user) ? section : defaultSectionForUser(user);
}

function currentUserPermissions(user: CurrentUser | null) {
  const permissions = new Set<string>();
  for (const permission of user?.permissions || []) {
    const normalized = permission.trim();
    if (!normalized) continue;
    permissions.add(normalized);
    if (normalized.startsWith("hrms.")) {
      permissions.add(normalized.slice("hrms.".length));
    }
  }
  return permissions;
}

function canView(user: CurrentUser | null, permission: string) {
  if (!permission) {
    return true;
  }
  if (user?.is_super_admin) {
    return true;
  }
  const permissions = currentUserPermissions(user);
  if (permissions.has(permission)) {
    return true;
  }
  if (permission.startsWith("hrms.") && permissions.has(permission.slice("hrms.".length))) {
    return true;
  }
  return false;
}

function getVisibleNavGroups(groups: NavGroup[], user: CurrentUser | null): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => canView(user, child.permission)),
        }))
        .filter((item) => canView(user, item.permission) || Boolean(item.children?.length)),
    }))
    .filter((group) => group.items.length > 0);
}

function filterNavChildrenForRole(children: NavItem["children"], isSuperAdmin: boolean) {
  if (!children?.length) {
    return children;
  }
  const hiddenForSuperAdmin = new Set(["Dashboard", "HR Dashboard", "My Onboarding"]);
  return children.filter((child) => !(isSuperAdmin && hiddenForSuperAdmin.has(child.label)));
}

function tenantStatus(tenant: IdentityTenant): TenantRow["status"] {
  if (tenant.kind === "ops") {
    return "Ops";
  }
  if (tenant.subscription_plan?.trim()) {
    return "Active";
  }
  if (tenant.trial_ends_at && new Date(tenant.trial_ends_at).getTime() < Date.now()) {
    return "Inactive";
  }
  return "Pending";
}

function tenantEditableLifecycle(status: TenantRow["status"]): "Active" | "Pending" {
  return status === "Active" || status === "Ops" ? "Active" : "Pending";
}

function normalizeEditablePlan(plan: string) {
  return plan === "Not assigned" || plan === "System" ? "" : plan;
}

function planForLifecycle(status: "Active" | "Pending", plan: string) {
  if (status === "Pending") {
    return "";
  }
  return plan.trim() || "Starter";
}

function tenantCatalogPlanLabel(plan: TenantCatalogPlan) {
  const visibility = plan.visibility === "internal" ? "Internal" : "Public";
  const price = plan.price_basis === "custom_quote" ? "Custom quote" : plan.price_basis === "package_plus_overage" ? `${plan.currency_code} ${plan.price_amount}/${plan.billing_cycle} incl. ${plan.included_employees}, +${plan.currency_code} ${plan.overage_amount}/extra` : `${plan.currency_code} ${plan.price_amount}/employee, min ${plan.currency_code} ${plan.minimum_amount}`;
  const limit = `${plan.employee_limit} employee cap`;
  return `${plan.name} (${visibility}) - ${price} - ${limit}`;
}

function formatMoney(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { currency, maximumFractionDigits: 0, style: "currency" }).format(value || 0);
}

function monthlyPlanValue(plan: TenantCatalogPlan | null) {
  if (!plan || plan.price_basis === "custom_quote") {
    return 0;
  }
  if (plan.price_basis === "package_plus_overage") {
    return plan.price_amount || plan.minimum_amount || 0;
  }
  return plan.minimum_amount || plan.price_amount || 0;
}

function findMatchingCatalogPlan(plans: TenantCatalogPlan[], currentName: string, currentPlanID?: string | null) {
  const normalizedName = normalizeEditablePlan(currentName).trim().toLowerCase();
  return plans.find((plan) => plan.id === currentPlanID) || plans.find((plan) => [plan.name, plan.code].some((value) => value.toLowerCase() === normalizedName)) || null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short", year: "numeric" }).format(date);
}

function tenantAdminLabel(tenant: IdentityTenant) {
  const name = tenant.admin_name?.trim();
  const email = tenant.admin_email?.trim();
  if (name && email) {
    return `${name} (${email})`;
  }
  return name || email || "Not assigned";
}

function normalizeTenantSubdomain(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function fallbackTenantSubdomain(tenant: Pick<IdentityTenant, "id" | "name">) {
  return tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || tenant.id.slice(0, 8).toLowerCase();
}

function tenantDisplayUrl(subdomain: string) {
  return `https://${tenantHost(subdomain)}`;
}

function mapTenantRow(tenant: IdentityTenant): TenantRow {
  const subdomain = normalizeTenantSubdomain(tenant.subdomain) || fallbackTenantSubdomain(tenant);
  return {
    id: tenant.id,
    name: tenant.name,
    code: tenant.id.slice(0, 8).toUpperCase(),
    kind: tenant.kind,
    subdomain,
    subdomainUrl: tenantDisplayUrl(subdomain),
    admin: tenantAdminLabel(tenant),
    users: "-",
    status: tenantStatus(tenant),
    plan: tenant.subscription_plan || (tenant.kind === "ops" ? "System" : "Not assigned"),
    joined: formatDate(tenant.created_at),
    createdAt: tenant.created_at,
    trialEndsAt: formatDate(tenant.trial_ends_at),
  };
}

function buildTenantStats(rows: TenantRow[]) {
  const total = rows.length;
  const active = rows.filter((tenant) => tenant.status === "Active" || tenant.status === "Ops").length;
  const inactive = rows.filter((tenant) => tenant.status === "Inactive").length;
  const pending = rows.filter((tenant) => tenant.status === "Pending").length;

  return [
    { icon: <Building2 className="h-5 w-5" />, label: "Total Tenants", value: String(total), change: "From database", tone: "bg-[#eef4f1] text-[#588368]", accent: "bg-[#588368]" },
    { icon: <CheckCircle2 className="h-5 w-5" />, label: "Active Tenants", value: String(active), change: `${total ? Math.round((active / total) * 100) : 0}% active`, tone: "bg-[#ecfdf3] text-[#16803c]", accent: "bg-[#22c55e]" },
    { icon: <AlertTriangle className="h-5 w-5" />, label: "Inactive Tenants", value: String(inactive), change: "Expired trials", tone: "bg-[#fff7ed] text-[#c05621]", accent: "bg-[#e87839]" },
    { icon: <ClipboardList className="h-5 w-5" />, label: "Pending Setup", value: String(pending), change: "No plan assigned", tone: "bg-[#eff6ff] text-[#2563eb]", accent: "bg-[#3b82f6]" },
  ];
}

export default function DashboardPage() {
  const { branding: runtimeBranding, setTenantBranding } = useTenantBranding();
  const logoSrc = runtimeBranding.logo_path || asset("/assets/img/logo.png");
  const runtimeBrandName = runtimeBranding.display_name || "Setika";
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedNavLabels, setExpandedNavLabels] = useState<Set<string>>(() => new Set(["Workbench"]));
  const [activeSection, setActiveSection] = useState<ActiveSection>("superadmin-dashboard");
  const initialHistorySyncDoneRef = useRef(false);
  const applyingBrowserHistoryRef = useRef(false);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [viewTenant, setViewTenant] = useState<TenantRow | null>(null);
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null);
  const [brandingTenant, setBrandingTenant] = useState<TenantRow | null>(null);
  const [usersTenant, setUsersTenant] = useState<TenantRow | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantSearch, setTenantSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantsError, setTenantsError] = useState("");
  const [signupRequests, setSignupRequests] = useState<SignupIntent[]>([]);
  const [signupRequestsLoading, setSignupRequestsLoading] = useState(false);
  const [signupRequestsError, setSignupRequestsError] = useState("");
  const [superAdminPlans, setSuperAdminPlans] = useState<TenantCatalogPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");
  const [masterCountries, setMasterCountries] = useState<MasterCountry[]>([]);
  const [masterTimezones, setMasterTimezones] = useState<MasterTimezone[]>([]);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [masterDataError, setMasterDataError] = useState("");
  const [roles, setRoles] = useState<IdentityRole[]>([]);
  const [permissions, setPermissions] = useState<IdentityPermission[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [notificationUnread, setNotificationUnread] = useState(0);
  const isSuperAdmin = Boolean(currentUser?.is_super_admin);
  const currentUserName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ").trim() || currentUser?.email || "User";
  const currentUserInitials = currentUserName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
  const currentRoleLabel = currentUser?.is_super_admin ? "Super Admin" : currentUser?.roles?.length ? currentUser.roles.join(", ") : "Employee";
  const canOpenHrDashboard = canUseHrDashboard(currentUser);
  const canUseOperationsWorkbench = canView(currentUser, "hrms.operations_workbench.view");
  const canOpenWorkbench = canView(currentUser, "hrms.dashboard.employee.view") || canView(currentUser, "hrms.workflow.tasks.list") || canView(currentUser, "hrms.workflow_tasks.list");
  const attendanceSelfServiceOnly = !isSuperAdmin && !canView(currentUser, "hrms.attendance.operations.view") && !canUseHrDashboard(currentUser);
  const canManageDesignationAttendanceRequirement = isSuperAdmin || canView(currentUser, "hrms.designations.attendance_requirement.update") || (currentUser?.roles || []).map(normalizeRoleCode).includes("TENANT_ADMIN");
  const homeSection = defaultSectionForUser(currentUser);
  const pendingSignupRequestCount = signupRequests.filter((request) => request.status === "pending_email_verification" || request.status === "email_verified").length;
  const headerActions: Array<{ icon: ReactNode; label: string; section: ActiveSection; show: boolean }> = [
    { icon: <Home className="h-4 w-4" />, label: "Home", section: homeSection, show: true },
    { icon: <Sparkles className="h-4 w-4" />, label: "Command Center", section: "hr-command-center", show: canOpenHrDashboard },
    { icon: <ClipboardList className="h-4 w-4" />, label: canOpenHrDashboard ? "Workbench" : "Inbox", section: "inbox", show: !isSuperAdmin && !isApplicantUser(currentUser) && !isManagerUser(currentUser) && canOpenWorkbench },
  ];
  const visibleNavGroups = useMemo(() => {
    const sourceGroups = isSuperAdmin ? navGroups : [{ title: "Main Menu", items: selectTenantNavItems(currentUser) }];
    return getVisibleNavGroups(sourceGroups, currentUser).map((group) => ({
      ...group,
      items: group.items
        .map((item) => ({
          ...item,
          badge: item.label === "Signup Requests" && pendingSignupRequestCount > 0 ? String(pendingSignupRequestCount) : item.badge,
          children: filterNavChildrenForRole(item.children, isSuperAdmin),
        }))
        .filter((item) => !item.children || item.children.length > 0 || navLabelSection(item.label)),
    })).filter((group) => group.items.length > 0);
  }, [currentUser, isSuperAdmin, pendingSignupRequestCount]);
  const tenantStats = buildTenantStats(tenants);
  const branchTenantOptions: BranchTenantOption[] = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    code: tenant.code,
    kind: tenant.kind,
    subdomainUrl: tenant.subdomainUrl,
    status: tenant.status,
    plan: tenant.plan,
    joined: tenant.joined,
  }));
  const planOptions = Array.from(new Set(tenants.map((tenant) => tenant.plan))).sort((a, b) => a.localeCompare(b));
  const filteredTenants = tenants.filter((tenant) => {
    const query = tenantSearch.trim().toLowerCase();
    const matchesSearch =
      !query || [tenant.name, tenant.code, tenant.kind, tenant.subdomainUrl, tenant.admin, tenant.plan, tenant.status, tenant.joined].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    const matchesPlan = planFilter === "all" || tenant.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    setTenantsError("");
    try {
      const result = await apiRequest<IdentityTenant[]>("/admin/tenants");
      setTenants(result.map(mapTenantRow));
    } catch (err) {
      setTenantsError(err instanceof Error ? err.message : "Unable to load tenants");
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  const loadSuperAdminPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError("");
    try {
      const result = await apiRequest<TenantCatalogPlan[]>("/hrms/subscription-plans/active");
      setSuperAdminPlans(result);
    } catch (err) {
      setPlansError(err instanceof Error ? err.message : "Unable to load subscription plans");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const loadSignupRequests = useCallback(async () => {
    setSignupRequestsLoading(true);
    setSignupRequestsError("");
    try {
      const result = await apiRequest<SignupIntent[]>("/admin/signup-intents");
      setSignupRequests(result);
    } catch (err) {
      setSignupRequestsError(err instanceof Error ? err.message : "Unable to load signup requests");
    } finally {
      setSignupRequestsLoading(false);
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    setMasterDataLoading(true);
    setMasterDataError("");
    try {
      const [countriesResult, timezonesResult] = await Promise.all([
        apiRequest<MasterCountry[]>("/master-data/countries"),
        apiRequest<MasterTimezone[]>("/master-data/timezones"),
      ]);
      setMasterCountries(countriesResult);
      setMasterTimezones(timezonesResult);
    } catch (err) {
      setMasterDataError(err instanceof Error ? err.message : "Unable to load master data");
    } finally {
      setMasterDataLoading(false);
    }
  }, []);

  const loadRolesData = useCallback(async () => {
    setRolesLoading(true);
    setRolesError("");
    try {
      const rolesPath = isSuperAdmin ? "/roles/?scope=platform" : "/roles/";
      const [rolesResult, permissionsResult] = await Promise.all([apiRequest<IdentityRole[]>(rolesPath), apiRequest<IdentityPermission[]>("/permissions/")]);
      setRoles(rolesResult);
      setPermissions(permissionsResult);
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : "Unable to load roles and permissions.");
    } finally {
      setRolesLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }

    window.setTimeout(async () => {
      try {
        const me = await apiRequest<CurrentUser>("/auth/me");
        if (!me.is_super_admin) {
          try {
            const tenantBranding = await apiRequest<TenantBranding>("/hrms/branding");
            if (!cancelled) {
              setTenantBranding(tenantBranding);
            }
          } catch (err) {
            if (!(err instanceof ApiRequestError && err.status === 404)) {
              console.warn("Unable to load current tenant branding", err);
            }
          }
        }
        if (!cancelled) {
          setCurrentUser(me);
          setActiveSection(sectionForUserOrDefault(dashboardSectionFromURL(defaultSectionForUser(me)), me));
          setReady(true);
        }
      } catch {
        clearAuthSession();
        window.location.replace("/login");
      }
    }, 0);

    return () => {
      cancelled = true;
    };
  }, [setTenantBranding]);

  useEffect(() => {
    if (!ready) return;
    if (applyingBrowserHistoryRef.current) {
      applyingBrowserHistoryRef.current = false;
      return;
    }
    writeDashboardSectionURL(activeSection, initialHistorySyncDoneRef.current ? "push" : "replace");
    initialHistorySyncDoneRef.current = true;
  }, [activeSection, ready]);

  useEffect(() => {
    if (!ready) return;
    function handlePopState() {
      const nextSection = sectionForUserOrDefault(dashboardSectionFromURL(defaultSectionForUser(currentUser)), currentUser);
      if (nextSection === activeSection) return;
      applyingBrowserHistoryRef.current = true;
      setActiveSection(nextSection);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeSection, currentUser, ready]);

  useEffect(() => {
    if (!ready || isSuperAdmin || !currentUser?.tenant_id) {
      return;
    }
    let cancelled = false;
    async function loadUnread() {
      try {
        const data = await apiRequest<{ unread: number }>("/hrms/notifications/unread-count");
        if (!cancelled) setNotificationUnread(Number(data.unread) || 0);
      } catch {
        if (!cancelled) setNotificationUnread(0);
      }
    }
    void loadUnread();
    const interval = window.setInterval(() => void loadUnread(), 15000);
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void loadUnread();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser?.tenant_id, isSuperAdmin, ready]);

  useEffect(() => {
    if (!ready || !isSuperAdmin) {
      return;
    }
    const timer = window.setTimeout(() => {
      loadTenants();
      loadSuperAdminPlans();
      loadMasterData();
      loadSignupRequests();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isSuperAdmin, loadMasterData, loadSignupRequests, loadSuperAdminPlans, loadTenants, ready]);

  useEffect(() => {
    if (!ready || (activeSection !== "roles" && activeSection !== "users")) {
      return;
    }
    const timer = window.setTimeout(() => {
      loadRolesData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeSection, loadRolesData, ready]);

  function logout() {
    clearAuthSession();
    window.location.replace("/login");
  }

  function refreshTenants() {
    loadTenants();
  }

  async function manuallyProvisionSignupRequest(intentID: string) {
    const result = await apiRequest<AssistedTenantProvisionResponse>(`/admin/signup-intents/${intentID}/manual-provision`, { method: "POST" });
    await Promise.all([loadSignupRequests(), loadTenants()]);
    return result;
  }

  async function updateSignupRequest(intentID: string, payload: SignupIntentEditForm) {
    const result = await apiRequest<SignupIntent>(`/admin/signup-intents/${intentID}`, {
      method: "PUT",
      body: {
        ...payload,
        trial_days: Number(payload.trial_days || 30),
      },
    });
    await loadSignupRequests();
    return result;
  }

  async function deleteSignupRequest(intentID: string) {
    await apiRequest<void>(`/admin/signup-intents/${intentID}`, { method: "DELETE" });
    await loadSignupRequests();
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f6] text-[#111827]">
        <div className="rounded-[5px] border border-[#dbe8e1] bg-white px-6 py-4 text-sm font-semibold shadow-sm">Checking session...</div>
      </main>
    );
  }

  return (
    <main
      className="hrms-brand-scope min-h-screen text-[#172033]"
      style={{
        background:
          "radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--brand-primary) 16%, transparent) 0, transparent 28rem), radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--brand-secondary) 18%, transparent) 0, transparent 30rem), linear-gradient(135deg, var(--dashboard-bg-soft) 0%, var(--dashboard-bg-cool) 46%, var(--dashboard-bg-warm) 100%)",
      }}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[252px] border-r border-[#dfe6e2] bg-white/95 shadow-[8px_0_24px_rgba(23,32,51,0.04)] backdrop-blur transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="fixed left-0 top-0 z-10 flex h-[50px] w-[252px] items-center border-b border-[#edf1ef] bg-white px-3">
          <span className="flex h-10 w-[196px] items-center overflow-hidden">
            <img alt={`${runtimeBrandName} logo`} className="h-9 w-[190px] object-contain object-left" src={logoSrc} />
          </span>
        </div>
        <nav className="mt-[50px] h-[calc(100vh-89px)] overflow-y-auto px-3 py-3">
          {visibleNavGroups.map((group) => (
            <div className="mb-[19px]" key={group.title}>
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a978f]">{group.title}</p>
                <span className="rounded-full bg-[#eef4f1] px-2 py-0.5 text-[10px] font-black text-[#588368]">{group.items.length}</span>
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.label === "Home" && !isSuperAdmin ? activeSection === homeSection : navItemActive(item.label, activeSection);
                  const childCount = item.children?.length || 0;
                  const expanded = childCount ? active || expandedNavLabels.has(item.label) : false;
                  return (
                    <div className="rounded-[5px]" key={item.label}>
                      <button
                        aria-expanded={expanded}
                        className={`relative flex min-h-9 w-full items-center gap-2 rounded-[5px] px-2 py-2 text-left text-sm leading-normal transition ${
                          active
                            ? "bg-[#eaf3ee] font-bold text-[#172033] shadow-sm before:absolute before:left-0 before:top-1/2 before:h-[20px] before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[#e87839]"
                            : "text-[#4b5563] hover:bg-[#f7faf8] hover:text-[#172033]"
                        }`}
                        data-permission={item.permission}
                        onClick={() => {
                          if (childCount) {
                            setExpandedNavLabels((current) => {
                              const next = new Set(current);
                              if (next.has(item.label)) {
                                next.delete(item.label);
                              } else {
                                next.add(item.label);
                              }
                              return next;
                            });
                            return;
                          }
                          const section = item.label === "Home" && !isSuperAdmin ? homeSection : navLabelSection(item.label);
                          if (section) setActiveSection(section);
                        }}
                        type="button"
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] ${active ? "bg-white text-[#588368] shadow-sm" : "text-[#6b7280]"}`}>{item.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{item.label}</span>
                        </span>
                        {item.badge ? <span className="rounded-md bg-[#588368] px-2 py-1 text-xs text-white">{item.badge}</span> : null}
                        {childCount ? <ChevronDown className={`h-4 w-4 text-[#8a978f] transition-transform ${expanded ? "rotate-180" : ""}`} /> : null}
                      </button>
                      {childCount ? (
                        <div className={`grid transition-[grid-template-rows] duration-200 ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                          <div className="overflow-hidden">
                            <div className="relative mb-1 ml-3 mt-1 space-y-0.5 border-l border-[#e7ece9] pl-3">
                              {item.children?.map((child) => (
                                <button
                                  className={`relative block min-h-8 w-full rounded-[5px] px-3 py-1.5 text-left text-xs leading-normal transition ${
                                    navItemActive(child.label, activeSection)
                                      ? "bg-white font-bold text-[#588368] shadow-sm before:absolute before:-left-[13px] before:top-1/2 before:h-[18px] before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[#588368]"
                                      : "font-semibold text-[#69746d] hover:bg-white hover:text-[#111827]"
                                  }`}
                                  data-permission={child.permission}
                                  key={`${item.label}-${child.label}`}
                                  onClick={() => {
                                    const section = navLabelSection(child.label);
                                    if (section) setActiveSection(section);
                                    setSidebarOpen(false);
                                  }}
                                  type="button"
                                >
                                  {child.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex h-9 items-center border-t border-[#edf1ef] px-5 text-[11px] font-semibold text-[#8a978f]">Powered by Setika</div>
      </aside>

      {sidebarOpen ? <button aria-label="Close sidebar" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} type="button" /> : null}

      <section className="min-h-screen pt-[50px] lg:pl-[252px]">
        <header className="fixed left-0 right-0 top-0 z-20 flex h-[50px] items-center justify-between border-b border-[#dfe6e2] bg-white/95 px-[15px] shadow-sm backdrop-blur lg:left-[252px] lg:px-6" style={{ backgroundColor: runtimeBranding.topbar_color || "#ffffff" }}>
          <div className="flex min-w-0 items-center gap-3">
            <button className="flex h-[30px] w-[30px] items-center justify-center rounded-[5px] border border-[#dbe8e1] text-[#588368] lg:hidden" onClick={() => setSidebarOpen(true)} type="button">
              <Menu className="h-4 w-4" />
            </button>
            <button
              aria-label="Go home"
              className="hidden h-[30px] w-[30px] items-center justify-center rounded-[5px] text-[#6b7280] hover:bg-[#f4fbf8] hover:text-[#111827] lg:flex"
              onClick={() => setActiveSection(homeSection)}
              title="Home"
              type="button"
            >
              <Home className="h-4 w-4" />
            </button>
            <div className="relative hidden w-[259px] md:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
              <input className="h-[30px] w-full rounded-[5px] border border-[#dbe0e5] bg-white pl-9 pr-16 text-xs outline-none focus:border-[#588368]" placeholder="Search in HRMS" />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] bg-[#eef0f2] px-1.5 py-0.5 text-[10px] font-medium text-[#6b7280]">CTRL + /</kbd>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#6b7280]">
            {headerActions.filter((action) => action.show).map((action) => (
              <button
                aria-label={action.label}
                className={`hidden h-[30px] w-[30px] items-center justify-center rounded-[5px] transition sm:flex ${
                  navItemActive(action.label, activeSection) || activeSection === action.section
                    ? "bg-[#eef4f1] text-[#588368]"
                    : "hover:bg-[#f4fbf8] hover:text-[#111827]"
                }`}
                key={action.label}
                onClick={() => setActiveSection(action.section)}
                title={action.label}
                type="button"
              >
                {action.icon}
              </button>
            ))}
            {!isSuperAdmin && currentUser?.tenant_id ? (
              <button
                aria-label="Open notifications"
                className={`relative flex h-[30px] w-[30px] items-center justify-center rounded-[5px] transition ${
                  activeSection === "notification-inbox" ? "bg-[#eef4f1] text-[#588368]" : "hover:bg-[#f4fbf8] hover:text-[#111827]"
                }`}
                onClick={() => setActiveSection("notification-inbox")}
                title="Notifications"
                type="button"
              >
                <Bell className="h-4 w-4" />
                {notificationUnread > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e87839] px-1 text-[10px] font-black leading-none text-white">{notificationUnread > 9 ? "9+" : notificationUnread}</span> : null}
              </button>
            ) : null}
            <div className="relative">
              <button
                aria-expanded={userMenuOpen}
                aria-label="Open profile menu"
                className="flex min-w-0 items-center gap-2 rounded-[5px] border border-[#dbe8e1] bg-white py-1 pl-1 pr-2"
                onClick={() => setUserMenuOpen((open) => !open)}
                title={currentUser?.email || currentUserName}
                type="button"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#588368] text-[11px] font-black text-white">{currentUserInitials}</span>
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block max-w-[160px] truncate text-sm font-black text-[#111827]">{currentUserName}</span>
                  <span className="block max-w-[160px] truncate text-[11px] font-semibold text-[#6b7280]">{currentRoleLabel}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-[#8a978f] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {userMenuOpen ? (
                <section className="absolute right-0 top-10 z-50 w-[300px] rounded-[5px] border border-[#dfe6e2] bg-white p-3 text-left shadow-xl">
                  <div className="rounded-[5px] bg-[#f8faf9] p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#588368] text-sm font-black text-white">{currentUserInitials}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#111827]">{currentUserName}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-[#6b7280]">{currentUser?.email || "-"}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]">{currentRoleLabel}</span>
                      {currentUser?.tenant_id ? <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-black text-[#2563eb]">Tenant {currentUser.tenant_id.slice(0, 8)}</span> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <button
                      className="rounded-[5px] px-3 py-2 text-left text-sm font-bold text-[#374151] hover:bg-[#f4fbf8]"
                      onClick={() => {
                        setActiveSection(homeSection);
                        setUserMenuOpen(false);
                      }}
                      type="button"
                    >
                      Home
                    </button>
                    {canOpenWorkbench ? (
                      <button
                        className="rounded-[5px] px-3 py-2 text-left text-sm font-bold text-[#374151] hover:bg-[#f4fbf8]"
                        onClick={() => {
                          setActiveSection("inbox");
                          setUserMenuOpen(false);
                        }}
                        type="button"
                      >
                        Workbench
                      </button>
                    ) : null}
                    <button className="rounded-[5px] px-3 py-2 text-left text-sm font-black text-red-700 hover:bg-red-50" onClick={logout} type="button">
                      Logout
                    </button>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </header>

        {activeSection === "superadmin-dashboard" ? (
          <SuperAdminDashboardSection
            onNavigate={setActiveSection}
            plans={superAdminPlans}
            plansError={plansError}
            plansLoading={plansLoading}
            tenants={tenants}
            tenantsError={tenantsError}
            tenantsLoading={tenantsLoading}
          />
        ) : activeSection === "employee-dashboard" ? (
          isSuperAdmin ? (
            <SuperAdminDashboardSection
              onNavigate={setActiveSection}
              plans={superAdminPlans}
              plansError={plansError}
              plansLoading={plansLoading}
              tenants={tenants}
              tenantsError={tenantsError}
              tenantsLoading={tenantsLoading}
            />
          ) : (
            <EmployeeDashboardSection onNavigate={(section) => setActiveSection(section as ActiveSection)} />
          )
        ) : activeSection === "applicant-portal" ? (
          <ApplicantPortalSection />
        ) : activeSection === "hr-command-center" ? (
          isSuperAdmin ? (
            <SuperAdminDashboardSection
              onNavigate={setActiveSection}
              plans={superAdminPlans}
              plansError={plansError}
              plansLoading={plansLoading}
              tenants={tenants}
              tenantsError={tenantsError}
              tenantsLoading={tenantsLoading}
            />
          ) : (
            <HRCommandCenterSection isSuperAdmin={isSuperAdmin} onNavigate={(section) => setActiveSection(section as ActiveSection)} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
          )
        ) : activeSection === "hr-dashboard" ? (
          isSuperAdmin ? (
            <SuperAdminDashboardSection
              onNavigate={setActiveSection}
              plans={superAdminPlans}
              plansError={plansError}
              plansLoading={plansLoading}
              tenants={tenants}
              tenantsError={tenantsError}
              tenantsLoading={tenantsLoading}
            />
          ) : (
            <HRDashboardSection isSuperAdmin={isSuperAdmin} onNavigate={(section) => setActiveSection(section as ActiveSection)} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
          )
        ) : activeSection === "inbox" ? (
          <UnifiedInboxSection canUseOperationsWorkbench={canUseOperationsWorkbench} currentUserID={currentUser?.id} folder="inbox" isSuperAdmin={isSuperAdmin} onNavigate={(section) => setActiveSection(section as ActiveSection)} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "completed" ? (
          <UnifiedInboxSection canUseOperationsWorkbench={canUseOperationsWorkbench} currentUserID={currentUser?.id} folder="completed" isSuperAdmin={isSuperAdmin} onNavigate={(section) => setActiveSection(section as ActiveSection)} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "operations-workbench" ? (
          <OperationsWorkbenchSection isSuperAdmin={isSuperAdmin} onNavigate={(section) => setActiveSection(section as ActiveSection)} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "workflow-inbox" ? (
          <WorkflowInboxSection isSuperAdmin={isSuperAdmin} onNavigate={(section) => setActiveSection(section as ActiveSection)} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "hr-helpdesk" ? (
          <HRCaseManagementSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "employee-relations" ? (
          <EmployeeRelationsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "notification-inbox" ? (
          <NotificationInboxSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "job-positions" ? (
          <JobPositionsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "career-site" ? (
          <JobPositionsSection initialMode="career-site" isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "job-requisitions" ? (
          <JobRequisitionsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "job-postings" ? (
          <JobPostingsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "candidates" ? (
          <CandidatesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "candidate-applications" ? (
          <CandidateApplicationsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "interview-rounds" ? (
          <InterviewRoundsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "offer-letters" ? (
          <OfferLettersSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "onboarding-workflows" ? (
          <OnboardingWorkflowsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "candidate-onboarding" ? (
          <CandidateOnboardingProgressSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "celebrations" ? (
          <CelebrationsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "celebration-jobs" ? (
          <CelebrationJobsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "employees" ? (
          <EmployeesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "workforce-hub" ? (
          <WorkforceHubSection isSuperAdmin={isSuperAdmin} onOpenEmployees={() => setActiveSection("employees")} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "engagements" ? (
          <EngagementsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "projects" ? (
          <ProjectsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "work-logs" ? (
          <WorkLogsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "compliance" ? (
          <ComplianceSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "skills" ? (
          <SkillsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "skill-gaps" ? (
          <SkillGapsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "learning" ? (
          <LearningSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "talent-marketplace" ? (
          <TalentMarketplaceSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "okrs" ? (
          <OKRSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "performance" ? (
          <PerformanceSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "wellbeing" ? (
          <WellbeingSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "people-analytics" ? (
          <PeopleAnalyticsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "privacy-ecosystem" ? (
          <PrivacyEcosystemSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "employee-letters" ? (
          <EmployeeLettersSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "agreements" ? (
          <AgreementsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "document-sign" ? (
          <DocumentSignSection />
        ) : activeSection === "employee-exits" ? (
          <EmployeeExitsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "my-onboarding" ? (
          isSuperAdmin ? (
            <EmployeesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
          ) : (
            <EmployeeSelfOnboardingSection />
          )
        ) : activeSection === "portal-branding" ? (
          <PortalBrandingSection currentUser={currentUser} />
        ) : activeSection === "branches" ? (
          <BranchesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "departments" ? (
          <DepartmentsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "designations" ? (
          <DesignationsSection canManageAttendanceRequirement={canManageDesignationAttendanceRequirement} isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "workforce-types" ? (
          <WorkforceTypesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "document-requirements" ? (
          <DocumentRequirementsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "lookups" ? (
          <EmploymentLookupsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "celebration-types" ? (
          <CelebrationTypesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "notification-settings" ? (
          <NotificationSettingsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "notification-center" ? (
          <NotificationCenterSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "communication-providers" ? (
          <CommunicationProviderSettingsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "storage-providers" ? (
          <StorageProviderSettingsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "push-providers" ? (
          <PushProviderSettingsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "financial-years" ? (
          <FinancialYearsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "working-hours" ? (
          <WorkingHoursSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "holidays" ? (
          <HolidaysSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "leave-types" ? (
          <LeaveTypesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "leave-policies" ? (
          <>
            <LeavePoliciesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
            <LeaveFoundationSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
            <LeaveApprovalWorkflowsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
          </>
        ) : activeSection === "attendance-leave-policies" ? (
          <AttendanceLeavePolicySetupSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "leaves" ? (
          <EmployeeLeavesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "leave-approvals" ? (
          <LeaveApprovalsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "leave-reports" ? (
          <LeaveReportsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "reports" ? (
          <ReportsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "insights" ? (
          <InsightsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "attendance" ? (
          <AttendanceSection isSuperAdmin={isSuperAdmin} selfServiceOnly={attendanceSelfServiceOnly} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "shift-scheduling" ? (
          <ShiftSchedulingSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "benefits-claims" ? (
          <BenefitsClaimsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "payroll-settings" ? (
          <PayrollSettingsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "payroll-operations" ? (
          <PayrollOperationsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "flexible-payroll" ? (
          <FlexiblePayrollSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "compensation-review" ? (
          <CompensationReviewSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "succession-planning" ? (
          <SuccessionPlanningSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "asset-access" ? (
          <AssetAccessLifecycleSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "salary-templates" ? (
          <SalaryTemplatesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "employee-salary" ? (
          <EmployeeSalarySection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "payslips" ? (
          <PayslipsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "policies" ? (
          <PoliciesSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "subscription-plans" ? (
          <SubscriptionPlansSection isSuperAdmin={isSuperAdmin} />
        ) : activeSection === "subscriptions" ? (
          <SubscriptionsSection isSuperAdmin={isSuperAdmin} tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "tenant-operations" ? (
          <TenantOperationsGovernanceSection tenants={branchTenantOptions} tenantsError={tenantsError} tenantsLoading={tenantsLoading} />
        ) : activeSection === "signup-requests" ? (
          <SignupRequestsSection
            error={signupRequestsError}
            loading={signupRequestsLoading}
            onManualProvision={manuallyProvisionSignupRequest}
            onRefresh={loadSignupRequests}
            onDeleteRequest={deleteSignupRequest}
            onUpdateRequest={updateSignupRequest}
            requests={signupRequests}
          />
        ) : activeSection === "users" ? (
          <AccessUsersSection error={rolesError} loading={rolesLoading} onRefreshRoles={loadRolesData} roles={roles} />
        ) : activeSection === "tenants" ? (
        <div className="px-4 py-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f1] text-[#588368] shadow-sm">
                  <Building2 className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-black tracking-tight text-[#172033]">Tenants</h1>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
                <Home className="h-3.5 w-3.5" />
                <span>/</span>
                <span>Administration</span>
                <span>/</span>
                <span className="font-semibold text-[#172033]">Tenants</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm" type="button">
                <Download className="h-4 w-4 text-[#588368]" />
                Export
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm" onClick={refreshTenants} type="button">
                <RefreshCw className="h-4 w-4 text-[#588368]" />
                Refresh
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#588368] px-4 py-2 text-sm font-bold text-white shadow-sm" onClick={() => setAddTenantOpen(true)} type="button">
                <Plus className="h-4 w-4" />
                Create Tenant
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tenantStats.map((stat) => (
              <article className="group setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_8px_22px_rgba(23,32,51,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(23,32,51,0.09)]" key={stat.label}>
                <div className={`h-1 ${stat.accent}`} />
                <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6b7280]">{stat.label}</p>
                    <strong className="mt-3 block text-2xl tracking-tight text-[#172033]">{stat.value}</strong>
                    <span className="mt-2 block text-xs font-semibold text-[#588368]">{stat.change}</span>
                  </div>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${stat.tone}`}>{stat.icon}</span>
                </div>
                </div>
              </article>
            ))}
          </div>

          <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
            <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-[#588368]">
                  <Building2 className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-black text-[#172033]">Tenant List</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
                  <input
                    className="h-10 w-full rounded-[5px] border border-[#dbe0e5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#588368] sm:w-[280px]"
                    onChange={(event) => setTenantSearch(event.target.value)}
                    placeholder="Search tenants"
                    value={tenantSearch}
                  />
                </div>
                <select
                  className="h-10 rounded-[5px] border border-[#dbe0e5] bg-white px-4 text-sm font-bold text-[#374151] outline-none focus:border-[#588368]"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Ops">Ops</option>
                </select>
                <select
                  className="h-10 rounded-[5px] border border-[#dbe0e5] bg-white px-4 text-sm font-bold text-[#374151] outline-none focus:border-[#588368]"
                  onChange={(event) => setPlanFilter(event.target.value)}
                  value={planFilter}
                >
                  <option value="all">All Plans</option>
                  {planOptions.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
                {tenantSearch || statusFilter !== "all" || planFilter !== "all" ? (
                  <button
                    className="h-10 rounded-[5px] border border-[#dbe0e5] bg-white px-4 text-sm font-bold text-[#588368]"
                    onClick={() => {
                      setTenantSearch("");
                      setStatusFilter("all");
                      setPlanFilter("all");
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                  <tr>
                    <th className="px-5 py-4">Tenant</th>
                    <th className="px-5 py-4">Subdomain</th>
                    <th className="px-5 py-4">Admin</th>
                    <th className="px-5 py-4">Users</th>
                    <th className="px-5 py-4">Plan</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Joined</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {tenantsLoading ? (
                    <tr>
                      <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={8}>
                        Loading tenants...
                      </td>
                    </tr>
                  ) : tenantsError ? (
                    <tr>
                      <td className="px-5 py-10 text-center" colSpan={8}>
                        <div className="mx-auto max-w-xl rounded-[5px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{tenantsError}</div>
                      </td>
                    </tr>
                  ) : tenants.length === 0 ? (
                    <tr>
                      <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={8}>
                        No tenants found.
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={8}>
                        No tenants match the selected filters.
                      </td>
                    </tr>
                  ) : filteredTenants.map((tenant) => (
                    <tr className="hover:bg-[#f8faf9]" key={tenant.id}>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-[#eef4f1] text-sm font-black text-[#588368]">{tenant.name.slice(0, 2).toUpperCase()}</span>
                          <span>
                            <strong className="block text-sm text-[#111827]">{tenant.name}</strong>
                            <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{tenant.code} · {tenant.kind}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.subdomainUrl}</td>
                      <td className="px-5 py-5 text-sm font-semibold text-[#111827]">{tenant.admin}</td>
                      <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.users}</td>
                      <td className="px-5 py-5">
                        <span className="rounded-full bg-[#f4fbf8] px-3 py-1 text-xs font-bold text-[#588368]">{tenant.plan}</span>
                      </td>
                      <td className="px-5 py-5">
                        <TenantStatus status={tenant.status} />
                      </td>
                      <td className="px-5 py-5 text-sm text-[#4b5563]">{tenant.joined}</td>
                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          <TenantActionButton icon={<WorkflowIcon />} label="Governance queue" onClick={() => setActiveSection("tenant-operations")} tone="brand" />
                          <TenantActionButton icon={<EyeIcon />} label="View tenant" onClick={() => setViewTenant(tenant)} />
                          <TenantActionButton icon={<EditIcon />} label="Edit tenant" onClick={() => setEditTenant(tenant)} />
                          <TenantActionButton icon={<UsersIcon />} label="Tenant users" onClick={() => setUsersTenant(tenant)} />
                          <TenantActionButton icon={<PaletteIcon />} label="Tenant branding" onClick={() => setBrandingTenant(tenant)} tone="brand" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#edf1ef] p-5 text-sm text-[#6b7280] sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filteredTenants.length} of {tenants.length} tenant{tenants.length === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <button className="rounded-[5px] border border-[#dbe0e5] px-3 py-2 font-semibold text-[#374151]" type="button">Previous</button>
                <button className="rounded-[5px] bg-[#588368] px-3 py-2 font-semibold text-white" type="button">1</button>
                <button className="rounded-[5px] border border-[#dbe0e5] px-3 py-2 font-semibold text-[#374151]" type="button">2</button>
                <button className="rounded-[5px] border border-[#dbe0e5] px-3 py-2 font-semibold text-[#374151]" type="button">Next</button>
              </div>
            </div>
          </section>
        </div>
        ) : (
          <RolesSection permissions={permissions} roles={roles} loading={rolesLoading} error={rolesError} onRefresh={loadRolesData} />
        )}
      </section>
      {addTenantOpen ? (
        <AddTenantModal
          countries={masterCountries}
          masterDataError={masterDataError}
          masterDataLoading={masterDataLoading}
          onClose={() => setAddTenantOpen(false)}
          plans={superAdminPlans}
          plansError={plansError}
          plansLoading={plansLoading}
          timezones={masterTimezones}
          onCreated={() => {
            refreshTenants();
          }}
        />
      ) : null}
      {viewTenant ? <TenantViewModal onClose={() => setViewTenant(null)} tenant={viewTenant} /> : null}
      {editTenant ? (
        <TenantEditModal
          onClose={() => setEditTenant(null)}
          onSaved={() => {
            setEditTenant(null);
            refreshTenants();
          }}
          tenant={editTenant}
        />
      ) : null}
      {brandingTenant ? <TenantBrandingModal onClose={() => setBrandingTenant(null)} tenant={brandingTenant} /> : null}
      {usersTenant ? <TenantUsersModal onClose={() => setUsersTenant(null)} tenant={usersTenant} /> : null}
    </main>
  );
}

function SuperAdminDashboardSection({
  tenants,
  tenantsLoading,
  tenantsError,
  plans,
  plansLoading,
  plansError,
  onNavigate,
}: {
  tenants: TenantRow[];
  tenantsLoading: boolean;
  tenantsError: string;
  plans: TenantCatalogPlan[];
  plansLoading: boolean;
  plansError: string;
  onNavigate: (section: ActiveSection) => void;
}) {
  const customerTenants = tenants.filter((tenant) => tenant.kind !== "ops");
  const activeTenants = customerTenants.filter((tenant) => tenant.status === "Active");
  const inactiveTenants = customerTenants.filter((tenant) => tenant.status === "Inactive");
  const pendingTenants = customerTenants.filter((tenant) => tenant.status === "Pending");
  const assignedPlanTenants = customerTenants.filter((tenant) => normalizeEditablePlan(tenant.plan));
  const matchedPlanTenants = assignedPlanTenants
    .map((tenant) => ({ plan: findMatchingCatalogPlan(plans, tenant.plan), tenant }))
    .filter((row): row is { tenant: TenantRow; plan: TenantCatalogPlan } => Boolean(row.plan));
  const estimatedMrr = matchedPlanTenants.reduce((sum, row) => sum + monthlyPlanValue(row.plan), 0);
  const currency = matchedPlanTenants[0]?.plan.currency_code || "INR";
  const activeRatio = customerTenants.length ? Math.round((activeTenants.length / customerTenants.length) * 100) : 0;
  const planCoverage = customerTenants.length ? Math.round((assignedPlanTenants.length / customerTenants.length) * 100) : 0;
  const publicPlans = plans.filter((plan) => plan.visibility !== "internal").length;
  const internalPlans = plans.filter((plan) => plan.visibility === "internal").length;
  const planCounts = matchedPlanTenants.reduce<Record<string, { count: number; revenue: number; visibility: string }>>((acc, row) => {
    const key = row.plan.name;
    acc[key] = acc[key] || { count: 0, revenue: 0, visibility: row.plan.visibility };
    acc[key].count += 1;
    acc[key].revenue += monthlyPlanValue(row.plan);
    return acc;
  }, {});
  const planMix = Object.entries(planCounts)
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const riskTenants = customerTenants
    .filter((tenant) => tenant.status !== "Active" || !normalizeEditablePlan(tenant.plan) || tenant.admin === "Not assigned")
    .slice(0, 6);
  const recentTenants = [...customerTenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const maxPlanRevenue = Math.max(...planMix.map((plan) => plan.revenue), 1);
  const newTenantsThisMonth = customerTenants.filter((tenant) => {
    const created = new Date(tenant.createdAt);
    const now = new Date();
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="px-4 py-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3ee] text-[#588368] shadow-sm">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">Admin Dashboard</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
            <Home className="h-3.5 w-3.5" />
            <span>/</span>
            <span>Super Admin</span>
            <span>/</span>
            <span className="font-semibold text-[#172033]">Dashboard</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm" onClick={() => onNavigate("tenants")} type="button">
            <Building2 className="h-4 w-4 text-[#588368]" />
            Tenant List
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#588368] px-4 py-2 text-sm font-bold text-white shadow-sm" onClick={() => onNavigate("subscription-plans")} type="button">
            <PackageCheck className="h-4 w-4" />
            Plans
          </button>
        </div>
      </div>

      {tenantsError ? <div className="mb-5 rounded-[5px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">{tenantsError}</div> : null}
      {plansError ? <div className="mb-5 rounded-[5px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">Plan catalog unavailable: {plansError}</div> : null}

      <section className="setika-card-rise mb-5 overflow-hidden rounded-2xl border border-[#dfe6e2] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
        <div className="h-1.5 bg-[linear-gradient(90deg,#588368_0%,#e87839_36%,#2f6f7d_70%,#ec4899_100%)]" />
        <div className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#588368] text-lg font-black text-white shadow-[0_10px_18px_rgba(88,131,104,0.26)]">SA</span>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-[#172033]">Welcome Back, Admin</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecfdf3] px-3 py-1 text-[#16803c]"><CheckCircle2 className="h-3.5 w-3.5" />{activeTenants.length} active tenants</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] px-3 py-1 text-[#2563eb]"><CalendarDays className="h-3.5 w-3.5" />{newTenantsThisMonth} new this month</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-3 py-1 text-[#9a5b1f]"><AlertTriangle className="h-3.5 w-3.5" />{riskTenants.length} needs review</span>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
            <div className="rounded-2xl border border-[#d8efe1] bg-[#f3fbf6] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">Active Ratio</p>
              <p className="mt-2 text-2xl font-black text-[#172033]">{tenantsLoading ? "..." : `${activeRatio}%`}</p>
            </div>
            <div className="rounded-2xl border border-[#d7e7ff] bg-[#f1f6ff] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">Plan Coverage</p>
              <p className="mt-2 text-2xl font-black text-[#172033]">{tenantsLoading ? "..." : `${planCoverage}%`}</p>
            </div>
            <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#9a5b1f]">Risk Queue</p>
              <p className="mt-2 text-2xl font-black text-[#172033]">{tenantsLoading ? "..." : riskTenants.length}</p>
            </div>
          </div>
        </div>
        </div>
      </section>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SuperAdminMetricCard label="MRR" value={plansLoading ? "..." : formatMoney(estimatedMrr, currency)} note={`${formatMoney(estimatedMrr * 12, currency)} ARR projection`} tone="revenue" />
        <SuperAdminMetricCard label="Active Tenants" value={tenantsLoading ? "..." : String(activeTenants.length)} note={`${inactiveTenants.length} inactive, ${pendingTenants.length} pending`} tone="tenants" />
        <SuperAdminMetricCard label="Assigned Plans" value={tenantsLoading ? "..." : String(assignedPlanTenants.length)} note={`${matchedPlanTenants.length} matched to catalog`} tone="plans" />
        <SuperAdminMetricCard label="Catalog" value={plansLoading ? "..." : String(plans.length)} note={`${publicPlans} public, ${internalPlans} internal`} tone="catalog" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_8px_22px_rgba(23,32,51,0.05)]">
          <div className="border-b border-[#edf1ef] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                <BarChart3 className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-black text-[#172033]">Plan Mix</h2>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {plansLoading || tenantsLoading ? (
              <p className="rounded-xl bg-[#f8faf9] p-4 text-sm font-bold text-[#6b7280]">Loading plan mix...</p>
            ) : planMix.length === 0 ? (
              <p className="rounded-xl bg-[#f8faf9] p-4 text-sm font-bold text-[#6b7280]">No tenant is assigned to a matching active catalog plan yet.</p>
            ) : (
              planMix.map((plan, index) => (
                <div key={plan.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-black text-[#172033]">{plan.name}</span>
                    <span className="font-bold text-[#6b7280]">
                      {plan.count} tenant{plan.count === 1 ? "" : "s"} · {formatMoney(plan.revenue, currency)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#eef4f1]">
                    <div className={`h-full rounded-full ${["bg-[#e87839]", "bg-[#588368]", "bg-[#3b82f6]", "bg-[#ec4899]", "bg-[#374151]"][index % 5]}`} style={{ width: `${Math.max(8, Math.round((plan.revenue / maxPlanRevenue) * 100))}%` }} />
                  </div>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-[#8a978f]">{plan.visibility === "internal" ? "Negotiated internal" : "Public pricing"}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_8px_22px_rgba(23,32,51,0.05)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf1ef] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] text-[#c05621]">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-black text-[#172033]">Action Queue</h2>
            </div>
            <button className="rounded-xl border border-[#dbe0e5] px-3 py-2 text-sm font-bold text-[#588368]" onClick={() => onNavigate("tenants")} type="button">
              Review
            </button>
          </div>
          <div className="space-y-3 p-5">
            {tenantsLoading ? (
              <p className="rounded-xl bg-[#f8faf9] p-4 text-sm font-bold text-[#6b7280]">Loading tenant risks...</p>
            ) : riskTenants.length === 0 ? (
              <p className="rounded-xl bg-[#f4fbf6] p-4 text-sm font-bold text-[#588368]">No tenant setup risks detected from the current list.</p>
            ) : (
              riskTenants.map((tenant) => (
                <div className="rounded-xl border border-[#edf1ef] bg-[#fffdf9] p-4" key={tenant.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#172033]">{tenant.name}</p>
                      <p className="mt-1 text-xs font-bold text-[#6b7280]">{tenant.admin}</p>
                    </div>
                    <TenantStatus status={tenant.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    {!normalizeEditablePlan(tenant.plan) ? <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[#9a5b1f]">No plan</span> : null}
                    {tenant.admin === "Not assigned" ? <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-[#2563eb]">No admin</span> : null}
                    {tenant.status !== "Active" ? <span className="rounded-full bg-[#fef2f2] px-2.5 py-1 text-[#b42318]">Lifecycle</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="setika-card-rise rounded-2xl border border-[#e2e8e4] bg-white p-5 shadow-[0_8px_22px_rgba(23,32,51,0.05)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-[#588368]">
              <Settings2 className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-black text-[#172033]">Operating Shortcuts</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SuperAdminShortcut label="Assign Plans" note="Fix tenant subscription and limits" onClick={() => onNavigate("tenants")} />
            <SuperAdminShortcut label="Edit Catalog" note="Public and internal packages" onClick={() => onNavigate("subscription-plans")} />
            <SuperAdminShortcut label="Subscriptions" note="Review current tenant records" onClick={() => onNavigate("subscriptions")} />
            <SuperAdminShortcut label="Roles" note="Check platform permissions" onClick={() => onNavigate("roles")} />
          </div>
        </section>

        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_8px_22px_rgba(23,32,51,0.05)]">
          <div className="border-b border-[#edf1ef] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf2f8] text-[#db2777]">
                <Building2 className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-black text-[#172033]">Recently Added Tenants</h2>
            </div>
          </div>
          <div className="divide-y divide-[#edf1ef]">
            {tenantsLoading ? (
              <p className="p-5 text-sm font-bold text-[#6b7280]">Loading tenants...</p>
            ) : recentTenants.length === 0 ? (
              <p className="p-5 text-sm font-bold text-[#6b7280]">No customer tenants found.</p>
            ) : (
              recentTenants.map((tenant) => (
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" key={tenant.id}>
                  <div>
                    <p className="font-black text-[#172033]">{tenant.name}</p>
                    <p className="mt-1 text-sm font-semibold text-[#6b7280]">{tenant.joined} · {tenant.plan}</p>
                  </div>
                  <TenantStatus status={tenant.status} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SuperAdminMetricCard({ label, value, note, tone }: { label: string; value: string; note: string; tone: "revenue" | "tenants" | "plans" | "catalog" }) {
  const config = {
    catalog: {
      accent: "bg-[#374151]",
      icon: <BriefcaseBusiness className="h-5 w-5" />,
      tile: "bg-[#f3f4f6] text-[#374151]",
      note: "text-[#4b5563]",
    },
    plans: {
      accent: "bg-[#3b82f6]",
      icon: <PackageCheck className="h-5 w-5" />,
      tile: "bg-[#eff6ff] text-[#2563eb]",
      note: "text-[#2563eb]",
    },
    revenue: {
      accent: "bg-[#e87839]",
      icon: <WalletCards className="h-5 w-5" />,
      tile: "bg-[#fff7ed] text-[#c05621]",
      note: "text-[#9a5b1f]",
    },
    tenants: {
      accent: "bg-[#22c55e]",
      icon: <UsersRound className="h-5 w-5" />,
      tile: "bg-[#ecfdf3] text-[#16803c]",
      note: "text-[#16803c]",
    },
  }[tone];

  return (
    <article className="group setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_8px_22px_rgba(23,32,51,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(23,32,51,0.09)]">
      <div className={`h-1 ${config.accent}`} />
      <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p>
          <strong className="mt-3 block text-2xl tracking-tight text-[#172033]">{value}</strong>
          <span className={`mt-2 block text-xs font-bold ${config.note}`}>{note}</span>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.tile}`}>{config.icon}</span>
      </div>
      </div>
    </article>
  );
}

function SuperAdminShortcut({ label, note, onClick }: { label: string; note: string; onClick: () => void }) {
  return (
    <button className="group flex items-center justify-between gap-3 rounded-2xl border border-[#dbe0e5] bg-[#f8faf9] p-4 text-left transition hover:border-[#588368] hover:bg-white hover:shadow-sm" onClick={onClick} type="button">
      <span>
      <span className="block text-sm font-black text-[#172033]">{label}</span>
      <span className="mt-1 block text-xs font-bold text-[#6b7280]">{note}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-[#8a978f] transition group-hover:text-[#588368]" />
    </button>
  );
}

function TenantActionButton({
  icon,
  label,
  onClick,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "brand";
}) {
  const className =
    tone === "brand"
      ? "bg-[#588368] text-white shadow-sm hover:bg-[#456d58]"
      : "border border-[#dbe0e5] bg-white text-[#374151] shadow-sm hover:border-[#588368] hover:bg-[#f4fbf8] hover:text-[#588368]";

  return (
    <button
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition hover:-translate-y-0.5 ${className}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function WorkflowIcon() {
  return <Workflow aria-hidden="true" className="h-4 w-4" />;
}

function EyeIcon() {
  return <Eye aria-hidden="true" className="h-4 w-4" />;
}

function EditIcon() {
  return <Edit3 aria-hidden="true" className="h-4 w-4" />;
}

function UsersIcon() {
  return <UsersRound aria-hidden="true" className="h-4 w-4" />;
}

function PaletteIcon() {
  return <Palette aria-hidden="true" className="h-4 w-4" />;
}

function TenantStatus({ status }: { status: string }) {
  const className =
    status === "Active"
      ? "bg-[#ecfdf3] text-[#16803c] ring-[#bceccc]"
      : status === "Ops"
        ? "bg-[#eef4f1] text-[#456d58] ring-[#d8efe1]"
      : status === "Inactive"
        ? "bg-[#fff4ed] text-[#b54708] ring-[#fed7aa]"
        : "bg-[#eff6ff] text-[#2563eb] ring-[#bfdbfe]";

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>{status}</span>;
}

function SignupRequestsSection({
  requests,
  loading,
  error,
  onRefresh,
  onManualProvision,
  onDeleteRequest,
  onUpdateRequest,
}: {
  requests: SignupIntent[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onManualProvision: (intentID: string) => Promise<AssistedTenantProvisionResponse>;
  onDeleteRequest: (intentID: string) => Promise<void>;
  onUpdateRequest: (intentID: string, payload: SignupIntentEditForm) => Promise<SignupIntent>;
}) {
  const [actionID, setActionID] = useState("");
  const [deleteID, setDeleteID] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState<AssistedTenantProvisionResponse | null>(null);
  const [editRequest, setEditRequest] = useState<SignupIntent | null>(null);
  const [editForm, setEditForm] = useState<SignupIntentEditForm>(emptySignupIntentEditForm());
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const pendingRequests = requests.filter((request) => request.status === "pending_email_verification" || request.status === "email_verified");
  const emailVerifiedRequests = requests.filter((request) => request.status === "email_verified");
  const sortedRequests = [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function handleManualProvision(request: SignupIntent) {
    const confirmed = window.confirm(`Create tenant for ${request.company_name} after call verification?\n\nOnly continue if you verified ${request.email} or ${request.mobile} with the customer.`);
    if (!confirmed) return;
    setActionID(request.id);
    setActionError("");
    setSuccess(null);
    try {
      const result = await onManualProvision(request.id);
      setSuccess(result);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to provision signup request");
    } finally {
      setActionID("");
    }
  }

  async function handleDeleteRequest(request: SignupIntent) {
    if (request.status === "provisioned" || request.provisioned_tenant_id) {
      setActionError("Provisioned signup requests cannot be deleted from this screen.");
      return;
    }
    const confirmed = window.prompt(`This permanently deletes the signup request for ${request.company_name}.\n\nIt will not delete any tenant or user records.\n\nType DELETE to continue.`);
    if (confirmed !== "DELETE") return;
    setDeleteID(request.id);
    setActionError("");
    setSuccess(null);
    try {
      await onDeleteRequest(request.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to delete signup request");
    } finally {
      setDeleteID("");
    }
  }

  function openEditRequest(request: SignupIntent) {
    setEditRequest(request);
    setEditError("");
    setEditForm({
      first_name: request.first_name,
      last_name: request.last_name,
      email: request.email,
      mobile: request.mobile,
      company_name: request.company_name,
      subdomain: request.subdomain,
      country: request.country || "IN",
      timezone: request.timezone || "Asia/Kolkata",
      trial_days: String(request.trial_days || 30),
    });
  }

  async function saveEditRequest() {
    if (!editRequest) return;
    const validationError = validateSignupIntentEditForm(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await onUpdateRequest(editRequest.id, editForm);
      setEditRequest(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to update signup request");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="px-4 py-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#c05621] shadow-sm">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">Signup Requests</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
            <Home className="h-3.5 w-3.5" />
            <span>/</span>
            <span>Super Admin</span>
            <span>/</span>
            <span className="font-semibold text-[#172033]">Signup Requests</span>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm" onClick={onRefresh} type="button">
          <RefreshCw className="h-4 w-4 text-[#588368]" />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <SignupRequestMetric icon={<Clock3 className="h-5 w-5" />} label="Waiting" tone="orange" value={String(pendingRequests.length)} />
        <SignupRequestMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Email Verified" tone="green" value={String(emailVerifiedRequests.length)} />
        <SignupRequestMetric icon={<Mail className="h-5 w-5" />} label="Active Queue" tone="blue" value={String(requests.length)} />
      </div>

      {error ? <div className="mb-5 rounded-[5px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">{error}</div> : null}
      {actionError ? <div className="mb-5 rounded-[5px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">{actionError}</div> : null}
      {success ? (
        <div className="mb-5 rounded-2xl border border-[#ccebd8] bg-[#f4fbf8] p-5 text-sm font-bold text-[#456d58] shadow-sm">
          Tenant created for {success.tenant_name}. Admin: {success.admin_email}. Workspace:{" "}
          <a className="underline" href={success.tenant_url} rel="noreferrer" target="_blank">{success.tenant_url}</a>
        </div>
      ) : null}

      <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#172033]">Public Trial Requests</h2>
            <p className="mt-1 text-sm font-semibold text-[#6b7280]">Use this queue when email delivery fails or a customer needs phone-assisted verification.</p>
          </div>
          <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-black text-[#9a5b1f]">{pendingRequests.length} waiting</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
              <tr>
                <th className="px-5 py-4">Company</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Workspace</th>
                <th className="px-5 py-4">Email Status</th>
                <th className="px-5 py-4">Sent / Expires</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {loading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>
                    Loading signup requests...
                  </td>
                </tr>
              ) : sortedRequests.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={6}>
                    No pending public signup requests found.
                  </td>
                </tr>
              ) : sortedRequests.map((request) => {
                const canManualProvision = request.status === "pending_email_verification" || request.status === "email_verified";
                const canDelete = request.status !== "provisioned" && !request.provisioned_tenant_id;
                const fullName = `${request.first_name} ${request.last_name}`.trim() || "Customer";
                return (
                  <tr className="hover:bg-[#f8faf9]" key={request.id}>
                    <td className="px-5 py-5">
                      <strong className="block text-sm text-[#172033]">{request.company_name}</strong>
                      <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{request.country} · {request.timezone} · {request.trial_days} day trial</span>
                    </td>
                    <td className="px-5 py-5">
                      <strong className="block text-sm text-[#172033]">{fullName}</strong>
                      <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-[#6b7280]">
                        <a className="inline-flex items-center gap-1.5 hover:text-[#588368]" href={`mailto:${request.email}`}><Mail className="h-3.5 w-3.5" />{request.email}</a>
                        <a className="inline-flex items-center gap-1.5 hover:text-[#588368]" href={`tel:${request.mobile}`}><Phone className="h-3.5 w-3.5" />{request.mobile}</a>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <a className="break-all text-sm font-semibold text-[#588368] hover:underline" href={request.tenant_url} rel="noreferrer" target="_blank">{request.tenant_url}</a>
                    </td>
                    <td className="px-5 py-5">
                      <SignupRequestStatus request={request} />
                    </td>
                    <td className="px-5 py-5 text-xs font-semibold text-[#6b7280]">
                      <span className="block">Sent: {formatDateTime(request.verification_sent_at)}</span>
                      <span className="mt-1 block">Expires: {formatDateTime(request.expires_at)}</span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        {canManualProvision ? (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-3 text-xs font-bold text-[#374151] shadow-sm hover:border-[#588368] hover:text-[#588368]"
                            onClick={() => openEditRequest(request)}
                            type="button"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 shadow-sm hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={deleteID === request.id}
                            onClick={() => void handleDeleteRequest(request)}
                            type="button"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {deleteID === request.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                        <a className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-3 text-xs font-bold text-[#374151] shadow-sm hover:border-[#588368] hover:text-[#588368]" href={`tel:${request.mobile}`}>
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </a>
                        {canManualProvision ? (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#588368] px-3 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={actionID === request.id}
                            onClick={() => void handleManualProvision(request)}
                            type="button"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            {actionID === request.id ? "Creating..." : "Call Verified"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editRequest ? (
        <SignupRequestEditModal
          error={editError}
          form={editForm}
          onChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))}
          onClose={() => setEditRequest(null)}
          onSave={() => void saveEditRequest()}
          request={editRequest}
          saving={editSaving}
        />
      ) : null}
    </div>
  );
}

function emptySignupIntentEditForm(): SignupIntentEditForm {
  return {
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    company_name: "",
    subdomain: "",
    country: "IN",
    timezone: "Asia/Kolkata",
    trial_days: "30",
  };
}

function validateSignupIntentEditForm(form: SignupIntentEditForm) {
  if (!form.first_name.trim() || !form.last_name.trim() || !form.company_name.trim() || !form.email.trim() || !form.mobile.trim() || !form.subdomain.trim()) {
    return "First name, last name, company, email, mobile, and workspace address are required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Email is invalid.";
  }
  const subdomainError = validateTenantSubdomain(form.subdomain.trim().toLowerCase());
  if (subdomainError) {
    return subdomainError;
  }
  const trialDays = Number(form.trial_days || 0);
  if (!Number.isFinite(trialDays) || trialDays < 0 || trialDays > 365) {
    return "Trial days must be between 0 and 365.";
  }
  return "";
}

function SignupRequestEditModal({
  request,
  form,
  error,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  request: SignupIntent;
  form: SignupIntentEditForm;
  error: string;
  saving: boolean;
  onChange: (field: keyof SignupIntentEditForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const emailLocked = Boolean(request.email_verified_at || request.status === "email_verified");
  const baseDomain = getTenantBaseDomain();
  const workspace = form.subdomain.trim().toLowerCase();
  const workspaceURL = workspace ? `https://${tenantHost(workspace, baseDomain)}` : `https://workspace.${baseDomain}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1ef] bg-[#f8faf9] px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-[#172033]">Edit Signup Request</h2>
            <p className="mt-1 text-sm font-semibold text-[#6b7280]">Correct details before call verification and tenant creation.</p>
          </div>
          <button className="rounded-xl border border-[#dbe0e5] bg-white px-3 py-2 text-xs font-bold text-[#374151]" onClick={onClose} type="button">Close</button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto p-6">
          {error ? <div className="mb-5 rounded-[5px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
          {emailLocked ? <div className="mb-5 rounded-[5px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-bold text-[#2563eb]">Email is already verified, so it cannot be changed.</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <SignupEditField label="First Name" value={form.first_name} onChange={(value) => onChange("first_name", value)} />
            <SignupEditField label="Last Name" value={form.last_name} onChange={(value) => onChange("last_name", value)} />
            <SignupEditField disabled={emailLocked} label="Email" type="email" value={form.email} onChange={(value) => onChange("email", value)} />
            <SignupEditField label="Mobile" value={form.mobile} onChange={(value) => onChange("mobile", value)} />
            <SignupEditField label="Company Name" value={form.company_name} onChange={(value) => onChange("company_name", value)} />
            <SignupEditField label="Workspace Address" value={form.subdomain} onChange={(value) => onChange("subdomain", value.trim().toLowerCase())} />
            <SignupEditField label="Country" value={form.country} onChange={(value) => onChange("country", value.toUpperCase())} />
            <SignupEditField label="Timezone" value={form.timezone} onChange={(value) => onChange("timezone", value)} />
            <SignupEditField label="Trial Days" min={0} max={365} type="number" value={form.trial_days} onChange={(value) => onChange("trial_days", value)} />
          </div>
          <div className="mt-5 rounded-[5px] border border-[#dbe8e1] bg-[#f8faf9] px-4 py-3 text-sm font-bold text-[#456d58]">
            Workspace URL: <span className="break-all text-[#172033]">{workspaceURL}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#edf1ef] px-6 py-4">
          <button className="rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151]" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-xl bg-[#588368] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} onClick={onSave} type="button">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SignupEditField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <label className="text-sm font-black text-[#374151]">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-xl border border-[#dbe0e5] bg-white px-4 text-sm font-semibold text-[#172033] outline-none focus:border-[#588368] disabled:bg-[#f3f4f6] disabled:text-[#6b7280]"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function SignupRequestMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "green" | "orange" | "blue" }) {
  const config = {
    blue: "border-[#d7e7ff] bg-[#f1f6ff] text-[#2563eb]",
    green: "border-[#d8efe1] bg-[#f3fbf6] text-[#16803c]",
    orange: "border-[#fed7aa] bg-[#fff7ed] text-[#c05621]",
  }[tone];
  return (
    <article className={`setika-card-rise rounded-2xl border p-4 shadow-[0_8px_22px_rgba(23,32,51,0.05)] ${config}`}>
      <div className="flex items-center justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">{icon}</span>
        <strong className="text-2xl font-black text-[#172033]">{value}</strong>
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-wide">{label}</p>
    </article>
  );
}

function SignupRequestStatus({ request }: { request: SignupIntent }) {
  const label = request.status === "pending_email_verification"
    ? request.email_token_expired ? "Email expired" : "Email pending"
    : request.status.replaceAll("_", " ");
  const className = request.status === "provisioned"
    ? "bg-[#ecfdf3] text-[#16803c] ring-[#bceccc]"
    : request.status === "cancelled" || request.status === "expired" || request.email_token_expired
      ? "bg-[#fef2f2] text-[#b42318] ring-[#fecaca]"
      : request.status === "email_verified"
        ? "bg-[#eff6ff] text-[#2563eb] ring-[#bfdbfe]"
        : "bg-[#fff7ed] text-[#9a5b1f] ring-[#fed7aa]";
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${className}`}>{label}</span>;
}

const platformRoleCodes = new Set([
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "PLATFORM_STAFF",
  "PLATFORM_SUPPORT",
  "BILLING_OPS",
  "ACCESS_ADMIN",
  "AUDITOR",
  "READ_ONLY_AUDITOR",
  "SUPPORT_AGENT",
  "IMPLEMENTATION_SPECIALIST",
  "PRODUCT_MANAGER",
]);

const tenantRoleCodes = new Set([
  "TENANT_ADMIN",
  "HR",
  "HR_ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "APPLICANT",
  "PAYROLL_ADMIN",
  "RECRUITER",
]);

const platformRoleTemplates = [
  {
    name: "Platform Admin",
    code: "PLATFORM_ADMIN",
    description: "Platform operator for tenant, subscription, and support oversight.",
    permissions: ["platform.tenants.read", "platform.tenants.update", "platform.subscriptions.read", "platform.support.read"],
  },
  {
    name: "Platform Support",
    code: "PLATFORM_SUPPORT",
    description: "Support operator for tenant lookup and governed support work.",
    permissions: ["platform.tenants.read", "platform.support.read", "platform.support.manage"],
  },
  {
    name: "Billing Ops",
    code: "BILLING_OPS",
    description: "Commercial operator for tenant subscriptions and billing review.",
    permissions: ["platform.subscriptions.read", "platform.subscriptions.update", "platform.billing.read"],
  },
  {
    name: "Access Admin",
    code: "ACCESS_ADMIN",
    description: "Platform access operator for users, roles, and assignments.",
    permissions: ["platform.users.read", "platform.users.create", "platform.users.update", "platform.roles.read", "platform.roles.create", "platform.roles.update", "platform.roles.assign"],
  },
  {
    name: "Read-only Auditor",
    code: "READ_ONLY_AUDITOR",
    description: "Read-only reviewer for platform tenants, subscriptions, and audit.",
    permissions: ["platform.tenants.read", "platform.subscriptions.read", "platform.audit.read"],
  },
] as const;

function permissionDisplayName(permission: IdentityPermission) {
  if (!permission.module) return permission.key;
  return permission.key.startsWith(`${permission.module}.`) ? permission.key : `${permission.module}.${permission.key}`;
}

function roleCode(role: IdentityRole) {
  return role.code?.trim() || role.name.trim();
}

function roleName(role: IdentityRole) {
  return role.name || role.code || "Role";
}

function userName(user: IdentityUser) {
  return `${user.first_name} ${user.last_name}`.trim() || user.email || "User";
}

function roleSummary(roles: IdentityRole[]) {
  return roles.length ? roles.map(roleName).join(", ") : "No role assigned";
}

function roleTenantKind(role: IdentityRole) {
  return (role.tenant_kind || role.tenantKind || "").trim().toLowerCase();
}

function isTenantScopedRole(role: IdentityRole) {
  const code = normalizeRoleCode(roleCode(role));
  const name = normalizeRoleCode(roleName(role));
  return roleTenantKind(role) === "customer" || tenantRoleCodes.has(code) || tenantRoleCodes.has(name);
}

function isPlatformRole(role: IdentityRole) {
  const code = normalizeRoleCode(roleCode(role));
  const name = normalizeRoleCode(roleName(role));
  if (isTenantScopedRole(role)) {
    return false;
  }
  if (roleTenantKind(role) === "ops") {
    return true;
  }
  return platformRoleCodes.has(code) || platformRoleCodes.has(name);
}

function availableTemplatePermissionIDs(template: (typeof platformRoleTemplates)[number], permissions: IdentityPermission[]) {
  const allowed = new Set<string>(template.permissions);
  return permissions.filter((permission) => allowed.has(permissionDisplayName(permission))).map((permission) => permission.id);
}

function missingTemplatePermissionCount(template: (typeof platformRoleTemplates)[number], permissions: IdentityPermission[]) {
  const available = new Set(permissions.map(permissionDisplayName));
  return template.permissions.filter((permission) => !available.has(permission)).length;
}

function AccessUsersSection({
  roles,
  loading,
  error,
  onRefreshRoles,
}: {
  roles: IdentityRole[];
  loading: boolean;
  error: string;
  onRefreshRoles: () => void | Promise<void>;
}) {
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleMap>({});
  const [search, setSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [message, setMessage] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<IdentityUser | null>(null);
  // Temporary frontend containment only. Backend role-scope enforcement is still required,
  // and tenant role management must stay separate from platform access management.
  const platformRoles = roles.filter(isPlatformRole);
  const hiddenRoleCount = Math.max(roles.length - platformRoles.length, 0);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const result = await apiRequest<IdentityUser[]>("/users/");
      setUsers(result);
      const rolePairs = await Promise.all(
        result.map(async (user) => {
          try {
            const assigned = await apiRequest<IdentityRole[]>(`/users/${user.id}/roles`);
            return [user.id, assigned.filter(isPlatformRole)] as const;
          } catch {
            return [user.id, []] as const;
          }
        }),
      );
      setUserRoles(Object.fromEntries(rolePairs));
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadUsers();
      if (roles.length === 0) void onRefreshRoles();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers, onRefreshRoles, roles.length]);

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [userName(user), user.email, user.mobile, roleSummary(userRoles[user.id] || []), user.is_active ? "active" : "inactive"].some((value) => value.toLowerCase().includes(query));
  });

  async function afterSaved(nextMessage: string) {
    setAddingUser(false);
    setEditingUser(null);
    setMessage(nextMessage);
    await loadUsers();
  }

  return (
    <div className="px-4 py-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f1] text-[#588368] shadow-sm">
              <UserCog className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">Platform Users</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
            <Home className="h-3.5 w-3.5" />
            <span>/</span>
            <span>Platform Access</span>
            <span>/</span>
            <span className="font-semibold text-[#172033]">Platform Users</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm" onClick={() => void loadUsers()} type="button">
            <RefreshCw className="h-4 w-4 text-[#588368]" />
            Refresh
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#588368] px-4 py-2 text-sm font-bold text-white shadow-sm"
            onClick={() => {
              setAddingUser(true);
              setEditingUser(null);
              setMessage("");
              setUsersError("");
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Add Platform User
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
          <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-[#588368]">
                <UsersRound className="h-5 w-5" />
              </span>
              <div>
              <h2 className="text-xl font-black text-[#172033]">Platform Users</h2>
              <p className="mt-1 text-sm text-[#6b7280]">Assign platform roles to platform users. Permissions are inherited from each platform role.</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
              <input className="h-11 w-full rounded-lg border border-[#dbe0e5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder="Search users or roles" value={search} />
            </div>
          </div>

          <p className="m-5 rounded-lg border border-[#dbe0e5] bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#4b5563]">
            Some tenant-scoped roles are hidden from Platform Access. Tenant role management will be handled in tenant context.
            {hiddenRoleCount > 0 ? ` ${hiddenRoleCount} tenant-scoped or unclassified role${hiddenRoleCount === 1 ? " is" : "s are"} hidden from Platform Access.` : ""}
          </p>
          {usersError ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{usersError}</p> : null}
          {error ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="m-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Roles</th>
                  <th className="px-5 py-4">Mobile</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {usersLoading ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No users found.</td>
                  </tr>
                ) : filteredUsers.map((user) => {
                  const fullName = userName(user);
                  const assigned = userRoles[user.id] || [];
                  return (
                    <tr className="hover:bg-[#f8faf9]" key={user.id}>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-xs font-black text-[#588368]">{fullName.slice(0, 2).toUpperCase()}</span>
                          <span>
                            <strong className="block text-sm text-[#111827]">{fullName}</strong>
                            <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{user.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex max-w-[360px] flex-wrap gap-2">
                          {assigned.length ? assigned.map((role) => <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-black text-[#588368]" key={role.id}>{roleName(role)}</span>) : <span className="text-sm font-semibold text-[#9ca3af]">No role assigned</span>}
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-[#4b5563]">{user.mobile || "-"}</td>
                      <td className="px-5 py-5">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${user.is_active ? "bg-[#ecfdf3] text-[#16803c]" : "bg-[#fff4ed] text-[#b54708]"}`}>{user.is_active ? "Active" : "Inactive"}</span>
                        {user.is_locked ? <span className="ml-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">Locked</span> : null}
                      </td>
                      <td className="px-5 py-5 text-right">
                        <button
                          className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-bold text-[#588368]"
                          onClick={() => {
                            setEditingUser(user);
                            setAddingUser(false);
                            setMessage("");
                            setUsersError("");
                          }}
                          type="button"
                        >
                          Edit Access
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#edf1ef] p-5 text-sm text-[#6b7280]">Showing {filteredUsers.length} of {users.length} user{users.length === 1 ? "" : "s"}</div>
        </section>

        <aside className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-5">
          {addingUser ? (
            <AccessUserForm mode="create" onCancel={() => setAddingUser(false)} onSaved={() => afterSaved("Platform user added with selected roles.")} roles={platformRoles} rolesLoading={loading} />
          ) : editingUser ? (
            <AccessUserForm assignedRoles={userRoles[editingUser.id] || []} mode="edit" onCancel={() => setEditingUser(null)} onSaved={() => afterSaved("Platform user access updated.")} roles={platformRoles} rolesLoading={loading} user={editingUser} />
          ) : (
            <div className="rounded-2xl bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Platform Access</p>
              <h3 className="mt-2 text-2xl font-black text-[#111827]">Manage platform roles</h3>
              <p className="mt-3 text-sm leading-6 text-[#6b7280]">Pick a platform user to change their platform role. To change what a role can do, open Platform Roles.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function AccessUserForm({
  mode,
  user,
  roles,
  assignedRoles = [],
  rolesLoading,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  user?: IdentityUser;
  roles: IdentityRole[];
  assignedRoles?: IdentityRole[];
  rolesLoading: boolean;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const roleOptions = roles.filter((role) => {
    const code = normalizeRoleCode(roleCode(role));
    return code && isPlatformRole(role);
  });
  const defaultCodes = mode === "edit" ? assignedRoles.map(roleCode).map(normalizeRoleCode).filter(Boolean) : [];
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<Set<string>>(new Set(defaultCodes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const visibleSelectedRoleCodes = new Set(Array.from(selectedRoleCodes));

  function toggleRole(code: string) {
    const normalizedCode = normalizeRoleCode(code);
    setSelectedRoleCodes((current) => {
      const next = new Set(current);
      if (next.has(normalizedCode)) next.delete(normalizedCode);
      else next.add(normalizedCode);
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      password,
      roles: Array.from(selectedRoleCodes),
    };
    if (!payload.first_name || !payload.last_name || !payload.mobile || (mode === "create" && (!payload.email || !payload.password))) {
      setSaving(false);
      setError(mode === "create" ? "First name, last name, email, mobile, and password are required." : "First name, last name, and mobile are required.");
      return;
    }
    if (payload.roles.length === 0) {
      setSaving(false);
      setError("Select at least one role for this user.");
      return;
    }
    try {
      if (mode === "create") {
        await apiRequest<IdentityUser>("/users/", {
          method: "POST",
          body: {
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            mobile: payload.mobile,
            password: payload.password,
            roles: payload.roles,
            is_super_admin: false,
          },
        });
      } else if (user) {
        await apiRequest(`/users/${user.id}/`, {
          method: "PUT",
          body: {
            first_name: payload.first_name,
            last_name: payload.last_name,
            mobile: payload.mobile,
            roles: payload.roles,
          },
        });
        if (isActive !== user.is_active) {
          await apiRequest(`/users/${user.id}/${isActive ? "activate" : "deactivate"}`, { method: "PUT" });
        }
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rounded-2xl bg-white p-5" onSubmit={onSubmit}>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">{mode === "create" ? "New Platform User" : "Platform User Access"}</p>
      <h3 className="mt-2 text-2xl font-black text-[#111827]">{mode === "create" ? "Add Platform User" : user ? userName(user) : "Edit Platform User"}</h3>
      <div className="mt-5 space-y-4">
        <TenantInlineField label="First Name" onChange={setFirstName} required value={firstName} />
        <TenantInlineField label="Last Name" onChange={setLastName} required value={lastName} />
        <TenantInlineField disabled={mode === "edit"} label="Email" onChange={setEmail} required={mode === "create"} type="email" value={email} />
        <TenantInlineField label="Mobile" onChange={setMobile} required value={mobile} />
        {mode === "create" ? <TenantInlineField label="Temporary Password" onChange={setPassword} required type="password" value={password} /> : null}
        {mode === "edit" ? (
          <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]">
            <input checked={isActive} className="h-4 w-4 accent-[#588368]" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
            Active user
          </label>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-[#edf1ef]">
        <div className="border-b border-[#edf1ef] p-4">
          <h4 className="text-sm font-black uppercase tracking-wide text-[#111827]">Platform Roles</h4>
          <p className="mt-1 text-xs font-semibold text-[#6b7280]">{visibleSelectedRoleCodes.size} selected</p>
        </div>
        {rolesLoading ? (
          <p className="p-4 text-sm font-semibold text-[#6b7280]">Loading platform roles...</p>
        ) : roleOptions.length === 0 ? (
          <p className="p-4 text-sm font-semibold text-[#6b7280]">No assignable platform roles found. Create roles in Platform Roles first.</p>
        ) : (
          <div className="max-h-[260px] space-y-2 overflow-y-auto p-3">
            {roleOptions.map((role) => {
              const code = normalizeRoleCode(roleCode(role));
              return (
                <label className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-[#f8faf9]" key={role.id}>
                  <input checked={visibleSelectedRoleCodes.has(code)} className="mt-1 h-4 w-4 accent-[#588368]" onChange={() => toggleRole(code)} type="checkbox" />
                  <span>
                    <strong className="block text-sm text-[#111827]">{roleName(role)}</strong>
                    <span className="mt-0.5 block text-xs font-semibold text-[#6b7280]">{code}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs font-semibold text-[#6b7280]">Only platform roles are shown here. Tenant employee and HR roles are hidden from this platform access flow.</p>
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-semibold text-[#374151]" onClick={onCancel} type="button">Cancel</button>
        <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving || rolesLoading} type="submit">
          {saving ? "Saving..." : mode === "create" ? "Add Platform User" : "Save Access"}
        </button>
      </div>
    </form>
  );
}

function RolesSection({
  roles,
  permissions,
  loading,
  error,
  onRefresh,
}: {
  roles: IdentityRole[];
  permissions: IdentityPermission[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
}) {
  const [roleSearch, setRoleSearch] = useState("");
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [editRole, setEditRole] = useState<IdentityRole | null>(null);
  const [preparingRoleForm, setPreparingRoleForm] = useState(false);
  // Temporary frontend containment only. Backend role-scope enforcement is still required,
  // and tenant role management must be handled separately in tenant context.
  const platformRoles = roles.filter(isPlatformRole);
  const hiddenRoleCount = Math.max(roles.length - platformRoles.length, 0);
  const filteredRoles = platformRoles.filter((role) => {
    const query = roleSearch.trim().toLowerCase();
    if (!query) return true;
    return [role.name, role.code || "", role.description || "", role.tenant_id].some((value) => value.toLowerCase().includes(query));
  });

  async function openAddRole() {
    setPreparingRoleForm(true);
    try {
      if (permissions.length === 0) await onRefresh();
      setAddRoleOpen(true);
    } finally {
      setPreparingRoleForm(false);
    }
  }

  async function openEditRole(role: IdentityRole) {
    setPreparingRoleForm(true);
    try {
      if (permissions.length === 0) await onRefresh();
      setEditRole(role);
    } finally {
      setPreparingRoleForm(false);
    }
  }

  return (
    <div className="px-4 py-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f1] text-[#588368] shadow-sm">
              <KeyRound className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#172033]">Platform Roles</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
            <Home className="h-3.5 w-3.5" />
            <span>/</span>
            <span>Platform Access</span>
            <span>/</span>
            <span className="font-semibold text-[#172033]">Platform Roles</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm" onClick={onRefresh} type="button">
            <RefreshCw className="h-4 w-4 text-[#588368]" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#588368] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60" disabled={loading || preparingRoleForm} onClick={openAddRole} type="button">
            {preparingRoleForm ? "Loading platform permissions..." : <><Plus className="h-4 w-4" /> Add Platform Role</>}
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_8px_22px_rgba(23,32,51,0.06)]">
          <div className="h-1 bg-[#588368]" />
          <div className="p-5">
          <p className="text-xs font-black uppercase tracking-wide text-[#9ca3af]">Platform Permissions</p>
          <p className="mt-2 text-3xl font-black text-[#172033]">{permissions.length}</p>
          </div>
        </div>
        <div className="setika-card-rise rounded-2xl border border-[#e2e8e4] bg-white p-5 shadow-[0_8px_22px_rgba(23,32,51,0.06)] md:col-span-2">
          <p className="text-xs font-black uppercase tracking-wide text-[#9ca3af]">Permission Source</p>
          <p className="mt-2 text-sm font-semibold text-[#4b5563]">
            Review available access controls before creating or updating a platform role. Missing platform permissions can be added by backend manifests later.
          </p>
        </div>
      </div>

      <section className="setika-card-rise overflow-hidden rounded-2xl border border-[#e2e8e4] bg-white shadow-[0_10px_28px_rgba(23,32,51,0.07)]">
        <div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-[#588368]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
            <h2 className="text-xl font-black text-[#172033]">Platform Role List</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Search, view, and edit platform roles. Permissions are assigned inside Add/Edit Platform Role.</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
            <input
              className="h-11 w-full rounded-lg border border-[#dbe0e5] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#588368] sm:w-[320px]"
              onChange={(event) => setRoleSearch(event.target.value)}
              placeholder="Search platform roles"
              value={roleSearch}
            />
          </div>
        </div>
        <p className="m-5 rounded-lg border border-[#dbe0e5] bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#4b5563]">
          Some tenant-scoped roles are hidden from Platform Access. Tenant role management will be handled in tenant context.
          {hiddenRoleCount > 0 ? ` ${hiddenRoleCount} tenant-scoped or unclassified role${hiddenRoleCount === 1 ? " is" : "s are"} hidden from Platform Access.` : ""}
        </p>
        {error ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
              <tr>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Tenant</th>
                <th className="px-5 py-4">System</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {loading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>
                    Loading platform roles...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>
                    No platform roles found.
                  </td>
                </tr>
              ) : filteredRoles.map((role) => (
                <tr key={role.id}>
                  <td className="px-5 py-4">
                    <strong className="block text-sm text-[#111827]">{role.name}</strong>
                    {role.description ? <span className="text-xs text-[#6b7280]">{role.description}</span> : null}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{role.code || "-"}</td>
                  <td className="px-5 py-4 text-xs text-[#6b7280]">{role.tenant_id}</td>
                  <td className="px-5 py-4 text-sm text-[#4b5563]">{role.is_system ? "Yes" : "No"}</td>
                  <td className="px-5 py-4 text-right">
                    <button className="rounded-lg border border-[#dbe0e5] px-3 py-2 text-xs font-bold text-[#588368] disabled:opacity-60" disabled={preparingRoleForm} onClick={() => openEditRole(role)} type="button">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#edf1ef] p-5 text-sm text-[#6b7280]">
          Showing {filteredRoles.length} of {platformRoles.length} platform role{platformRoles.length === 1 ? "" : "s"}
        </div>
      </section>
      {addRoleOpen ? <RoleFormModal mode="create" onClose={() => setAddRoleOpen(false)} onSaved={() => { setAddRoleOpen(false); onRefresh(); }} permissions={permissions} permissionsError={error} permissionsLoading={loading} /> : null}
      {editRole ? <RoleFormModal mode="edit" onClose={() => setEditRole(null)} onSaved={() => { setEditRole(null); onRefresh(); }} permissions={permissions} permissionsError={error} permissionsLoading={loading} role={editRole} /> : null}
    </div>
  );
}

function RoleFormModal({
  mode,
  role,
  permissions,
  permissionsLoading,
  permissionsError,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  role?: IdentityRole;
  permissions: IdentityPermission[];
  permissionsLoading: boolean;
  permissionsError: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(role?.name || "");
  const [code, setCode] = useState(role?.code || "");
  const [description, setDescription] = useState(role?.description || "");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissionIDs, setSelectedPermissionIDs] = useState<Set<string>>(new Set());
  const [initialPermissionIDs, setInitialPermissionIDs] = useState<Set<string>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const groupedPermissions = permissions
    .filter((permission) => {
      const query = permissionSearch.trim().toLowerCase();
      if (!query) return true;
      return `${permissionDisplayName(permission)} ${permission.description || ""}`.toLowerCase().includes(query);
    })
    .reduce<Record<string, IdentityPermission[]>>((groups, permission) => {
      const moduleName = permission.module || "core";
      groups[moduleName] = groups[moduleName] || [];
      groups[moduleName].push(permission);
      return groups;
    }, {});

  useEffect(() => {
    if (mode !== "edit" || !role) return;
    let cancelled = false;
    const roleID = role.id;
    async function loadRolePermissions() {
      setLoadingPermissions(true);
      setError("");
      try {
        const result = await apiRequest<IdentityPermission[]>(`/roles/${roleID}/permissions`);
        const ids = new Set(result.map((permission) => permission.id));
        if (!cancelled) {
          setSelectedPermissionIDs(ids);
          setInitialPermissionIDs(ids);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load role permissions.");
      } finally {
        if (!cancelled) setLoadingPermissions(false);
      }
    }
    const timer = window.setTimeout(loadRolePermissions, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, role]);

  function applyTemplate(template: (typeof platformRoleTemplates)[number]) {
    setName(template.name);
    setCode(template.code);
    setDescription(template.description);
    setSelectedPermissionIDs(new Set(availableTemplatePermissionIDs(template, permissions)));
  }

  function togglePermission(permissionID: string) {
    setSelectedPermissionIDs((current) => {
      const next = new Set(current);
      if (next.has(permissionID)) next.delete(permissionID);
      else next.add(permissionID);
      return next;
    });
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "create") {
        await apiRequest("/roles/", {
          method: "POST",
          body: {
            name: name.trim(),
            code: code.trim() || undefined,
            description: description.trim() || undefined,
            permission_ids: Array.from(selectedPermissionIDs),
          },
        });
      } else if (role) {
        await apiRequest(`/roles/${role.id}/`, {
          method: "PUT",
          body: {
            name: name.trim(),
            code: code.trim() || undefined,
            description: description.trim() || undefined,
          },
        });
        const selected = selectedPermissionIDs;
        const initial = initialPermissionIDs;
        await Promise.all([
          ...Array.from(selected).filter((id) => !initial.has(id)).map((id) => apiRequest(`/roles/${role.id}/permissions`, { method: "POST", body: { permission_id: id } })),
          ...Array.from(initial).filter((id) => !selected.has(id)).map((id) => apiRequest(`/roles/${role.id}/permissions/${id}`, { method: "DELETE" })),
        ]);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BaseModal title={mode === "create" ? "Add Platform Role" : "Edit Platform Role"} eyebrow="Platform Role Management" onClose={onClose} wide>
      <form onSubmit={saveRole}>
        {mode === "create" ? (
          <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {platformRoleTemplates.map((template) => {
              const availableCount = availableTemplatePermissionIDs(template, permissions).length;
              const missingCount = missingTemplatePermissionCount(template, permissions);
              return (
                <button className="rounded-xl border border-[#dbe8e1] bg-[#f8faf9] px-4 py-3 text-left hover:border-[#588368]" key={template.code} onClick={() => applyTemplate(template)} type="button">
                  <strong className="block text-sm text-[#111827]">{template.name}</strong>
                  <span className="mt-1 block text-xs text-[#6b7280]">{template.description}</span>
                  <span className="mt-2 block text-xs font-bold text-[#588368]">{availableCount} available, {missingCount} not available yet</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#111827]">Role Name</span>
            <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#111827]">Code</span>
            <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 uppercase outline-none focus:border-[#588368]" onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="PLATFORM_SUPPORT" value={code} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-[#111827]">Description</span>
            <textarea className="min-h-24 w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => setDescription(event.target.value)} value={description} />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-[#edf1ef]">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#111827]">Assign Platform Permissions</h3>
              <p className="text-sm text-[#6b7280]">
                {selectedPermissionIDs.size} selected from {permissions.length} available
              </p>
            </div>
            <input
              className="h-10 rounded-lg border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[280px]"
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Search permissions"
              value={permissionSearch}
            />
          </div>
          {permissionsError ? (
            <div className="p-6">
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{permissionsError}</p>
            </div>
          ) : permissionsLoading ? (
            <p className="p-6 text-center text-sm font-semibold text-[#6b7280]">Loading available permissions...</p>
          ) : loadingPermissions ? (
            <p className="p-6 text-center text-sm font-semibold text-[#6b7280]">Loading role permissions...</p>
          ) : permissions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-bold text-[#111827]">No permissions available.</p>
              <p className="mt-1 text-sm text-[#6b7280]">Refresh the page or contact the system administrator.</p>
            </div>
          ) : Object.entries(groupedPermissions).length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-bold text-[#111827]">No permissions match your search.</p>
              <p className="mt-1 text-sm text-[#6b7280]">Clear the search field to see all available permissions.</p>
            </div>
          ) : (
            <div className="grid max-h-[420px] gap-4 overflow-y-auto p-4 xl:grid-cols-2">
              {Object.entries(groupedPermissions).map(([moduleName, items]) => (
                <div className="rounded-xl border border-[#edf1ef] p-4" key={moduleName}>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold capitalize text-[#111827]">{moduleName}</h4>
                    <span className="text-xs font-bold text-[#6b7280]">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((permission) => (
                      <label className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-[#f8faf9]" key={permission.id}>
                        <input className="mt-1 h-4 w-4 accent-[#588368]" checked={selectedPermissionIDs.has(permission.id)} onChange={() => togglePermission(permission.id)} type="checkbox" />
                        <span>
                          <strong className="block text-sm text-[#111827]">{permissionDisplayName(permission)}</strong>
                          {permission.description ? <span className="text-xs text-[#6b7280]">{permission.description}</span> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={saving || !name.trim()} type="submit">
            {saving ? "Saving..." : "Save Role"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function TenantViewModal({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
  return (
    <BaseModal title={tenant.name} eyebrow="Tenant Details" onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Tenant ID", tenant.id],
          ["Code", tenant.code],
          ["Kind", tenant.kind],
          ["Plan", tenant.plan],
          ["Status", tenant.status],
          ["Trial Ends", tenant.trialEndsAt],
          ["Joined", tenant.joined],
          ["Subdomain", tenant.subdomainUrl],
          ["Admin", tenant.admin],
        ].map(([label, value]) => (
          <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={label}>
            <p className="text-xs font-black uppercase tracking-wide text-[#9ca3af]">{label}</p>
            <p className="mt-2 break-words text-sm font-bold text-[#111827]">{value}</p>
          </div>
        ))}
      </div>
    </BaseModal>
  );
}

function TenantEditModal({ tenant, onClose, onSaved }: { tenant: TenantRow; onClose: () => void; onSaved: () => void }) {
  const defaultBranding = useCallback((): TenantBranding => ({
    ...DEFAULT_TENANT_BRANDING,
    tenant_id: tenant.id,
    subdomain: deriveTenantSubdomain(tenant),
    display_name: tenant.name,
  }), [tenant]);
  const [name, setName] = useState(tenant.name);
  const [lifecycleStatus, setLifecycleStatus] = useState<"Active" | "Pending">(tenantEditableLifecycle(tenant.status));
  const [selectedCatalogPlanID, setSelectedCatalogPlanID] = useState("");
  const [fallbackSubscriptionPlan, setFallbackSubscriptionPlan] = useState(normalizeEditablePlan(tenant.plan));
  const [catalogPlans, setCatalogPlans] = useState<TenantCatalogPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<TenantSubscriptionRecord | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [subdomain, setSubdomain] = useState(deriveTenantSubdomain(tenant));
  const [displayName, setDisplayName] = useState(tenant.name);
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);
  const [loadingBranding, setLoadingBranding] = useState(true);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSubscriptionCatalog() {
      setLoadingPlans(true);
      try {
        const [plansResult, currentResult] = await Promise.all([
          apiRequest<TenantCatalogPlan[]>("/hrms/subscription-plans/active"),
          apiRequest<TenantSubscriptionRecord>(`/hrms/tenants/${tenant.id}/subscriptions/current`).catch((err) => {
            if (err instanceof ApiRequestError && err.status === 404) return null;
            throw err;
          }),
        ]);
        if (cancelled) return;
        setCatalogPlans(plansResult);
        setCurrentSubscription(currentResult);
        const matchedPlan = findMatchingCatalogPlan(plansResult, tenant.plan, currentResult?.plan_id);
        if (matchedPlan) {
          setSelectedCatalogPlanID(matchedPlan.id);
          setFallbackSubscriptionPlan(matchedPlan.name);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load subscription plan catalog.");
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    }
    const timer = window.setTimeout(loadSubscriptionCatalog, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tenant.id, tenant.plan]);

  useEffect(() => {
    let cancelled = false;
    async function loadBrandingForEdit() {
      setLoadingBranding(true);
      try {
        const result = await apiRequest<TenantBranding>(`/hrms/tenants/${tenant.id}/branding`);
        if (cancelled) return;
        const nextBranding = { ...defaultBranding(), ...result };
        setBranding(nextBranding);
        setSubdomain(nextBranding.subdomain || deriveTenantSubdomain(tenant));
        setDisplayName(nextBranding.display_name || tenant.name);
      } catch (err) {
        if (!(err instanceof ApiRequestError && err.status === 404) && !cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load tenant branding fields.");
        }
      } finally {
        if (!cancelled) setLoadingBranding(false);
      }
    }
    const timer = window.setTimeout(loadBrandingForEdit, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [defaultBranding, tenant]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    const nextName = name.trim();
    const selectedPlan = catalogPlans.find((plan) => plan.id === selectedCatalogPlanID) || null;
    const nextPlan = lifecycleStatus === "Pending" ? "" : selectedPlan?.name || planForLifecycle(lifecycleStatus, fallbackSubscriptionPlan);
    const nextSubdomain = subdomain.trim().toLowerCase();
    const nextDisplayName = displayName.trim() || nextName;
    if (!nextName) {
      setStatus("error");
      setError("Tenant name is required.");
      return;
    }
    const subdomainError = validateTenantSubdomain(nextSubdomain);
    if (subdomainError) {
      setStatus("error");
      setError(subdomainError);
      return;
    }
    if (lifecycleStatus === "Active" && !selectedPlan && !fallbackSubscriptionPlan.trim()) {
      setStatus("error");
      setError("Select a subscription plan before activating the tenant.");
      return;
    }
    try {
      await apiRequest(`/tenants/${tenant.id}/`, {
        method: "PUT",
        body: {
          name: nextName,
          subscription_plan: nextPlan,
        },
      });
      if (lifecycleStatus === "Active" && selectedPlan) {
        const subscriptionBody = {
          plan_id: selectedPlan.id,
          start_date: currentSubscription?.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          end_date: currentSubscription?.end_date?.slice(0, 10) || "",
          status: "active",
          max_employees: currentSubscription?.max_employees || selectedPlan.employee_limit || 0,
        };
        if (currentSubscription) {
          await apiRequest<TenantSubscriptionRecord>(`/hrms/tenants/${tenant.id}/subscriptions/${currentSubscription.id}`, { method: "PUT", body: subscriptionBody });
        } else {
          await apiRequest<TenantSubscriptionRecord>(`/hrms/tenants/${tenant.id}/subscriptions`, { method: "POST", body: subscriptionBody });
        }
      }
      await apiRequest<TenantBranding>(`/hrms/tenants/${tenant.id}/branding`, {
        method: "PUT",
        body: {
          ...branding,
          tenant_id: tenant.id,
          subdomain: nextSubdomain,
          display_name: nextDisplayName,
        },
      });
      onSaved();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to update tenant.");
    }
  }

  return (
    <BaseModal title="Edit Tenant" eyebrow={tenant.name} onClose={onClose} wide>
      <form onSubmit={onSubmit}>
        <div className="grid gap-8">
          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
            <h3 className="text-lg font-black text-[#111827]">Editable Tenant Information</h3>
            <p className="mt-1 text-sm text-[#6b7280]">These fields update the tenant identity record and its HRMS subdomain binding.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Tenant Name</span>
                <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => setName(event.target.value)} required value={name} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Display Name</span>
                <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Lifecycle Status</span>
                <select className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => setLifecycleStatus(event.target.value as "Active" | "Pending")} value={lifecycleStatus}>
                  <option value="Active">Active</option>
                  <option value="Pending">Inactive / no active plan</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Subscription Plan</span>
                <select className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 outline-none focus:border-[#588368] disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]" disabled={lifecycleStatus !== "Active" || loadingPlans} onChange={(event) => { const plan = catalogPlans.find((item) => item.id === event.target.value); setSelectedCatalogPlanID(event.target.value); setFallbackSubscriptionPlan(plan?.name || ""); }} value={selectedCatalogPlanID}>
                  <option value="">{loadingPlans ? "Loading plans..." : "Select catalog plan"}</option>
                  {catalogPlans.map((plan) => <option key={plan.id} value={plan.id}>{tenantCatalogPlanLabel(plan)}</option>)}
                </select>
                {!loadingPlans && catalogPlans.length === 0 ? <p className="mt-2 text-xs font-semibold text-red-600">No active catalog plans found. Create one under Commercial &gt; Plans first.</p> : null}
                {fallbackSubscriptionPlan && !selectedCatalogPlanID ? <p className="mt-2 text-xs font-semibold text-[#6b7280]">Current saved plan: {fallbackSubscriptionPlan}</p> : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Tenant Subdomain</span>
                <div className="flex overflow-hidden rounded-lg border border-[#d1d5db] bg-white focus-within:border-[#588368]">
                  <input className="min-w-0 flex-1 px-4 py-3 lowercase outline-none" onChange={(event) => setSubdomain(event.target.value.toLowerCase())} pattern="[a-z0-9-]+" required value={subdomain} />
                  <span className="flex items-center bg-[#f4fbf8] px-4 text-sm font-semibold text-[#588368]">{`.${TENANT_BASE_DOMAIN}`}</span>
                </div>
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-5">
            <h3 className="text-lg font-black text-[#111827]">System Fields</h3>
            <p className="mt-1 text-sm text-[#6b7280]">These values are controlled by identity provisioning or lifecycle rules.</p>
            <div className="mt-5 grid gap-3">
              {[
                ["Tenant ID", tenant.id],
                ["Code", tenant.code],
                ["Kind", tenant.kind],
                ["Status", tenant.status],
                ["Trial Ends", tenant.trialEndsAt],
                ["Joined", tenant.joined],
                ["Admin", tenant.admin],
                ["Users", tenant.users],
              ].map(([label, value]) => (
                <div className="rounded-xl bg-white px-4 py-3" key={label}>
                  <span className="block text-xs font-black uppercase tracking-wide text-[#9ca3af]">{label}</span>
                  <strong className="mt-1 block break-words text-sm text-[#111827]">{value}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
        {loadingBranding ? <p className="mt-4 rounded-lg bg-[#eff6ff] px-4 py-3 text-sm font-semibold text-[#2563eb]">Loading tenant subdomain fields...</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={status === "submitting" || loadingBranding} type="submit">
            {status === "submitting" ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function TenantUsersModal({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<IdentityUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<IdentityUser[]>(`/tenants/${tenant.id}/users`);
      setUsers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tenant users.");
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    return [fullName, user.email, user.mobile, user.is_active ? "active" : "inactive", user.is_locked ? "locked" : "unlocked"].some((value) => value.toLowerCase().includes(query));
  });

  async function afterSaved(nextMessage: string) {
    setAddingUser(false);
    setEditingUser(null);
    setMessage(nextMessage);
    await loadUsers();
  }

  return (
    <BaseModal title="Tenant Users" eyebrow={tenant.name} onClose={onClose} wide>
      <div className="grid gap-8">
        <section className="rounded-2xl border border-[#edf1ef] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-black text-[#111827]">Users</h3>
              <p className="text-sm text-[#6b7280]">{filteredUsers.length} shown from {users.length} user{users.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="h-11 rounded-xl border border-[#dbe0e5] px-4 text-sm outline-none focus:border-[#588368] sm:w-[280px]"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, mobile"
                value={search}
              />
              <button
                className="rounded-xl bg-[#588368] px-4 py-3 text-sm font-black text-white"
                onClick={() => {
                  setAddingUser(true);
                  setEditingUser(null);
                  setMessage("");
                  setError("");
                }}
                type="button"
              >
                Add User
              </button>
            </div>
          </div>

          {error ? <p className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="m-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#f8faf9] text-xs font-bold uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Mobile</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Verified</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {loading ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>Loading tenant users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]" colSpan={5}>No users found for this tenant.</td>
                  </tr>
                ) : filteredUsers.map((user) => {
                  const fullName = `${user.first_name} ${user.last_name}`.trim() || "Unnamed User";
                  return (
                    <tr className="hover:bg-[#f8faf9]" key={user.id}>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f1] text-xs font-black text-[#588368]">{fullName.slice(0, 2).toUpperCase()}</span>
                          <span>
                            <strong className="block text-sm text-[#111827]">{fullName}</strong>
                            <span className="mt-1 block text-xs font-semibold text-[#6b7280]">{user.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-[#4b5563]">{user.mobile || "-"}</td>
                      <td className="px-5 py-5">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${user.is_active ? "bg-[#ecfdf3] text-[#16803c]" : "bg-[#fff4ed] text-[#b54708]"}`}>
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                        {user.is_locked ? <span className="ml-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">Locked</span> : null}
                      </td>
                      <td className="px-5 py-5 text-sm font-semibold text-[#4b5563]">{user.email_verified_at ? "Yes" : "No"}</td>
                      <td className="px-5 py-5">
                        <div className="flex justify-end">
                          <TenantActionButton
                            icon={<EditIcon />}
                            label={`Edit ${fullName}`}
                            onClick={() => {
                              setEditingUser(user);
                              setAddingUser(false);
                              setMessage("");
                              setError("");
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-5">
          {addingUser ? (
            <TenantUserForm mode="create" tenantID={tenant.id} onCancel={() => setAddingUser(false)} onSaved={() => afterSaved("User added to tenant.")} />
          ) : editingUser ? (
            <TenantUserForm mode="edit" tenantID={tenant.id} user={editingUser} onCancel={() => setEditingUser(null)} onSaved={() => afterSaved("User updated.")} />
          ) : (
            <div className="rounded-2xl bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Users</p>
              <h3 className="mt-2 text-2xl font-black text-[#111827]">Add or edit tenant users</h3>
              <p className="mt-3 text-sm leading-6 text-[#6b7280]">Use Add User to create a user under this tenant. Use the edit icon in the table to change the user profile and active status.</p>
            </div>
          )}
        </aside>
      </div>
    </BaseModal>
  );
}

function TenantUserForm({
  mode,
  tenantID,
  user,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  tenantID: string;
  user?: IdentityUser;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      password,
    };
    if (!payload.first_name || !payload.last_name || !payload.mobile || (mode === "create" && (!payload.email || !payload.password))) {
      setSaving(false);
      setError(mode === "create" ? "First name, last name, email, mobile, and password are required." : "First name, last name, and mobile are required.");
      return;
    }
    try {
      if (mode === "create") {
        await apiRequest<IdentityUser>("/users/", {
          method: "POST",
          body: {
            tenant_id: tenantID,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            mobile: payload.mobile,
            password: payload.password,
            roles: [],
            is_super_admin: false,
          },
        });
      } else if (user) {
        await apiRequest(`/admin/tenants/${tenantID}/users/${user.id}`, {
          method: "PUT",
          body: {
            first_name: payload.first_name,
            last_name: payload.last_name,
            mobile: payload.mobile,
            is_active: isActive,
          },
        });
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rounded-2xl bg-white p-5" onSubmit={onSubmit}>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">{mode === "create" ? "New User" : "Edit User"}</p>
      <h3 className="mt-2 text-2xl font-black text-[#111827]">{mode === "create" ? "Add Tenant User" : `${user?.first_name || "Edit"} ${user?.last_name || ""}`}</h3>
      <div className="mt-5 space-y-4">
        <TenantInlineField label="First Name" onChange={setFirstName} required value={firstName} />
        <TenantInlineField label="Last Name" onChange={setLastName} required value={lastName} />
        <TenantInlineField disabled={mode === "edit"} label="Email" onChange={setEmail} required={mode === "create"} type="email" value={email} />
        <TenantInlineField label="Mobile" onChange={setMobile} required value={mobile} />
        {mode === "create" ? <TenantInlineField label="Temporary Password" onChange={setPassword} required type="password" value={password} /> : null}
        {mode === "edit" ? (
          <label className="flex items-center gap-3 rounded-xl border border-[#dbe0e5] px-4 py-3 text-sm font-black text-[#374151]">
            <input checked={isActive} className="h-4 w-4 accent-[#588368]" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
            Active user
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-3">
        <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-3 text-sm font-semibold text-[#374151]" onClick={onCancel} type="button">Cancel</button>
        <button className="rounded-lg bg-[#588368] px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={saving} type="submit">
          {saving ? "Saving..." : mode === "create" ? "Add User" : "Save User"}
        </button>
      </div>
    </form>
  );
}

function TenantInlineField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <input
        className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368] disabled:bg-[#f8faf9] disabled:text-[#6b7280]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}


function PortalBrandingSection({ currentUser }: { currentUser: CurrentUser | null }) {
  const { setTenantBranding } = useTenantBranding();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_TENANT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const currentTenantID = currentUser?.tenant_id;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profileResult = await apiRequest<TenantProfile>("/hrms/tenant-profile");
      let brandingResult: TenantBranding | null = null;
      try {
        brandingResult = await apiRequest<TenantBranding>("/hrms/branding");
      } catch (err) {
        if (!(err instanceof ApiRequestError && err.status === 404)) {
          throw err;
        }
      }
      setProfile(profileResult);
      const nextBranding = {
        ...DEFAULT_TENANT_BRANDING,
        tenant_id: profileResult.tenant_id,
        subdomain: profileResult.subdomain,
        display_name: profileResult.display_name || currentTenantID || profileResult.subdomain,
        ...brandingResult,
      };
      setBranding(nextBranding);
      setTenantBranding(nextBranding);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load portal branding.");
    } finally {
      setLoading(false);
    }
  }, [currentTenantID, setTenantBranding]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(draftBranding: TenantBranding) {
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<TenantBranding>("/hrms/branding", {
        method: "PUT",
        body: {
          ...draftBranding,
          tenant_id: profile.tenant_id,
          subdomain: profile.subdomain,
          display_name: draftBranding.display_name || profile.display_name || profile.subdomain,
        },
      });
      const nextBranding = { ...DEFAULT_TENANT_BRANDING, ...result };
      setBranding(nextBranding);
      setTenantBranding(nextBranding);
      setMessage("Portal branding saved.");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save portal branding.");
    } finally {
      setSaving(false);
    }
  }

  const portalHost = profile?.subdomain ? tenantHost(profile.subdomain) : "-";
  const previewName = branding.display_name || profile?.display_name || profile?.subdomain || "Tenant";
  const previewBranding = useCallback((nextBranding: TenantBranding) => {
    const normalizedBranding = { ...DEFAULT_TENANT_BRANDING, ...nextBranding };
    setBranding(normalizedBranding);
    setTenantBranding(normalizedBranding);
  }, [setTenantBranding]);

  return (
    <section className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">Portal Branding</h1>
            <PortalInfoButton text="Branding controls the tenant portal logo, favicon, theme colors, display name, and branded preloader. Portal URL changes are governed separately." />
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-[#6b7280]">
            <span>⌂</span>
            <span>/</span>
            <span>Setup</span>
            <span>/</span>
            <span className="font-semibold text-[#111827]">Portal Branding</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#111827]" disabled={loading} onClick={load} type="button">Refresh</button>
          <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white shadow-sm disabled:opacity-50" disabled={loading || !profile} onClick={() => setEditing(true)} type="button">Edit Branding</button>
        </div>
      </div>

      {error ? <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}

      {loading ? (
        <div className="rounded-2xl border border-[#edf1ef] bg-white p-8 text-center text-sm font-semibold text-[#6b7280]">Loading portal branding...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-5 md:grid-cols-2">
            <PortalBrandingCard label="Portal URL" value={portalHost} />
            <PortalBrandingCard label="Display Name" value={previewName} />
            <PortalBrandingCard label="Color Mode" value={branding.color_mode} />
            <PortalBrandingCard label="Layout" value={branding.layout} />
            <article className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#111827]">Brand Assets</h2>
                <PortalInfoButton text="Use transparent PNG/SVG-style logos when possible. Favicon should be a square image." />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <PortalAssetPreview label="Logo" value={branding.logo_path} fallback={previewName} />
                <PortalAssetPreview label="Favicon" value={branding.favicon_path} fallback={previewName.slice(0, 2).toUpperCase()} compact />
              </div>
            </article>
          </section>

          <aside className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#111827]">Live Preview</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
              <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: branding.topbar_color }}>
                {branding.logo_path ? <img alt="Tenant logo preview" className="h-9 max-w-[160px] object-contain" src={branding.logo_path} /> : <strong className="text-lg" style={{ color: branding.primary_color }}>{previewName}</strong>}
                {branding.favicon_path ? <img alt="Tenant favicon preview" className="h-7 w-7 rounded object-contain" src={branding.favicon_path} /> : <span className="h-7 w-7 rounded" style={{ backgroundColor: branding.tertiary_color }} />}
              </div>
              <div className="grid min-h-[300px] grid-cols-[88px_1fr]">
                <div className="p-4" style={{ backgroundColor: branding.sidebar_color }}>
                  <div className="mb-5 h-9 rounded-xl bg-white/20" />
                  <div className="space-y-3">
                    {[branding.layout, branding.sidebar_size, branding.color_mode].map((item) => <div className="rounded-lg bg-white/10 px-2 py-2 text-[10px] font-bold uppercase text-white/80" key={item}>{item}</div>)}
                  </div>
                </div>
                <div className="space-y-4 bg-[#f4fbf8] p-5">
                  <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }}>
                    <p className="text-xs font-black uppercase tracking-[0.2em]">{portalHost}</p>
                    <h4 className="mt-2 text-2xl font-black">{previewName}</h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[branding.primary_color, branding.secondary_color, branding.tertiary_color].map((color) => <span className="h-10 rounded-xl" key={color} style={{ backgroundColor: color }} />)}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {profile && editing ? (
        <PortalBrandingEditModal
          branding={branding}
          loading={saving}
          onCancel={previewBranding}
          onClose={() => setEditing(false)}
          onPreviewChange={previewBranding}
          onSave={save}
          profile={profile}
        />
      ) : null}
    </section>
  );
}

function PortalBrandingEditModal({
  profile,
  branding,
  loading,
  onCancel,
  onClose,
  onPreviewChange,
  onSave,
}: {
  profile: TenantProfile;
  branding: TenantBranding;
  loading: boolean;
  onCancel: (branding: TenantBranding) => void;
  onClose: () => void;
  onPreviewChange: (branding: TenantBranding) => void;
  onSave: (branding: TenantBranding) => void | Promise<void>;
}) {
  const [originalBranding] = useState<TenantBranding>({ ...DEFAULT_TENANT_BRANDING, ...branding, tenant_id: profile.tenant_id, subdomain: profile.subdomain });
  const [draft, setDraft] = useState<TenantBranding>({ ...DEFAULT_TENANT_BRANDING, ...branding, tenant_id: profile.tenant_id, subdomain: profile.subdomain });
  const [error, setError] = useState("");

  useEffect(() => {
    onPreviewChange(draft);
  }, [draft, onPreviewChange]);

  function updateBranding(field: keyof TenantBranding, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function onAssetSelected(field: "logo_path" | "favicon_path", event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      updateBranding(field, await resizeBrandingImage(file, field));
    } catch {
      setError("Unable to read selected image.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    await onSave({ ...draft, tenant_id: profile.tenant_id, subdomain: profile.subdomain });
  }

  function cancel() {
    onCancel(originalBranding);
    onClose();
  }

  return (
    <BaseModal title="Edit Portal Branding" eyebrow={tenantHost(profile.subdomain)} onClose={cancel} wide>
      <form className="grid gap-8" onSubmit={submit}>
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#111827]">Identity</h3>
              <PortalInfoButton text="Portal URL is locked here. Use a governed domain or branding change request when the tenant URL must change." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Portal URL</span>
                <div className="flex overflow-hidden rounded-lg border border-[#d1d5db] bg-[#f3f4f6]">
                  <input className="min-w-0 flex-1 px-4 py-3 lowercase text-[#6b7280] outline-none" disabled value={profile.subdomain} />
                  <span className="flex items-center bg-[#eef4f1] px-4 text-sm font-semibold text-[#588368]">{`.${TENANT_BASE_DOMAIN}`}</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Display Name</span>
                <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" onChange={(event) => updateBranding("display_name", event.target.value)} value={draft.display_name || ""} />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <BrandingAssetPicker label="Logo" value={draft.logo_path} onChange={(event) => onAssetSelected("logo_path", event)} onClear={() => updateBranding("logo_path", "")} />
              <BrandingAssetPicker label="Favicon" value={draft.favicon_path} compact onChange={(event) => onAssetSelected("favicon_path", event)} onClear={() => updateBranding("favicon_path", "")} />
            </div>
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
            <h3 className="mb-4 text-lg font-black text-[#111827]">Theme Colors</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <BrandingColorField label="Theme" value={draft.theme_color} onChange={(value) => updateBranding("theme_color", value)} />
              <BrandingColorField label="Primary" value={draft.primary_color} onChange={(value) => updateBranding("primary_color", value)} />
              <BrandingColorField label="Secondary" value={draft.secondary_color} onChange={(value) => updateBranding("secondary_color", value)} />
              <BrandingColorField label="Tertiary" value={draft.tertiary_color} onChange={(value) => updateBranding("tertiary_color", value)} />
              <BrandingColorField label="Top Bar" value={draft.topbar_color} onChange={(value) => updateBranding("topbar_color", value)} />
              <BrandingColorField label="Sidebar" value={draft.sidebar_color} onChange={(value) => updateBranding("sidebar_color", value)} />
            </div>
          </section>

          <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
            <h3 className="mb-4 text-lg font-black text-[#111827]">Layout and Style</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <BrandingSelect label="Layout" value={draft.layout} options={["vertical", "horizontal", "detached", "two-column"]} onChange={(value) => updateBranding("layout", value)} />
              <BrandingSelect label="Color Mode" value={draft.color_mode} options={["light", "dark", "system"]} onChange={(value) => updateBranding("color_mode", value)} />
              <BrandingSelect label="Sidebar Size" value={draft.sidebar_size} options={["default", "compact", "condensed", "icon"]} onChange={(value) => updateBranding("sidebar_size", value)} />
              <BrandingSelect label="Layout Width" value={draft.layout_width} options={["fluid", "boxed"]} onChange={(value) => updateBranding("layout_width", value)} />
              <BrandingSelect label="Card Layout" value={draft.card_layout} options={["bordered", "shadow", "plain"]} onChange={(value) => updateBranding("card_layout", value)} />
              <BrandingSelect label="Top Bar Background" value={draft.topbar_background} options={["none", "dots", "waves", "gradient"]} onChange={(value) => updateBranding("topbar_background", value)} />
              <BrandingSelect label="Sidebar Background" value={draft.sidebar_background} options={["solid", "dots", "image", "gradient"]} onChange={(value) => updateBranding("sidebar_background", value)} />
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Font Family</span>
                <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" value={draft.font_family} onChange={(event) => updateBranding("font_family", event.target.value)} />
              </label>
              <label className="flex items-center gap-3 pt-8 text-sm font-black text-[#374151]">
                <input className="h-4 w-4 accent-[#588368]" checked={draft.preloader} onChange={(event) => updateBranding("preloader", event.target.checked)} type="checkbox" />
                Enable branded preloader
              </label>
            </div>
          </section>

          {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" disabled={loading} onClick={cancel} type="button">Cancel</button>
            <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={loading} type="submit">
              {loading ? "Saving..." : "Save Branding"}
            </button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}

function PortalBrandingCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[#edf1ef] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a978f]">{label}</p>
      <p className="mt-3 break-words text-xl font-black text-[#111827]">{value || "-"}</p>
    </article>
  );
}

function PortalAssetPreview({ label, value, fallback, compact = false }: { label: string; value?: string | null; fallback: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#edf1ef] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a978f]">{label}</p>
      <div className="mt-4 flex h-24 items-center justify-center rounded-xl bg-[#f8faf9]">
        {value ? <img alt={`${label} preview`} className={`${compact ? "h-12 w-12" : "h-14 max-w-[220px]"} object-contain`} src={value} /> : <span className="text-lg font-black text-[#588368]">{fallback}</span>}
      </div>
    </div>
  );
}

function PortalInfoButton({ text }: { text: string }) {
  return <button className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dbe8e1] bg-white text-xs font-black text-[#588368]" title={text} type="button">i</button>;
}

function TenantBrandingModal({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
  const defaultBranding = useCallback((): TenantBranding => ({
    ...DEFAULT_TENANT_BRANDING,
    tenant_id: tenant.id,
    subdomain: deriveTenantSubdomain(tenant),
    display_name: tenant.name,
  }), [tenant]);
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBranding = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<TenantBranding>(`/hrms/tenants/${tenant.id}/branding`);
      setBranding({ ...defaultBranding(), ...result });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setBranding(defaultBranding());
      } else {
        setError(err instanceof Error ? err.message : "Unable to load tenant branding.");
      }
    } finally {
      setLoading(false);
    }
  }, [defaultBranding, tenant.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadBranding();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBranding]);

  function updateBranding(field: keyof TenantBranding, value: string | boolean) {
    setBranding((current) => ({ ...current, [field]: value }));
  }

  async function onAssetSelected(field: "logo_path" | "favicon_path", event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      updateBranding(field, await resizeBrandingImage(file, field));
    } catch {
      setError("Unable to read selected image.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const nextSubdomain = branding.subdomain || deriveTenantSubdomain(tenant);
    const subdomainError = validateTenantSubdomain(nextSubdomain);
    if (subdomainError) {
      setSaving(false);
      setError(subdomainError);
      return;
    }
    try {
      const result = await apiRequest<TenantBranding>(`/hrms/tenants/${tenant.id}/branding`, {
        method: "PUT",
        body: {
          ...branding,
          tenant_id: tenant.id,
          subdomain: nextSubdomain,
          display_name: branding.display_name || tenant.name,
        },
      });
      setBranding({ ...defaultBranding(), ...result });
      setMessage(`Branding saved for ${tenant.name}. It will apply when ${result.subdomain || "the tenant"}.${TENANT_BASE_DOMAIN} is opened.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save tenant branding.");
    } finally {
      setSaving(false);
    }
  }

  const previewName = branding.display_name || tenant.name;

  return (
    <BaseModal title="Tenant Branding" eyebrow={tenant.name} onClose={onClose} wide>
      {loading ? (
        <div className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-8 text-center text-sm font-semibold text-[#6b7280]">Loading tenant branding...</div>
      ) : (
        <form className="grid gap-8" onSubmit={onSubmit}>
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#edf1ef] bg-[#f8faf9] p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#111827]">Logo and Favicon</h3>
                  <p className="text-sm text-[#6b7280]">These assets are tenant-specific and are used when the tenant opens its subdomain.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#588368]">{branding.subdomain ? tenantHost(branding.subdomain) : tenant.subdomainUrl}</span>
              </div>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-semibold text-[#111827]">Tenant Subdomain</span>
                <div className="flex overflow-hidden rounded-lg border border-[#d1d5db] bg-white focus-within:border-[#588368]">
                  <input className="min-w-0 flex-1 px-4 py-3 lowercase outline-none" pattern="[a-z0-9-]+" value={branding.subdomain || ""} onChange={(event) => updateBranding("subdomain", event.target.value.toLowerCase())} required />
                  <span className="flex items-center bg-[#f4fbf8] px-4 text-sm font-semibold text-[#588368]">{`.${TENANT_BASE_DOMAIN}`}</span>
                </div>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <BrandingAssetPicker label="Logo" value={branding.logo_path} onChange={(event) => onAssetSelected("logo_path", event)} onClear={() => updateBranding("logo_path", "")} />
                <BrandingAssetPicker label="Favicon" value={branding.favicon_path} compact onChange={(event) => onAssetSelected("favicon_path", event)} onClear={() => updateBranding("favicon_path", "")} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
              <h3 className="mb-4 text-lg font-black text-[#111827]">Theme Colors</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <BrandingColorField label="Theme" value={branding.theme_color} onChange={(value) => updateBranding("theme_color", value)} />
                <BrandingColorField label="Primary" value={branding.primary_color} onChange={(value) => updateBranding("primary_color", value)} />
                <BrandingColorField label="Secondary" value={branding.secondary_color} onChange={(value) => updateBranding("secondary_color", value)} />
                <BrandingColorField label="Tertiary" value={branding.tertiary_color} onChange={(value) => updateBranding("tertiary_color", value)} />
                <BrandingColorField label="Top Bar" value={branding.topbar_color} onChange={(value) => updateBranding("topbar_color", value)} />
                <BrandingColorField label="Sidebar" value={branding.sidebar_color} onChange={(value) => updateBranding("sidebar_color", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#edf1ef] bg-white p-5">
              <h3 className="mb-4 text-lg font-black text-[#111827]">Layout and Style</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <BrandingSelect label="Layout" value={branding.layout} options={["vertical", "horizontal", "detached", "two-column"]} onChange={(value) => updateBranding("layout", value)} />
                <BrandingSelect label="Color Mode" value={branding.color_mode} options={["light", "dark", "system"]} onChange={(value) => updateBranding("color_mode", value)} />
                <BrandingSelect label="Sidebar Size" value={branding.sidebar_size} options={["default", "compact", "condensed", "icon"]} onChange={(value) => updateBranding("sidebar_size", value)} />
                <BrandingSelect label="Layout Width" value={branding.layout_width} options={["fluid", "boxed"]} onChange={(value) => updateBranding("layout_width", value)} />
                <BrandingSelect label="Card Layout" value={branding.card_layout} options={["bordered", "shadow", "plain"]} onChange={(value) => updateBranding("card_layout", value)} />
                <BrandingSelect label="Top Bar Background" value={branding.topbar_background} options={["none", "dots", "waves", "gradient"]} onChange={(value) => updateBranding("topbar_background", value)} />
                <BrandingSelect label="Sidebar Background" value={branding.sidebar_background} options={["solid", "dots", "image", "gradient"]} onChange={(value) => updateBranding("sidebar_background", value)} />
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-[#111827]">Font Family</span>
                  <input className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#588368]" value={branding.font_family} onChange={(event) => updateBranding("font_family", event.target.value)} />
                </label>
                <label className="flex items-center gap-3 pt-8 text-sm font-black text-[#374151]">
                  <input className="h-4 w-4 accent-[#588368]" checked={branding.preloader} onChange={(event) => updateBranding("preloader", event.target.checked)} type="checkbox" />
                  Enable branded preloader
                </label>
              </div>
            </section>

            {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
            {message ? <p className="rounded-lg bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#16803c]">{message}</p> : null}
            <div className="flex justify-end gap-3">
              <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" onClick={onClose} type="button">Cancel</button>
              <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save Branding"}
              </button>
            </div>
          </div>

          <aside className="rounded-3xl border border-[#edf1ef] bg-[#f8faf9] p-5 lg:sticky lg:top-6 lg:self-start">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Live Preview</p>
            <div className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-xl">
              <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: branding.topbar_color }}>
                <div className="flex items-center gap-3">
                  {branding.logo_path ? <img alt="Tenant logo preview" className="h-9 max-w-[150px] object-contain" src={branding.logo_path} /> : <span className="text-lg font-black" style={{ color: branding.primary_color }}>{previewName}</span>}
                </div>
                {branding.favicon_path ? <img alt="Tenant favicon preview" className="h-7 w-7 rounded object-contain" src={branding.favicon_path} /> : <span className="h-7 w-7 rounded" style={{ backgroundColor: branding.tertiary_color }} />}
              </div>
              <div className="grid min-h-[330px] grid-cols-[88px_1fr]">
                <div className="p-4" style={{ backgroundColor: branding.sidebar_color }}>
                  <div className="mb-5 h-9 rounded-xl bg-white/20" />
                  <div className="space-y-3">
                    {[branding.layout, branding.sidebar_size, branding.color_mode].map((item) => (
                      <div className="rounded-lg bg-white/10 px-2 py-2 text-[10px] font-bold uppercase text-white/80" key={item}>{item}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 bg-[#f4fbf8] p-5">
                  <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }}>
                    <p className="text-xs font-black uppercase tracking-[0.2em]">{tenant.name}</p>
                    <h4 className="mt-2 text-2xl font-black">Tenant dashboard</h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[branding.primary_color, branding.secondary_color, branding.tertiary_color].map((color) => (
                      <div className="rounded-2xl bg-white p-4 shadow-sm" key={color}>
                        <span className="block h-8 rounded-lg" style={{ backgroundColor: color }} />
                        <span className="mt-3 block text-xs font-black text-[#6b7280]">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6b7280]">Runtime branding is resolved from the first subdomain label, for example <strong>{branding.subdomain || "mashvirtual"}.{TENANT_BASE_DOMAIN}</strong>.</p>
          </aside>
        </form>
      )}
    </BaseModal>
  );
}


function deriveTenantSubdomain(tenant: TenantRow) {
  const host = tenant.subdomainUrl.replace(/^https?:\/\//i, "");
  const hostPrefix = host.split(".")[0]?.trim().toLowerCase();
  const candidate = tenant.subdomain || hostPrefix || tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return candidate || tenant.id.slice(0, 8).toLowerCase();
}

function BrandingAssetPicker({ label, value, compact = false, onChange, onClear }: { label: string; value?: string | null; compact?: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-[#dbe8e1] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-[#111827]">{label}</span>
        {value ? <button className="text-xs font-bold text-red-600" onClick={onClear} type="button">Remove</button> : null}
      </div>
      <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-[#f4fbf8] p-4">
        {value ? <img alt={`${label} preview`} className={compact ? "h-12 w-12 object-contain object-center" : "h-12 w-[245px] object-contain object-center"} src={value} /> : <span className="text-sm font-semibold text-[#9ca3af]">No {label.toLowerCase()} uploaded</span>}
      </div>
      <input accept="image/*" className="w-full text-sm text-[#4b5563] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef4f1] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#588368]" onChange={onChange} type="file" />
    </div>
  );
}

function BrandingColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <div className="flex overflow-hidden rounded-lg border border-[#d1d5db] bg-white">
        <input className="h-12 w-14 cursor-pointer border-0 bg-transparent p-1" value={value} onChange={(event) => onChange(event.target.value)} type="color" />
        <input className="min-w-0 flex-1 px-3 text-sm font-bold uppercase outline-none" value={value} onChange={(event) => onChange(event.target.value)} pattern="^#[0-9A-Fa-f]{6}$" />
      </div>
    </label>
  );
}

function BrandingSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">{label}</span>
      <select className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 capitalize outline-none focus:border-[#588368]" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option.replace(/-/g, " ")}</option>)}
      </select>
    </label>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function resizeBrandingImage(file: File, field: "logo_path" | "favicon_path") {
  if (typeof window === "undefined") {
    return readFileAsDataUrl(file);
  }
  const imageURL = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(imageURL);
    const target = field === "favicon_path" ? { width: 96, height: 96 } : { width: 245, height: 48 };
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return readFileAsDataUrl(file);
    }
    context.clearRect(0, 0, target.width, target.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const scale = Math.min(target.width / image.naturalWidth, target.height / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const x = Math.round((target.width - width) / 2);
    const y = Math.round((target.height - height) / 2);
    context.drawImage(image, x, y, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(imageURL);
  }
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = src;
  });
}

function BaseModal({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true">
      <div className={`max-h-full w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">{eyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold text-[#111827]">{title}</h2>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4fbf8] text-2xl text-[#588368]" onClick={onClose} type="button" aria-label="Close modal">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddTenantModal({
  countries,
  masterDataError,
  masterDataLoading,
  onClose,
  onCreated,
  plans,
  plansLoading,
  plansError,
  timezones,
}: {
  countries: MasterCountry[];
  masterDataError: string;
  masterDataLoading: boolean;
  onClose: () => void;
  onCreated: () => void;
  plans: TenantCatalogPlan[];
  plansLoading: boolean;
  plansError: string;
  timezones: MasterTimezone[];
}) {
  const steps = ["Company", "Admin User", "Plan / Trial", "Modules", "Review / Create"];
  const initialForm = useMemo<AssistedTenantWizardForm>(() => ({
    company_name: "",
    legal_name: "",
    subdomain: "",
    employee_estimate: "",
    country: "IN",
    timezone: "Asia/Kolkata",
    admin_first_name: "",
    admin_last_name: "",
    admin_email: "",
    admin_mobile: "",
    send_invite: true,
    use_temporary_password: false,
    temporary_password: "",
    plan_id: plans[0]?.id || "",
    trial_days: "30",
    billing_mode: "manual_billing",
    payment_method_status: "manual_billing",
  }), [plans]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AssistedTenantWizardForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<AssistedTenantWizardErrors>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [success, setSuccess] = useState<AssistedTenantProvisionResponse | null>(null);
  const selectedPlan = plans.find((plan) => plan.id === form.plan_id) || null;
  const tenantBaseDomain = getTenantBaseDomain();
  const workspaceUrl = form.subdomain.trim() ? `https://${tenantHost(form.subdomain.trim().toLowerCase(), tenantBaseDomain)}` : `https://<subdomain>.${tenantBaseDomain}`;

  function updateField<K extends AssistedTenantWizardField>(field: K, value: AssistedTenantWizardForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (error) setError("");
  }

  function validateStep(targetStep = step) {
    const nextErrors = validateAssistedTenantWizardStep(form, targetStep);
    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      setError("Please fix the highlighted fields.");
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStatus("idle");
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStatus("idle");
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submitWizard() {
    const allErrors = validateAssistedTenantWizardAll(form);
    if (!form.temporary_password.trim()) {
      allErrors.temporary_password = "Current assisted backend requires a local/demo temporary password until invite flow is available.";
    }
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...allErrors }));
      setStep(stepForAssistedTenantError(allErrors));
      setStatus("error");
      setError("Please fix the highlighted fields.");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const result = await apiRequest<AssistedTenantProvisionResponse>("/admin/tenants/provision", {
        method: "POST",
        body: {
          company_name: form.company_name.trim(),
          legal_name: form.legal_name.trim() || form.company_name.trim(),
          subdomain: form.subdomain.trim().toLowerCase(),
          employee_estimate: Number(form.employee_estimate || 0),
          country: form.country.trim().toUpperCase() || "IN",
          timezone: form.timezone.trim() || "Asia/Kolkata",
          admin_first_name: form.admin_first_name.trim(),
          admin_last_name: form.admin_last_name.trim(),
          admin_email: form.admin_email.trim().toLowerCase(),
          admin_mobile: form.admin_mobile.trim(),
          plan_id: form.plan_id,
          trial_days: Number(form.trial_days || 0),
          billing_mode: form.billing_mode,
          payment_method_status: form.payment_method_status,
          send_invite: form.send_invite,
          temporary_password: form.temporary_password,
        },
      });
      setSuccess(result);
      setStatus("success");
      setStep(steps.length - 1);
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create tenant right now.";
      const mappedErrors = mapAssistedTenantCreateError(message);
      setFieldErrors((current) => ({ ...current, ...mappedErrors }));
      if (Object.keys(mappedErrors).length > 0) setStep(stepForAssistedTenantError(mappedErrors));
      setStatus("error");
      setError(message);
    }
  }

  function createAnother() {
    setForm(initialForm);
    setFieldErrors({});
    setError("");
    setStatus("idle");
    setSuccess(null);
    setStep(0);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="assisted-tenant-title">
      <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-2xl bg-[#f4fbf8] p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Assisted Provisioning</p>
            <h2 id="assisted-tenant-title" className="mt-2 text-3xl font-bold text-[#111827]">Create Tenant</h2>
            <p className="mt-2 text-sm text-[#6b7280]">Create a tenant workspace, tenant admin, plan trial, and HRMS defaults from one platform-only flow.</p>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl text-[#588368]" onClick={onClose} type="button" aria-label="Close tenant creation wizard">
            ×
          </button>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <WizardStepper currentStep={step} steps={steps} />
          {error ? <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {success ? (
            <AssistedTenantSuccessPanel result={success} selectedPlan={selectedPlan} onBackToTenants={onClose} onCreateAnother={createAnother} />
          ) : (
            <>
              <div className="mt-6 min-h-[360px]">
                {step === 0 ? <AssistedCompanyStep baseDomain={tenantBaseDomain} countries={countries} errors={fieldErrors} form={form} masterDataError={masterDataError} masterDataLoading={masterDataLoading} onChange={updateField} timezones={timezones} workspaceUrl={workspaceUrl} /> : null}
                {step === 1 ? <AssistedAdminStep errors={fieldErrors} form={form} onChange={updateField} /> : null}
                {step === 2 ? <AssistedPlanStep errors={fieldErrors} form={form} onChange={updateField} plans={plans} plansError={plansError} plansLoading={plansLoading} selectedPlan={selectedPlan} /> : null}
                {step === 3 ? <AssistedModulesStep selectedPlan={selectedPlan} /> : null}
                {step === 4 ? <AssistedReviewStep form={form} selectedPlan={selectedPlan} workspaceUrl={workspaceUrl} /> : null}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-[#edf1ef] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151] disabled:cursor-not-allowed disabled:opacity-40" disabled={step === 0 || status === "submitting"} onClick={goBack} type="button">
                  Back
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" onClick={onClose} type="button">
                    Cancel
                  </button>
                  {step < steps.length - 1 ? (
                    <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white" onClick={goNext} type="button">
                      Next
                    </button>
                  ) : (
                    <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={status === "submitting"} onClick={() => void submitWizard()} type="button">
                      {status === "submitting" ? "Creating..." : "Create Tenant"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function WizardStepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <ol className="grid gap-2 md:grid-cols-5">
      {steps.map((label, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;
        return (
          <li className={`rounded-lg border px-3 py-3 ${active ? "border-[#588368] bg-[#f4fbf8]" : complete ? "border-[#ccebd8] bg-white" : "border-[#edf1ef] bg-[#f8faf9]"}`} key={label}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${active || complete ? "bg-[#588368] text-white" : "bg-[#e5e7eb] text-[#6b7280]"}`}>{complete ? "✓" : index + 1}</span>
            <p className="mt-2 text-sm font-black text-[#111827]">{label}</p>
          </li>
        );
      })}
    </ol>
  );
}

function AssistedCompanyStep({
  baseDomain,
  countries,
  errors,
  form,
  masterDataError,
  masterDataLoading,
  onChange,
  timezones,
  workspaceUrl,
}: {
  baseDomain: string;
  countries: MasterCountry[];
  errors: AssistedTenantWizardErrors;
  form: AssistedTenantWizardForm;
  masterDataError: string;
  masterDataLoading: boolean;
  onChange: AssistedFieldChange;
  timezones: MasterTimezone[];
  workspaceUrl: string;
}) {
  const countryOptions = countries.length > 0 ? countries : [{
    code: "IN",
    name: "India",
    currency_code: "INR",
    currency_name: "Indian Rupee",
    currency_symbol: "₹",
    flag_emoji: "🇮🇳",
    default_timezone_id: "Asia/Kolkata",
  }];
  const timezoneOptions = timezones.length > 0 ? timezones : [{
    id: "Asia/Kolkata",
    display_name: "Asia/Kolkata (UTC+05:30)",
    region: "Asia",
    utc_offset_minutes: 330,
    utc_offset: "UTC+05:30",
  }];
  const selectedCountry = countryOptions.find((country) => country.code === form.country);
  function changeCountry(code: string) {
    onChange("country", code);
    const country = countryOptions.find((item) => item.code === code);
    if (country?.default_timezone_id) {
      onChange("timezone", country.default_timezone_id);
    }
  }
  return (
    <section>
      <WizardStepHeading title="Company" subtitle="Start with the tenant identity and workspace address." />
      {masterDataError ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Master data unavailable: {masterDataError}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <WizardTextField error={errors.company_name} label="Company Name" onChange={(value) => onChange("company_name", value)} required value={form.company_name} />
        <WizardTextField error={errors.legal_name} label="Legal Name" onChange={(value) => onChange("legal_name", value)} value={form.legal_name} />
        <WizardSubdomainField baseDomain={baseDomain} error={errors.subdomain} onChange={(value) => onChange("subdomain", value.toLowerCase())} value={form.subdomain} workspaceUrl={workspaceUrl} />
        <WizardTextField error={errors.employee_estimate} label="Employee Estimate" onChange={(value) => onChange("employee_estimate", value)} type="number" value={form.employee_estimate} />
        <WizardSelectField
          error={errors.country}
          label="Country"
          loading={masterDataLoading}
          onChange={changeCountry}
          options={countryOptions.map((country) => ({
            label: `${country.flag_emoji} ${country.name} (${country.currency_code})`,
            value: country.code,
          }))}
          required
          value={form.country}
        />
        <WizardSelectField
          error={errors.timezone}
          label="Timezone"
          loading={masterDataLoading}
          onChange={(value) => onChange("timezone", value)}
          options={timezoneOptions.map((timezone) => ({
            label: timezone.display_name,
            value: timezone.id,
          }))}
          required
          value={form.timezone}
        />
      </div>
      {selectedCountry ? <p className="mt-3 text-sm font-semibold text-[#6b7280]">Currency: {selectedCountry.currency_symbol} {selectedCountry.currency_code} · {selectedCountry.currency_name}</p> : null}
    </section>
  );
}

function AssistedAdminStep({ form, errors, onChange }: { form: AssistedTenantWizardForm; errors: AssistedTenantWizardErrors; onChange: AssistedFieldChange }) {
  return (
    <section>
      <WizardStepHeading title="Admin User" subtitle="This user becomes TENANT_ADMIN for the new tenant." />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <WizardTextField error={errors.admin_first_name} label="First Name" onChange={(value) => onChange("admin_first_name", value)} required value={form.admin_first_name} />
        <WizardTextField error={errors.admin_last_name} label="Last Name" onChange={(value) => onChange("admin_last_name", value)} required value={form.admin_last_name} />
        <WizardTextField error={errors.admin_email} label="Work Email" onChange={(value) => onChange("admin_email", value)} required type="email" value={form.admin_email} />
        <WizardTextField error={errors.admin_mobile} label="Mobile" onChange={(value) => onChange("admin_mobile", value)} required type="tel" value={form.admin_mobile} />
      </div>
      <div className="mt-5 rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4">
        <label className="flex items-center gap-3 text-sm font-bold text-[#111827]">
          <input checked={form.send_invite} onChange={(event) => onChange("send_invite", event.target.checked)} type="checkbox" />
          Send invite when backend invite flow is available
        </label>
        <p className="mt-2 text-sm text-[#6b7280]">Invite-first is preferred. Current assisted backend reports invite availability in the create response.</p>
      </div>
      <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" open={form.use_temporary_password}>
        <summary className="cursor-pointer text-sm font-black text-amber-900" onClick={(event) => {
          event.preventDefault();
          onChange("use_temporary_password", !form.use_temporary_password);
        }}>
          Use temporary password for local/demo
        </summary>
        {form.use_temporary_password ? (
          <div className="mt-4">
            <WizardTextField error={errors.temporary_password} label="Temporary Password" onChange={(value) => onChange("temporary_password", value)} type="password" value={form.temporary_password} />
            <p className="mt-2 text-xs font-semibold text-amber-900">Do not store this password in browser storage. Share it through an approved local/demo channel only.</p>
          </div>
        ) : null}
      </details>
    </section>
  );
}

function AssistedPlanStep({
  form,
  errors,
  onChange,
  plans,
  plansLoading,
  plansError,
  selectedPlan,
}: {
  form: AssistedTenantWizardForm;
  errors: AssistedTenantWizardErrors;
  onChange: AssistedFieldChange;
  plans: TenantCatalogPlan[];
  plansLoading: boolean;
  plansError: string;
  selectedPlan: TenantCatalogPlan | null;
}) {
  const trialPreview = trialEndPreview(Number(form.trial_days || 0));
  return (
    <section>
      <WizardStepHeading title="Plan / Trial" subtitle="Choose the commercial plan and trial period. Manual billing only for this MVP." />
      {plansError ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Plan catalog unavailable: {plansError}</p> : null}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {plansLoading ? <p className="text-sm font-semibold text-[#6b7280]">Loading active plans...</p> : null}
        {!plansLoading && plans.length === 0 ? <p className="text-sm font-semibold text-[#6b7280]">No active plans are available.</p> : null}
        {plans.map((plan) => (
          <button className={`rounded-xl border p-4 text-left transition ${form.plan_id === plan.id ? "border-[#588368] bg-[#f4fbf8] shadow-sm" : "border-[#edf1ef] bg-white hover:border-[#ccebd8]"}`} key={plan.id} onClick={() => onChange("plan_id", plan.id)} type="button">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#111827]">{plan.name}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#6b7280]">{plan.code}</p>
              </div>
              <span className="rounded-full bg-[#eef6f1] px-3 py-1 text-xs font-black capitalize text-[#588368]">{plan.visibility}</span>
            </div>
            <div className="mt-4 grid gap-2 text-xs font-semibold text-[#4b5563] sm:grid-cols-2">
              <span>{plan.employee_limit ? `${plan.employee_limit} employee limit` : "No employee cap"}</span>
              <span>{formatMoney(plan.price_amount, plan.currency_code)} / {plan.billing_cycle.replaceAll("_", " ")}</span>
              <span>{plan.included_employees || 0} included</span>
              <span>{plan.trial_days || 0} catalog trial days</span>
            </div>
          </button>
        ))}
      </div>
      {errors.plan_id ? <p className="mt-2 text-sm font-semibold text-red-600">{errors.plan_id}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <WizardTextField error={errors.trial_days} label="Trial Days" onChange={(value) => onChange("trial_days", value)} required type="number" value={form.trial_days} />
        <WizardReadOnlyField label="Billing Mode" value={form.billing_mode} />
        <WizardReadOnlyField label="Payment Method Status" value={form.payment_method_status} />
      </div>
      <p className="mt-3 text-sm font-semibold text-[#6b7280]">Trial ends: {trialPreview}. Selected plan: {selectedPlan?.name || "None selected"}.</p>
    </section>
  );
}

function AssistedModulesStep({ selectedPlan }: { selectedPlan: TenantCatalogPlan | null }) {
  return (
    <section>
      <WizardStepHeading title="Modules" subtitle="Use plan defaults for this MVP. Module overrides are not changed here." />
      <div className="mt-5 rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#588368] text-sm font-black text-white">✓</span>
          <div>
            <p className="text-sm font-black text-[#111827]">Use plan defaults</p>
            <p className="mt-2 text-sm text-[#6b7280]">Modules will be enabled from the selected plan/default provisioning rules. This flow does not manage module overrides.</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {["Identity", "Dashboard", "HRMS", selectedPlan ? `${selectedPlan.name} defaults` : "Selected plan defaults"].map((item) => (
          <div className="rounded-xl border border-[#edf1ef] bg-white p-4" key={item}>
            <p className="text-sm font-black text-[#111827]">{item}</p>
            <p className="mt-1 text-xs font-semibold text-[#6b7280]">Provisioned by backend rules</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssistedReviewStep({ form, selectedPlan, workspaceUrl }: { form: AssistedTenantWizardForm; selectedPlan: TenantCatalogPlan | null; workspaceUrl: string }) {
  const rows = [
    ["Company", form.company_name || "-"],
    ["Legal name", form.legal_name || form.company_name || "-"],
    ["Workspace URL", workspaceUrl],
    ["Employee estimate", form.employee_estimate || "0"],
    ["Admin", `${form.admin_first_name} ${form.admin_last_name}`.trim() || "-"],
    ["Admin email", form.admin_email || "-"],
    ["Invite mode", form.send_invite ? "Invite preferred" : "Temporary password only"],
    ["Selected plan", selectedPlan ? `${selectedPlan.name} (${selectedPlan.code})` : "-"],
    ["Trial days", form.trial_days || "0"],
    ["Billing mode", form.billing_mode],
    ["Module mode", "Use plan defaults"],
  ];
  return (
    <section>
      <WizardStepHeading title="Review / Create" subtitle="Confirm the tenant details before provisioning." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div className="rounded-xl border border-[#edf1ef] bg-[#f8faf9] p-4" key={label}>
            <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p>
            <p className="mt-2 break-words text-sm font-bold text-[#111827]">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssistedTenantSuccessPanel({
  result,
  selectedPlan,
  onBackToTenants,
  onCreateAnother,
}: {
  result: AssistedTenantProvisionResponse;
  selectedPlan: TenantCatalogPlan | null;
  onBackToTenants: () => void;
  onCreateAnother: () => void;
}) {
  const copyTenantUrl = async () => {
    await navigator.clipboard?.writeText(result.tenant_url);
  };
  return (
    <section className="mt-6 rounded-2xl border border-[#ccebd8] bg-[#f4fbf8] p-5">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#588368]">Tenant Created</p>
      <h3 className="mt-2 text-2xl font-black text-[#111827]">{result.tenant_name}</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SuccessDetail label="Tenant URL" value={result.tenant_url} />
        <SuccessDetail label="Admin Email" value={result.admin_email} />
        <SuccessDetail label="Invite Status" value={result.invite_status.replaceAll("_", " ")} />
        <SuccessDetail label="Plan / Trial" value={`${selectedPlan?.name || result.plan_code} / ${formatDate(result.trial_ends_at)}`} />
        <SuccessDetail label="Provisioning Status" value={result.provisioning_status} />
        <SuccessDetail label="Subdomain" value={result.subdomain} />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button className="rounded-lg bg-[#588368] px-5 py-3 font-bold text-white" onClick={() => window.open(result.tenant_url, "_blank", "noopener,noreferrer")} type="button">
          Open Tenant
        </button>
        <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" onClick={() => void copyTenantUrl()} type="button">
          Copy Tenant URL
        </button>
        <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" onClick={onBackToTenants} type="button">
          Back to Tenants
        </button>
        <button className="rounded-lg border border-[#dbe0e5] bg-white px-5 py-3 font-semibold text-[#374151]" onClick={onCreateAnother} type="button">
          Create Another Tenant
        </button>
      </div>
    </section>
  );
}

function SuccessDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d8efe1] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className="mt-2 break-words text-sm font-bold capitalize text-[#111827]">{value || "-"}</p>
    </div>
  );
}

function WizardStepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-xl font-black text-[#111827]">{title}</h3>
      <p className="mt-1 text-sm text-[#6b7280]">{subtitle}</p>
    </div>
  );
}

type AssistedFieldChange = <K extends AssistedTenantWizardField>(field: K, value: AssistedTenantWizardForm[K]) => void;
type WizardSelectOption = { label: string; value: string };

function WizardTextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">
        {label}
        {!required ? <span className="ml-1 text-[#9ca3af]">(Optional)</span> : null}
      </span>
      <input aria-invalid={Boolean(error)} className={`w-full rounded-lg border px-4 py-3 outline-none focus:border-[#588368] ${error ? "border-red-400" : "border-[#d1d5db]"}`} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
    </label>
  );
}

function WizardSelectField({
  label,
  value,
  onChange,
  options,
  error,
  loading = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: WizardSelectOption[];
  error?: string;
  loading?: boolean;
  required?: boolean;
}) {
  if (options.length > 12) {
    return (
      <WizardSearchableSelectField
        error={error}
        label={label}
        loading={loading}
        onChange={onChange}
        options={options}
        required={required}
        value={value}
      />
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">
        {label}
        {!required ? <span className="ml-1 text-[#9ca3af]">(Optional)</span> : null}
      </span>
      <select aria-invalid={Boolean(error)} className={`w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-[#588368] ${error ? "border-red-400" : "border-[#d1d5db]"}`} disabled={loading && options.length === 0} onChange={(event) => onChange(event.target.value)} value={value}>
        {loading && options.length === 0 ? <option value="">Loading...</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
    </label>
  );
}

function WizardSearchableSelectField({
  label,
  value,
  onChange,
  options,
  error,
  loading = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: WizardSelectOption[];
  error?: string;
  loading?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) || null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 80);
    return options
      .filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 80);
  }, [normalizedQuery, options]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => searchRef.current?.focus(), 0);
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function chooseOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative block" ref={containerRef}>
      <span className="mb-2 block text-sm font-semibold text-[#111827]">
        {label}
        {!required ? <span className="ml-1 text-[#9ca3af]">(Optional)</span> : null}
      </span>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-left outline-none transition hover:border-[#588368] focus:border-[#588368] focus:ring-2 focus:ring-[#588368]/15 ${error ? "border-red-400" : "border-[#d1d5db]"}`}
        disabled={loading && options.length === 0}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${selectedOption ? "text-[#111827]" : "text-[#9ca3af]"}`}>
          {loading && options.length === 0 ? "Loading..." : selectedOption?.label || `Select ${label.toLowerCase()}`}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#588368] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute z-[95] mt-2 w-full overflow-hidden rounded-xl border border-[#dbe0e5] bg-white shadow-[0_20px_60px_rgba(17,24,39,0.18)]">
          <div className="flex items-center gap-2 border-b border-[#edf1ef] px-3 py-2">
            <Search className="h-4 w-4 text-[#588368]" />
            <input
              className="h-10 min-w-0 flex-1 text-sm font-semibold outline-none placeholder:text-[#9ca3af]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Type to search ${label.toLowerCase()}`}
              ref={searchRef}
              value={query}
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1" role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#f4fbf8] ${selected ? "bg-[#eef6f1] font-black text-[#426b53]" : "font-semibold text-[#374151]"}`}
                  key={option.value}
                  onClick={() => chooseOption(option.value)}
                  role="option"
                  aria-selected={selected}
                  type="button"
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#588368]" /> : null}
                </button>
              );
            }) : (
              <p className="px-4 py-6 text-center text-sm font-semibold text-[#6b7280]">No matching options.</p>
            )}
          </div>
          {options.length > 80 && !normalizedQuery ? <p className="border-t border-[#edf1ef] px-4 py-2 text-xs font-semibold text-[#6b7280]">Showing first 80. Type to narrow the list.</p> : null}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

function WizardSubdomainField({ baseDomain, value, onChange, error, workspaceUrl }: { baseDomain: string; value: string; onChange: (value: string) => void; error?: string; workspaceUrl: string }) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-2 block text-sm font-semibold text-[#111827]">Subdomain</span>
      <div className={`flex overflow-hidden rounded-lg border focus-within:border-[#588368] ${error ? "border-red-400" : "border-[#d1d5db]"}`}>
        <input aria-invalid={Boolean(error)} className="min-w-0 flex-1 px-4 py-3 lowercase outline-none" onChange={(event) => onChange(event.target.value)} pattern="[a-z0-9-]+" placeholder="example" title="Use lowercase letters, numbers, and hyphens only" type="text" value={value} />
        <span className="flex items-center bg-[#f4fbf8] px-4 text-sm font-semibold text-[#588368]">{`.${baseDomain}`}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-[#6b7280]">{workspaceUrl}</p>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
    </label>
  );
}

function WizardReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#edf1ef] bg-[#f8faf9] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function validateAssistedTenantWizardStep(form: AssistedTenantWizardForm, step: number): AssistedTenantWizardErrors {
  const errors: AssistedTenantWizardErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (step === 0) {
    if (!form.company_name.trim()) errors.company_name = "Company name is required.";
    const subdomain = form.subdomain.trim().toLowerCase();
    const subdomainError = validateAssistedTenantSubdomain(subdomain);
    if (subdomainError) errors.subdomain = subdomainError;
    if (form.employee_estimate.trim() && Number(form.employee_estimate) < 0) errors.employee_estimate = "Employee estimate must be 0 or more.";
    if (!form.country.trim()) errors.country = "Country is required.";
    if (!form.timezone.trim()) errors.timezone = "Timezone is required.";
  }
  if (step === 1) {
    if (!form.admin_first_name.trim()) errors.admin_first_name = "First name is required.";
    if (!form.admin_last_name.trim()) errors.admin_last_name = "Last name is required.";
    if (!form.admin_email.trim()) errors.admin_email = "Admin email is required.";
    else if (!emailPattern.test(form.admin_email.trim())) errors.admin_email = "Enter a valid email address.";
    if (!form.admin_mobile.trim()) errors.admin_mobile = "Admin mobile is required.";
    if (form.use_temporary_password && form.temporary_password.trim().length > 0 && form.temporary_password.trim().length < 12) {
      errors.temporary_password = "Temporary password must be at least 12 characters.";
    }
  }
  if (step === 2) {
    if (!form.plan_id) errors.plan_id = "Select a subscription plan.";
    if (form.trial_days.trim() === "") errors.trial_days = "Trial days are required.";
    else if (Number(form.trial_days) < 0) errors.trial_days = "Trial days must be 0 or more.";
  }
  return errors;
}

function validateAssistedTenantWizardAll(form: AssistedTenantWizardForm): AssistedTenantWizardErrors {
  return {
    ...validateAssistedTenantWizardStep(form, 0),
    ...validateAssistedTenantWizardStep(form, 1),
    ...validateAssistedTenantWizardStep(form, 2),
  };
}

function validateAssistedTenantSubdomain(value: string) {
  const subdomain = value.trim().toLowerCase();
  if (!subdomain) return "Subdomain is required.";
  if (subdomain.length < 3 || subdomain.length > 30) return "Use 3-30 lowercase letters, numbers, or hyphens.";
  return validateTenantSubdomain(subdomain);
}

function mapAssistedTenantCreateError(message: string): AssistedTenantWizardErrors {
  const normalized = message.toLowerCase();
  if (normalized.includes("subdomain")) return { subdomain: message };
  if (normalized.includes("admin email") || normalized.includes("email")) return { admin_email: message };
  if (normalized.includes("admin mobile") || normalized.includes("mobile") || normalized.includes("phone")) return { admin_mobile: message };
  if (normalized.includes("plan")) return { plan_id: message };
  if (normalized.includes("temporary_password") || normalized.includes("temporary password")) return { temporary_password: message };
  if (normalized.includes("company")) return { company_name: message };
  return {};
}

function stepForAssistedTenantError(errors: AssistedTenantWizardErrors) {
  if (errors.company_name || errors.legal_name || errors.subdomain || errors.employee_estimate || errors.country || errors.timezone) return 0;
  if (errors.admin_first_name || errors.admin_last_name || errors.admin_email || errors.admin_mobile || errors.temporary_password) return 1;
  if (errors.plan_id || errors.trial_days || errors.billing_mode || errors.payment_method_status) return 2;
  return 4;
}

function trialEndPreview(days: number) {
  if (!Number.isFinite(days) || days < 0) return "-";
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date.toISOString());
}
