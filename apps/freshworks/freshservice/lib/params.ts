import type { Param } from "@w6w/types";

/**
 * Freshservice's page-number pagination — the form every v2 list endpoint
 * takes. `per_page` defaults to 30 and is capped at 100; values above that
 * are an error rather than a clamp, so the validation is a real guard.
 */
export const pagination: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 1,
    row: "page",
    validation: { min: 1, integer: true },
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    default: 30,
    row: "page",
    advanced: true,
    validation: { min: 1, max: 100, integer: true },
    hint: "Freshservice caps this at 100 and rejects anything higher.",
  },
];

/**
 * Every ITSM object is scoped to a workspace (a "client", in the MSP
 * edition). Omitting it means the primary workspace; `0` means "all
 * workspaces, global fields only" on the endpoints that support it.
 */
export const workspaceId: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "number",
  advanced: true,
  hint: "Omit for the primary workspace. Called the Client ID in Freshservice for MSPs.",
};

export const ticketOutput = [
  { key: "id", type: "number" as const, label: "Ticket ID" },
  { key: "subject", type: "string" as const, label: "Subject" },
  { key: "status", type: "number" as const, label: "Status" },
  { key: "priority", type: "number" as const, label: "Priority" },
];

/** Ticket status — Freshservice models these as small integers, not strings. */
export const statusOptions = [
  { value: 2, label: "Open" },
  { value: 3, label: "Pending" },
  { value: 4, label: "Resolved" },
  { value: 5, label: "Closed" },
];

/** Shared by tickets, problems, changes and releases. */
export const priorityOptions = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
  { value: 4, label: "Urgent" },
];

/** Ticket impact and urgency use the same 1–3 scale. */
export const impactOptions = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
];

/**
 * Ticket source. Freshservice's list is longer than Freshdesk's and the
 * numbers do NOT line up between the two products — 3 is Phone here and
 * Phone there, but 7 is AWS CloudWatch here and Chat there. Taken verbatim
 * from the v2 "Ticket Properties" table.
 */
export const sourceOptions = [
  { value: 1, label: "Email" },
  { value: 2, label: "Portal" },
  { value: 3, label: "Phone" },
  { value: 4, label: "Chat" },
  { value: 5, label: "Feedback widget" },
  { value: 6, label: "Yammer" },
  { value: 7, label: "AWS CloudWatch" },
  { value: 8, label: "PagerDuty" },
  { value: 9, label: "Walkup" },
  { value: 10, label: "Slack" },
  { value: 11, label: "Chatbot" },
  { value: 12, label: "Workplace" },
  { value: 13, label: "Employee onboarding" },
  { value: 14, label: "Alerts" },
  { value: 15, label: "MS Teams" },
  { value: 18, label: "Employee offboarding" },
];

/** Problem status — a three-value scale of its own, not the ticket one. */
export const problemStatusOptions = [
  { value: 1, label: "Open" },
  { value: 2, label: "Change requested" },
  { value: 3, label: "Closed" },
];

/** Change status. */
export const changeStatusOptions = [
  { value: 1, label: "Open" },
  { value: 2, label: "Planning" },
  { value: 3, label: "Approval" },
  { value: 4, label: "Pending release" },
  { value: 5, label: "Pending review" },
  { value: 6, label: "Closed" },
];

export const changeTypeOptions = [
  { value: 1, label: "Minor" },
  { value: 2, label: "Standard" },
  { value: 3, label: "Major" },
  { value: 4, label: "Emergency" },
];

export const changeRiskOptions = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
  { value: 4, label: "Very high" },
];

/** Asset impact and usage type are strings here, unlike the ticket scales. */
export const assetImpactOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const assetUsageTypeOptions = [
  { value: "permanent", label: "Permanent" },
  { value: "loaner", label: "Loaner" },
];

/** Sort direction, shared by the list endpoints that accept `order_type`. */
export const orderTypeParam: Param = {
  key: "orderType",
  label: "Order",
  type: "select",
  default: "desc",
  row: "sort",
  options: [
    { value: "desc", label: "Descending" },
    { value: "asc", label: "Ascending" },
  ],
};
