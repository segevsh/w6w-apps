import type { Param } from "@w6w/types";

/** Zendesk's cursor pagination, the form its list endpoints take. */
export const pagination: Param[] = [
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    default: 100,
    row: "page",
    validation: { min: 1, max: 100, integer: true },
    hint: "Zendesk caps this at 100.",
  },
  {
    key: "cursor",
    label: "Cursor",
    type: "string",
    row: "page",
    advanced: true,
    hint: "`meta.after_cursor` from the previous page.",
  },
];

export const ticketOutput = [
  { key: "ticket.id", type: "number" as const, label: "Ticket ID" },
  { key: "ticket.subject", type: "string" as const, label: "Subject" },
  { key: "ticket.status", type: "string" as const, label: "Status" },
  { key: "ticket.priority", type: "string" as const, label: "Priority" },
  { key: "ticket.url", type: "string" as const, label: "API URL" },
];

export const statusOptions = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "hold", label: "On hold" },
  { value: "solved", label: "Solved" },
  { value: "closed", label: "Closed" },
];

export const priorityOptions = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];
