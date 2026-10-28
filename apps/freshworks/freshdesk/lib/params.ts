import type { Param } from "@w6w/types";

/** Freshdesk's page-number pagination, the form its list endpoints take. */
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
    hint: "Freshdesk caps this at 100.",
  },
];

export const ticketOutput = [
  { key: "id", type: "number" as const, label: "Ticket ID" },
  { key: "subject", type: "string" as const, label: "Subject" },
  { key: "status", type: "number" as const, label: "Status" },
  { key: "priority", type: "number" as const, label: "Priority" },
];

/** Freshdesk models these as small integers, not strings — see the API docs' ticket fields. */
export const statusOptions = [
  { value: 2, label: "Open" },
  { value: 3, label: "Pending" },
  { value: 4, label: "Resolved" },
  { value: 5, label: "Closed" },
];

export const priorityOptions = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
  { value: 4, label: "Urgent" },
];

export const sourceOptions = [
  { value: 1, label: "Email" },
  { value: 2, label: "Portal" },
  { value: 3, label: "Phone" },
  { value: 7, label: "Chat" },
  { value: 9, label: "Feedback widget" },
  { value: 10, label: "Outbound email" },
];
