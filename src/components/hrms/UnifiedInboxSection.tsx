"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BranchTenantOption } from "@/components/hrms/BranchesSection";
import { apiRequest } from "@/lib/api";

type ActiveSectionTarget =
  | "operations-workbench"
  | "workflow-inbox"
  | "hr-helpdesk"
  | "employee-relations"
  | "notification-inbox"
  | "leave-approvals"
  | "attendance"
  | "payroll-operations"
  | "offer-letters"
  | "candidate-onboarding"
  | "employee-letters"
  | "agreements"
  | "document-sign"
  | "employee-exits"
  | "compliance"
  | "insights"
  | "celebrations";

type WorkbenchCard = {
  card_key: string;
  lane: string;
  category: string;
  source_module: string;
  source_type: string;
  source_id: string;
  title: string;
  summary?: string;
  status?: string;
  severity?: string;
  priority?: number;
  due_at?: string | null;
  action_label?: string;
  route_section?: string;
  route_record_id?: string | null;
  metadata?: Record<string, unknown> | null;
  actions?: WorkItemAction[] | null;
};

type WorkbenchResponse = {
  cards?: WorkbenchCard[] | null;
};

type WorkflowTask = {
  id: string;
  task_number: string;
  title: string;
  description?: string | null;
  source_module: string;
  source_type: string;
  source_record_label?: string | null;
  status: string;
  severity: string;
  priority: number;
  due_at?: string | null;
  updated_at: string;
};

type Celebration = {
  id: string;
  user_id?: string | null;
  celebration_type_name?: string | null;
  celebration_date?: string | null;
  custom_title?: string | null;
  description?: string | null;
  employee_name?: string | null;
  branch_name?: string | null;
  is_user_celebration?: boolean | null;
  next_occurrence_date?: string | null;
  days_until_next_occurrence?: number | null;
};

type InboxItem = {
  id: string;
  kind: "task" | "event";
  title: string;
  summary: string;
  meta: string;
  badge: string;
  tone: "green" | "blue" | "orange" | "red" | "gray";
  routeSection: ActiveSectionTarget;
  sourceLabel: string;
  actionLabel: string;
  sortRank: number;
  cardKey?: string;
  actionSource?: "workbench" | "workflow" | "local";
  sourceType?: string;
  sourceID?: string;
  sourceRecordID?: string | null;
  details?: Array<{ label: string; value: string }>;
  metadata?: Record<string, unknown> | null;
  actions?: WorkItemAction[];
  workflowTaskID?: string;
  canComplete?: boolean;
  canApproveReject?: boolean;
  canRespond?: boolean;
  preview?: boolean;
  operationsOnly?: boolean;
};

type WorkItemAction = {
  key: "approve" | "reject" | "complete" | "respond" | "open_record" | string;
  label: string;
  tone?: "positive" | "danger" | "neutral" | string;
  primary?: boolean;
  inline: boolean;
  requires_remarks?: boolean;
  remarks_placeholder?: string;
  completion_badge?: string;
};

const openRecordAction: WorkItemAction = { key: "open_record", label: "Open full record", tone: "neutral", inline: false };
const approveRejectActions: WorkItemAction[] = [
  { key: "approve", label: "Approve", tone: "positive", primary: true, inline: true, completion_badge: "Approved" },
  { key: "reject", label: "Reject", tone: "danger", inline: true, requires_remarks: true, remarks_placeholder: "Reason for rejection", completion_badge: "Rejected" },
  openRecordAction,
];
const completeActions: WorkItemAction[] = [
  { key: "complete", label: "Complete", tone: "positive", primary: true, inline: true, completion_badge: "Completed" },
  openRecordAction,
];
const respondActions: WorkItemAction[] = [
  { key: "respond", label: "Send Reply", tone: "positive", primary: true, inline: true, remarks_placeholder: "Write a reply...", completion_badge: "Responded" },
  { key: "respond", label: "Quick Wish", tone: "neutral", inline: true, completion_badge: "Responded" },
  { ...openRecordAction, label: "Open celebration record" },
];
const selfCelebrationActions: WorkItemAction[] = [
  { ...openRecordAction, label: "Open celebration calendar" },
];

const sampleInboxItems: InboxItem[] = [
  {
    id: "sample-birthday-dinesh-rana",
    kind: "event",
    title: "Birthday - Riya Kapoor",
    summary: "Wish Riya on her birthday and notify the team celebration channel.",
    meta: "Today · Corporate Office",
    badge: "Event",
    tone: "green",
    routeSection: "celebrations",
    sourceLabel: "Celebrations",
    actionLabel: "Open celebration record",
    sortRank: 1,
    actionSource: "local",
    actions: respondActions,
    preview: true,
  },
  {
    id: "sample-offer-priya-sharma",
    kind: "task",
    title: "Prepare offer letter - Priya Sharma",
    summary: "Candidate selected for Senior Accountant. Generate offer letter and send it for approval.",
    meta: "Hiring · Today",
    badge: "Pending",
    tone: "orange",
    routeSection: "offer-letters",
    sourceLabel: "Recruitment · Offer Letter",
    actionLabel: "Open full record",
    sortRank: 2,
    actionSource: "local",
    actions: completeActions,
    preview: true,
    operationsOnly: true,
  },
  {
    id: "sample-leave-amit-verma",
    kind: "task",
    title: "Leave request - Amit Verma",
    summary: "Casual leave requested for 2 days. Review team availability before approving.",
    meta: "Approvals · Today",
    badge: "Open",
    tone: "blue",
    routeSection: "leave-approvals",
    sourceLabel: "Time · Leave Approval",
    actionLabel: "Open full record",
    sortRank: 3,
    actionSource: "local",
    actions: approveRejectActions,
    sourceType: "leave_approval",
    sourceID: "sample-leave-amit-verma",
    metadata: { approver_id: "sample" },
    details: [
      { label: "Employee", value: "Amit Verma" },
      { label: "Leave type", value: "Casual leave" },
      { label: "Duration", value: "2 days" },
      { label: "Reason", value: "Personal work" },
    ],
    preview: true,
    operationsOnly: true,
  },
  {
    id: "sample-attendance-neha-singh",
    kind: "task",
    title: "Attendance regularisation - Neha Singh",
    summary: "Missed checkout submitted with location proof from client site.",
    meta: "Attendance · Overdue",
    badge: "Overdue",
    tone: "red",
    routeSection: "attendance",
    sourceLabel: "Time · Attendance",
    actionLabel: "Open full record",
    sortRank: 4,
    actionSource: "local",
    actions: completeActions,
    preview: true,
    operationsOnly: true,
  },
  {
    id: "sample-payroll-blocker",
    kind: "task",
    title: "Payroll blocker - 3 unresolved exceptions",
    summary: "Late attendance and missing salary details are blocking payroll readiness for June.",
    meta: "Payroll · High",
    badge: "High",
    tone: "red",
    routeSection: "payroll-operations",
    sourceLabel: "Payroll · Readiness",
    actionLabel: "Open full record",
    sortRank: 5,
    actionSource: "local",
    actions: completeActions,
    preview: true,
    operationsOnly: true,
  },
  {
    id: "sample-document-sign",
    kind: "task",
    title: "Document sign - Policy acknowledgement",
    summary: "IT security policy acknowledgement is waiting for HR release to employees.",
    meta: "Documents · Tomorrow",
    badge: "Draft",
    tone: "gray",
    routeSection: "document-sign",
    sourceLabel: "Documents · Sign Request",
    actionLabel: "Open full record",
    sortRank: 6,
    actionSource: "local",
    actions: completeActions,
    preview: true,
    operationsOnly: true,
  },
  {
    id: "sample-exit-clearance",
    kind: "task",
    title: "Exit clearance - Rohit Mehra",
    summary: "Laptop return and access deactivation tasks are still pending before final settlement.",
    meta: "Exit · 2d",
    badge: "Open",
    tone: "orange",
    routeSection: "employee-exits",
    sourceLabel: "People · Exit",
    actionLabel: "Open full record",
    sortRank: 7,
    actionSource: "local",
    actions: completeActions,
    preview: true,
    operationsOnly: true,
  },
  {
    id: "sample-anniversary",
    kind: "event",
    title: "Work anniversary - Meera Iyer",
    summary: "Five-year service anniversary reminder for the HR engagement calendar.",
    meta: "3d · Bengaluru",
    badge: "Event",
    tone: "blue",
    routeSection: "celebrations",
    sourceLabel: "Celebrations",
    actionLabel: "Open celebration record",
    sortRank: 8,
    actionSource: "local",
    actions: respondActions,
    preview: true,
  },
];

const sampleCompletedInboxItems: InboxItem[] = [
  {
    id: "sample-completed-policy",
    kind: "task",
    title: "Policy acknowledgement completed",
    summary: "Information security policy acknowledgement was completed and released to the employee record.",
    meta: "Completed · 12 Jun 2026",
    badge: "Completed",
    tone: "green",
    routeSection: "document-sign",
    sourceLabel: "Documents · Sign Request",
    actionLabel: "Open document sign",
    sortRank: 101,
    preview: true,
  },
  {
    id: "sample-completed-leave",
    kind: "task",
    title: "Leave request approved - Riya Kapoor",
    summary: "Sick leave request was approved and moved out of the active approval queue.",
    meta: "Completed · 08 Jun 2026",
    badge: "Approved",
    tone: "green",
    routeSection: "leave-approvals",
    sourceLabel: "Time · Leave Approval",
    actionLabel: "Open approvals",
    sortRank: 102,
    preview: true,
    operationsOnly: true,
  },
  {
    id: "sample-completed-onboarding",
    kind: "task",
    title: "Onboarding checklist closed - Karan Patel",
    summary: "All joining documents, asset issue, and first-day tasks were completed for the new hire.",
    meta: "Completed · 28 May 2026",
    badge: "Completed",
    tone: "green",
    routeSection: "candidate-onboarding",
    sourceLabel: "Hiring · Onboarding",
    actionLabel: "Open onboarding",
    sortRank: 103,
    preview: true,
    operationsOnly: true,
  },
];

const routeSections = new Set<string>([
  "operations-workbench",
  "workflow-inbox",
  "hr-helpdesk",
  "employee-relations",
  "notification-inbox",
  "leave-approvals",
  "attendance",
  "payroll-operations",
  "offer-letters",
  "candidate-onboarding",
  "employee-letters",
  "agreements",
  "document-sign",
  "employee-exits",
  "compliance",
  "insights",
  "celebrations",
]);

function routeSection(value?: string | null): ActiveSectionTarget {
  return value && routeSections.has(value) ? value as ActiveSectionTarget : "operations-workbench";
}

function humanize(value?: string | null) {
  const text = (value || "").trim();
  if (!text) return "";
  return text.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function dueLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return formatDate(value);
}

function toneForSeverity(severity?: string | null): InboxItem["tone"] {
  const normalized = (severity || "").toLowerCase();
  if (normalized === "critical" || normalized === "high") return "red";
  if (normalized === "medium") return "orange";
  if (normalized === "low") return "blue";
  return "gray";
}

function mapWorkbench(card: WorkbenchCard): InboxItem {
  const due = dueLabel(card.due_at);
  const lane = humanize(card.lane) || "Task";
  const metadata = card.metadata || null;
  const sourceType = card.source_type || "";
  const details = [
    { label: "Queue", value: lane },
    { label: "Source", value: [humanize(card.source_module), humanize(sourceType)].filter(Boolean).join(" · ") },
    { label: "Due", value: due },
    { label: "Employee", value: stringMeta(metadata, "employee_name") },
    { label: "Employee code", value: stringMeta(metadata, "employee_code") },
    { label: "Department", value: stringMeta(metadata, "department") },
    { label: "Leave type", value: stringMeta(metadata, "leave_type") },
    { label: "Leave dates", value: dateRangeMeta(metadata, "start_date", "end_date") },
    { label: "Day type", value: [humanize(stringMeta(metadata, "start_day_type")), humanize(stringMeta(metadata, "end_day_type"))].filter(Boolean).join(" to ") },
    { label: "Days", value: stringMeta(metadata, "days") },
    { label: "Reason", value: stringMeta(metadata, "reason") },
    { label: "Applied", value: formatDate(stringMeta(metadata, "applied_date")) },
    { label: "Request type", value: stringMeta(metadata, "request_type") },
    { label: "Status", value: humanize(card.status) },
  ].filter((detail) => detail.value);
  return {
    id: `task-${card.card_key || card.source_id}`,
    kind: "task",
    title: card.title || lane,
    summary: card.summary || humanize(card.source_type) || "Open work item",
    meta: [lane, due].filter(Boolean).join(" · ") || "Task",
    badge: humanize(card.status) || "Open",
    tone: toneForSeverity(card.severity),
    routeSection: routeSection(card.route_section),
    sourceLabel: [humanize(card.source_module), humanize(card.source_type)].filter(Boolean).join(" · ") || "Operations",
    actionLabel: card.actions?.find((action) => action.key === "open_record")?.label || "Open full record",
    sortRank: (due === "Overdue" ? 0 : due === "Today" ? 5 : 20) + (card.priority || 50),
    cardKey: card.card_key,
    actionSource: "workbench",
    sourceType,
    sourceID: card.source_id,
    sourceRecordID: card.route_record_id,
    details,
    metadata,
    actions: Array.isArray(card.actions) && card.actions.length ? card.actions : [openRecordAction],
  };
}

function mapWorkflowTask(task: WorkflowTask, completed = false): InboxItem {
  const due = dueLabel(task.due_at);
  return {
    id: `workflow-${task.id}`,
    kind: "task",
    title: task.title || task.task_number,
    summary: task.description || task.source_record_label || humanize(task.source_type) || "Workflow task",
    meta: completed ? `Completed · ${formatDate(task.updated_at) || humanize(task.status)}` : [humanize(task.source_module) || "Workflow", due].filter(Boolean).join(" · "),
    badge: humanize(task.status) || (completed ? "Completed" : "Open"),
    tone: completed ? "green" : toneForSeverity(task.severity),
    routeSection: "workflow-inbox",
    sourceLabel: [humanize(task.source_module), humanize(task.source_type)].filter(Boolean).join(" · ") || "Workflow",
    actionLabel: "Open workflow task",
    sortRank: completed ? 100 + (task.priority || 50) : (due === "Overdue" ? 0 : due === "Today" ? 5 : 20) + (task.priority || 50),
    actionSource: "workflow",
    sourceType: task.source_type,
    workflowTaskID: task.id,
    actions: completed ? [openRecordAction] : task.source_type.toLowerCase().includes("approval") ? approveRejectActions : completeActions,
    details: [
      { label: "Task no.", value: task.task_number },
      { label: "Source", value: [humanize(task.source_module), humanize(task.source_type)].filter(Boolean).join(" · ") },
      { label: "Record", value: task.source_record_label || "" },
      { label: "Due", value: due },
      { label: "Priority", value: String(task.priority || "") },
      { label: "Severity", value: humanize(task.severity) },
    ].filter((detail) => detail.value),
  };
}

function mapCelebration(item: Celebration, currentUserID?: string | null): InboxItem {
  const typeName = item.celebration_type_name || "Celebration";
  const personOrTitle = item.employee_name || item.custom_title || item.branch_name || "Company event";
  const days = item.days_until_next_occurrence;
  const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : typeof days === "number" ? `${days}d` : dueLabel(item.next_occurrence_date || item.celebration_date);
  const isBirthday = typeName.toLowerCase().includes("birthday");
  const isSelfEvent = Boolean(currentUserID && item.user_id && item.user_id === currentUserID);
  const isPersonalCelebration = Boolean(item.is_user_celebration || item.user_id);
  const eventLabel = isBirthday ? "Birthday" : typeName;
  const summary = isSelfEvent && isBirthday
    ? "Your birthday is today. The team can send wishes from their workbench."
    : isSelfEvent
      ? `Your ${typeName.toLowerCase()} is coming up.`
      : item.description || item.custom_title || `${typeName} reminder`;
  const title = isSelfEvent ? `Your ${eventLabel}` : isPersonalCelebration ? `${eventLabel} - ${personOrTitle}` : personOrTitle;
  return {
    id: `event-${item.id}`,
    kind: "event",
    title,
    summary,
    meta: [when, item.branch_name].filter(Boolean).join(" · ") || "Upcoming",
    badge: "Event",
    tone: days === 0 ? "green" : "blue",
    routeSection: "celebrations",
    sourceLabel: "Celebrations",
    actionLabel: "Open celebration record",
    sortRank: typeof days === "number" ? days : 30,
    actionSource: "local",
    sourceType: "celebration",
    sourceID: item.id,
    actions: isSelfEvent ? selfCelebrationActions : respondActions,
    details: [
      { label: "Event type", value: typeName },
      { label: "Person", value: isSelfEvent ? "You" : personOrTitle },
      { label: "Date", value: formatDate(item.next_occurrence_date || item.celebration_date) },
      { label: "Branch", value: item.branch_name || "" },
    ].filter((detail) => detail.value),
  };
}

function stringMeta(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function dateRangeMeta(metadata: Record<string, unknown> | null | undefined, startKey: string, endKey: string) {
  const start = formatDate(stringMeta(metadata, startKey));
  const end = formatDate(stringMeta(metadata, endKey));
  return [start, end].filter(Boolean).join(" to ");
}

function tenantSortValue(tenant: BranchTenantOption) {
  return `${tenant.name || ""} ${tenant.code || ""}`.toLowerCase();
}

export function UnifiedInboxSection({
  canUseOperationsWorkbench = false,
  currentUserID,
  folder,
  isSuperAdmin,
  onNavigate,
  tenants,
  tenantsError,
  tenantsLoading,
}: {
  canUseOperationsWorkbench?: boolean;
  currentUserID?: string | null;
  folder: "inbox" | "completed";
  isSuperAdmin: boolean;
  onNavigate: (section: string) => void;
  tenants: BranchTenantOption[];
  tenantsError: string;
  tenantsLoading: boolean;
}) {
  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => tenantSortValue(a).localeCompare(tenantSortValue(b))), [tenants]);
  const [selectedTenantID, setSelectedTenantID] = useState("");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [completedItems, setCompletedItems] = useState<InboxItem[]>([]);
  const [completedPreviewIDs, setCompletedPreviewIDs] = useState<Set<string>>(() => new Set());
  const [localCompletedItems, setLocalCompletedItems] = useState<InboxItem[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [filter, setFilter] = useState<"all" | "task" | "event">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [actioningID, setActioningID] = useState("");
  const [samplePreviewAllowed, setSamplePreviewAllowed] = useState(false);
  const basePath = isSuperAdmin && selectedTenantID ? `/hrms/tenants/${selectedTenantID}` : "/hrms";
  const canLoad = !isSuperAdmin || Boolean(selectedTenantID);

  const load = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    try {
      const [workbenchResult, celebrationsResult, workflowInboxResult, workflowCompletedResult] = await Promise.allSettled([
        canUseOperationsWorkbench ? apiRequest<WorkbenchResponse>(`${basePath}/operations-workbench?limit=100`) : Promise.resolve<WorkbenchResponse>({ cards: [] }),
        apiRequest<Celebration[]>(`${basePath}/celebrations`),
        apiRequest<WorkflowTask[]>(`${basePath}/workflow-tasks?view=inbox&limit=100`),
        apiRequest<WorkflowTask[]>(`${basePath}/workflow-tasks?view=completed&limit=100`),
      ]);
      const nextItems = [
        ...(workbenchResult.status === "fulfilled" ? (Array.isArray(workbenchResult.value.cards) ? workbenchResult.value.cards : []).map(mapWorkbench) : []),
        ...(celebrationsResult.status === "fulfilled" ? (Array.isArray(celebrationsResult.value) ? celebrationsResult.value : []).filter((item) => !(currentUserID && item.user_id === currentUserID)).map((item) => mapCelebration(item, currentUserID)) : []),
        ...(workflowInboxResult.status === "fulfilled" ? (Array.isArray(workflowInboxResult.value) ? workflowInboxResult.value : []).map((task) => mapWorkflowTask(task)) : []),
      ].sort((a, b) => a.sortRank - b.sortRank || a.title.localeCompare(b.title));
      const nextCompletedItems = [
        ...(workflowCompletedResult.status === "fulfilled" ? (Array.isArray(workflowCompletedResult.value) ? workflowCompletedResult.value : []).map((task) => mapWorkflowTask(task, true)) : []),
      ].sort((a, b) => a.sortRank - b.sortRank || a.title.localeCompare(b.title));
      setItems(nextItems);
      setCompletedItems(nextCompletedItems);
      setSelectedID((current) => current && [...nextItems, ...nextCompletedItems].some((item) => item.id === current) ? current : (folder === "completed" ? nextCompletedItems[0]?.id : nextItems[0]?.id) || "");
      if (workbenchResult.status === "rejected" && celebrationsResult.status === "rejected" && workflowInboxResult.status === "rejected" && workflowCompletedResult.status === "rejected") {
        setError("Workbench could not be loaded.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workbench could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [basePath, canLoad, canUseOperationsWorkbench, currentUserID, folder]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const host = window.location.hostname.toLowerCase();
      setSamplePreviewAllowed(host === "localhost" || host === "127.0.0.1" || host.startsWith("dev.") || host.includes(".dev."));
      try {
        const stored = JSON.parse(window.sessionStorage.getItem("setika_inbox_completed_preview_ids") || "[]");
        if (Array.isArray(stored)) {
          setCompletedPreviewIDs(new Set(stored.filter((value) => typeof value === "string")));
        }
      } catch {
        setCompletedPreviewIDs(new Set());
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSelectedID(""), 0);
    return () => window.clearTimeout(timer);
  }, [folder]);

  const allowedSampleInboxItems = canUseOperationsWorkbench ? sampleInboxItems : sampleInboxItems.filter((sample) => !sample.operationsOnly);
  const allowedSampleCompletedItems = canUseOperationsWorkbench ? sampleCompletedInboxItems : sampleCompletedInboxItems.filter((sample) => !sample.operationsOnly);
  const sampleItemsToShow = samplePreviewAllowed && canLoad && !loading && items.length < allowedSampleInboxItems.length ? allowedSampleInboxItems.filter((sample) => !items.some((item) => item.id === sample.id) && !completedPreviewIDs.has(sample.id)).slice(0, allowedSampleInboxItems.length - items.length) : [];
  const completedFromPreview = allowedSampleInboxItems
    .filter((sample) => completedPreviewIDs.has(sample.id))
    .map((sample) => ({ ...sample, badge: "Completed", tone: "green" as const, meta: sample.meta.startsWith("Completed") ? sample.meta : `Completed · ${formatDate(new Date().toISOString())}`, actions: [openRecordAction], canComplete: false, sortRank: 100 + sample.sortRank }));
  const completedPreviewHistory = samplePreviewAllowed && canLoad && !loading ? [...completedFromPreview, ...allowedSampleCompletedItems] : completedFromPreview;
  const inboxDisplayItems = [...items.filter((item) => !completedPreviewIDs.has(item.id)), ...sampleItemsToShow].sort((a, b) => a.sortRank - b.sortRank || a.title.localeCompare(b.title));
  const completedDisplayItems = [...localCompletedItems, ...completedItems, ...completedPreviewHistory].sort((a, b) => a.sortRank - b.sortRank || a.title.localeCompare(b.title));
  const usingSampleData = sampleItemsToShow.length > 0 || completedPreviewHistory.length > 0;
  const displayItems = folder === "completed" ? completedDisplayItems : inboxDisplayItems;
  const filteredItems = displayItems.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesFilter = filter === "all" || item.kind === filter;
    const matchesSearch = !query || [item.title, item.summary, item.meta, item.sourceLabel, item.badge].some((value) => value.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });
  const selected = filteredItems.find((item) => item.id === selectedID) || filteredItems[0] || null;

  function markLocalCompleted(item: InboxItem, badge: string, response?: string) {
    const completedItem = {
      ...item,
      badge,
      tone: "green" as const,
      meta: `Completed · ${formatDate(new Date().toISOString())}`,
      summary: response ? `${item.summary}\n\nResponse: ${response}` : item.summary,
      canApproveReject: false,
      canComplete: false,
      canRespond: false,
      actions: [openRecordAction],
      sortRank: 100 + item.sortRank,
    };
    setCompletedItems((current) => current.filter((row) => row.id !== item.id));
    setLocalCompletedItems((current) => [completedItem, ...current.filter((row) => row.id !== item.id)]);
    setItems((current) => current.filter((row) => row.id !== item.id));
    setCompletedPreviewIDs((current) => {
      const next = new Set(current).add(item.id);
      window.sessionStorage.setItem("setika_inbox_completed_preview_ids", JSON.stringify(Array.from(next)));
      return next;
    });
    setSelectedID("");
  }

  async function actOnItem(item: InboxItem, action: WorkItemAction, remarks: string) {
    const actionKey = action.key;
    setActionMessage("");
    setActionError("");
    setActioningID(`${item.id}:${actionKey}:${action.label}`);
    try {
      if (actionKey === "open_record") {
        onNavigate(item.routeSection);
        return;
      }
      if (action.requires_remarks && !remarks.trim()) {
        setActionError("Remarks are required for this action.");
        return;
      }
      if (item.actionSource === "workbench" && item.cardKey) {
        const result = await apiRequest<{ badge?: string }>(`${basePath}/operations-workbench/actions`, { method: "POST", body: { card_key: item.cardKey, action: actionKey, remarks: remarks || undefined } });
        markLocalCompleted(item, result.badge || action.completion_badge || humanize(actionKey) || "Completed", remarks);
        setActionMessage(`${action.label} recorded.`);
        return;
      }
      if (item.actionSource === "workflow" && item.workflowTaskID) {
        await apiRequest(`${basePath}/workflow-tasks/${item.workflowTaskID}/actions`, { method: "POST", body: { action: actionKey === "respond" ? "comment" : actionKey, remarks: remarks || `${humanize(actionKey)} from Workbench.` } });
        markLocalCompleted(item, action.completion_badge || humanize(actionKey) || "Completed", remarks);
        setActionMessage(`${action.label} recorded.`);
        return;
      }
      markLocalCompleted(item, action.completion_badge || (actionKey === "respond" ? "Responded" : humanize(actionKey) || "Completed"), remarks);
      setActionMessage(actionKey === "respond" ? "Response recorded." : `${action.label} recorded.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to complete workbench action.");
    } finally {
      setActioningID("");
    }
  }

  if (isSuperAdmin && !selectedTenantID) {
    return (
      <main className="space-y-5 p-4 sm:p-6 lg:p-10">
        <InboxHeader count={0} folder={folder} loading={loading} onRefresh={() => void load()} />
        {tenantsError ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{tenantsError}</p> : null}
        <section className="rounded-lg border border-[#dfe6e2] bg-white p-5 shadow-sm">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-[#8a978f]">Tenant</label>
          <select className="mt-2 h-11 w-full rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#374151] outline-none focus:border-[#588368]" disabled={tenantsLoading} onChange={(event) => setSelectedTenantID(event.target.value)} value={selectedTenantID}>
            <option value="">{tenantsLoading ? "Loading tenants..." : "Select tenant"}</option>
            {sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}
          </select>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-4 sm:p-6 lg:p-10">
      <InboxHeader count={displayItems.length} folder={folder} loading={loading} onRefresh={() => void load()} sample={usingSampleData} />
      {isSuperAdmin ? (
        <select className="h-10 rounded-lg border border-[#dbe0e5] bg-white px-3 text-sm font-bold text-[#374151]" disabled={tenantsLoading} onChange={(event) => setSelectedTenantID(event.target.value)} value={selectedTenantID}>
          <option value="">Select tenant</option>
          {sortedTenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>)}
        </select>
      ) : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      {actionMessage ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{actionMessage}</p> : null}
      {actionError ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{actionError}</p> : null}
      <section className="rounded-lg border border-[#dfe6e2] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-lg bg-[#f3f6f4] p-1">
            {[
              { key: "all", label: "All" },
              { key: "task", label: "Tasks" },
              { key: "event", label: "Events" },
            ].map((tab) => (
              <button className={`rounded-md px-4 py-2 text-sm font-black ${filter === tab.key ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280]"}`} key={tab.key} onClick={() => setFilter(tab.key as typeof filter)} type="button">{tab.label}</button>
            ))}
          </div>
        <input className="h-10 rounded-lg border border-[#dbe0e5] px-3 text-sm font-semibold outline-none focus:border-[#588368] lg:w-[320px]" onChange={(event) => setSearch(event.target.value)} placeholder={folder === "completed" ? "Search completed history" : "Search workbench"} value={search} />
        </div>
      </section>
      <section className="grid overflow-hidden rounded-lg border border-[#dfe6e2] bg-white shadow-sm xl:min-h-[620px] xl:grid-cols-[420px_1fr]">
        <div className="border-b border-[#edf1ef] xl:border-b-0 xl:border-r">
          <div className="border-b border-[#edf1ef] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a978f]">{filteredItems.length} items</p>
          </div>
          <div className="max-h-[52vh] overflow-y-auto xl:max-h-[620px]">
            {loading && !filteredItems.length ? <p className="p-5 text-sm font-semibold text-[#6b7280]">Loading workbench...</p> : null}
            {!loading && !filteredItems.length ? <p className="p-5 text-sm font-semibold text-[#6b7280]">No work items found.</p> : null}
            {filteredItems.map((item) => <InboxListItem item={item} key={item.id} onClick={() => setSelectedID(item.id)} selected={selected?.id === item.id} />)}
          </div>
        </div>
        <div className="min-w-0">
          {selected ? <InboxDetail actioningID={actioningID} folder={folder} item={selected} onAct={actOnItem} onNavigate={onNavigate} /> : <div className="flex min-h-[420px] items-center justify-center p-8 text-sm font-semibold text-[#6b7280]">Select an item to view details.</div>}
        </div>
      </section>
    </main>
  );
}

function InboxHeader({ count, folder, loading, onRefresh, sample }: { count: number; folder: "inbox" | "completed"; loading: boolean; onRefresh: () => void; sample?: boolean }) {
  const title = folder === "completed" ? "Completed" : "Workbench";
  const subtitle = folder === "completed" ? `${count} completed tasks, actions, and events in history.` : `${count} current tasks, actions, reminders, and events.`;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#588368]">{folder === "completed" ? "Work history" : "My workbench"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">{title}</h1>
          {sample ? <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-black text-[#c2410c]">Sample preview</span> : null}
        </div>
        <p className="mt-2 text-sm font-semibold text-[#6b7280]">{subtitle}</p>
      </div>
      <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151] hover:bg-[#f8faf9]" onClick={onRefresh} type="button">{loading ? "Refreshing..." : "Refresh"}</button>
    </div>
  );
}

function InboxListItem({ item, onClick, selected }: { item: InboxItem; onClick: () => void; selected: boolean }) {
  const toneClass: Record<InboxItem["tone"], string> = {
    green: "bg-[#eef4f1] text-[#588368]",
    blue: "bg-[#eff6ff] text-[#2563eb]",
    orange: "bg-[#fff7ed] text-[#c2410c]",
    red: "bg-[#fef2f2] text-[#b91c1c]",
    gray: "bg-[#f3f4f6] text-[#4b5563]",
  };

  return (
    <button className={`block w-full border-b border-[#edf1ef] px-4 py-4 text-left transition ${selected ? "bg-[#eef4f1]" : "hover:bg-[#f8faf9]"}`} onClick={onClick} type="button">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-black text-[#111827]">{item.title}</h2>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${toneClass[item.tone]}`}>{item.badge}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#6b7280]">{item.summary}</p>
      <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
        <span className="truncate text-[11px] font-bold text-[#8a978f]">{item.sourceLabel}</span>
        <span className="shrink-0 text-[11px] font-black text-[#588368]">{item.meta}</span>
      </div>
    </button>
  );
}

function InboxDetail({
  actioningID,
  folder,
  item,
  onAct,
  onNavigate,
}: {
  actioningID: string;
  folder: "inbox" | "completed";
  item: InboxItem;
  onAct: (item: InboxItem, action: WorkItemAction, remarks: string) => void;
  onNavigate: (section: string) => void;
}) {
  const [note, setNote] = useState("");
  const toneClass: Record<InboxItem["tone"], string> = {
    green: "bg-[#eef4f1] text-[#588368]",
    blue: "bg-[#eff6ff] text-[#2563eb]",
    orange: "bg-[#fff7ed] text-[#c2410c]",
    red: "bg-[#fef2f2] text-[#b91c1c]",
    gray: "bg-[#f3f4f6] text-[#4b5563]",
  };
  const inlineActions = folder === "inbox" ? (item.actions || []).filter((action) => action.inline && action.key !== "open_record") : [];
  const openAction = (item.actions || []).find((action) => action.key === "open_record");
  const primaryInlineAction = inlineActions.find((action) => action.primary) || inlineActions[0];
  const hasInlineAction = inlineActions.length > 0;
  const notePlaceholder = primaryInlineAction?.remarks_placeholder || "Add a note before taking action...";
  const noteLabel = primaryInlineAction?.key === "respond" ? "Reply" : "Action note";
  const messageLines = item.summary.split("\n");
  const actionBusy = (action: WorkItemAction) => actioningID === `${item.id}:${action.key}:${action.label}`;

  return (
    <article className="min-h-[360px] p-4 sm:p-6 xl:min-h-[620px]">
      <div className="flex flex-col gap-4 border-b border-[#edf1ef] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${toneClass[item.tone]}`}>{item.badge}</span>
            <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-black text-[#4b5563]">{item.kind === "event" ? "Event" : "Task"}</span>
          </div>
          <h2 className="text-2xl font-black text-[#111827]">{item.title}</h2>
          <p className="mt-2 text-sm font-semibold text-[#6b7280]">{item.meta}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="rounded-lg border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151] hover:bg-[#f8faf9]" onClick={() => openAction ? onAct(item, openAction, note) : onNavigate(item.routeSection)} type="button">{openAction?.label || item.actionLabel}</button>
        </div>
      </div>
      <div className="grid gap-4 py-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#edf1ef] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a978f]">Source</p>
          <p className="mt-2 text-sm font-black text-[#111827]">{item.sourceLabel}</p>
        </div>
        <div className="rounded-lg border border-[#edf1ef] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a978f]">Status</p>
          <p className="mt-2 text-sm font-black text-[#111827]">{item.badge}</p>
        </div>
        {(item.details || []).map((detail) => (
          <div className="rounded-lg border border-[#edf1ef] p-4" key={`${item.id}-${detail.label}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a978f]">{detail.label}</p>
            <p className="mt-2 text-sm font-black text-[#111827]">{detail.value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-lg border border-[#edf1ef] bg-[#f8faf9] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a978f]">Message</p>
        <div className="mt-3 space-y-3">
          {messageLines.map((line, index) => <p className="text-sm font-semibold leading-7 text-[#374151]" key={`${item.id}-line-${index}`}>{line || "\u00a0"}</p>)}
        </div>
      </section>
      {hasInlineAction ? (
        <section className="mt-5 rounded-lg border border-[#dfe6e2] bg-white p-4">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-[#8a978f]" htmlFor={`inbox-note-${item.id}`}>{noteLabel}</label>
          <textarea className="mt-2 min-h-[96px] w-full rounded-lg border border-[#dbe0e5] px-3 py-3 text-sm font-semibold text-[#374151] outline-none focus:border-[#588368]" id={`inbox-note-${item.id}`} onChange={(event) => setNote(event.target.value)} placeholder={notePlaceholder} value={note} />
          <div className="mt-4 flex flex-wrap gap-2">
            {inlineActions.map((action) => {
              const isDanger = action.tone === "danger";
              const className = isDanger
                ? "rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
                : action.primary || action.tone === "positive"
                  ? "rounded-lg bg-[#588368] px-4 py-2 text-sm font-black text-white hover:bg-[#456d58] disabled:opacity-60"
                  : "rounded-lg border border-[#dbe0e5] bg-white px-4 py-2 text-sm font-black text-[#374151] hover:bg-[#f8faf9] disabled:opacity-60";
              const actionRemarks = action.key === "respond" && action.label.toLowerCase().includes("quick") ? "Best wishes." : note;
              return <button className={className} disabled={Boolean(actioningID)} key={`${item.id}-${action.key}-${action.label}`} onClick={() => onAct(item, action, actionRemarks)} type="button">{actionBusy(action) ? "Working..." : action.label}</button>;
            })}
          </div>
        </section>
      ) : folder === "inbox" ? (
        <p className="mt-5 rounded-lg bg-[#f8faf9] px-4 py-3 text-sm font-semibold text-[#6b7280]">This item needs its owning module for action. Open the full record when you need the complete workflow.</p>
      ) : null}
    </article>
  );
}
