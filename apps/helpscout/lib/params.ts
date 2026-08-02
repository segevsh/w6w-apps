import type { Param } from "@w6w/types";

/** Help Scout's page-number pagination, the form its list endpoints take. */
export const pagination: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 1,
    row: "page",
    advanced: true,
    validation: { min: 1, integer: true },
  },
];

export const conversationStatusOptions = [
  { value: "active", label: "Active" },
  { value: "all", label: "All" },
  { value: "closed", label: "Closed" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "spam", label: "Spam" },
];

/** `Create`/`Update Conversation` accept only this narrower set. */
export const conversationCreateStatusOptions = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "pending", label: "Pending" },
];

export const conversationTypeOptions = [
  { value: "email", label: "Email" },
  { value: "chat", label: "Chat" },
  { value: "phone", label: "Phone" },
];

/** Status a reply/note thread may set on the conversation while it's added. */
export const threadStatusOptions = [
  { value: "active", label: "Active (reactivate)" },
  { value: "closed", label: "Closed" },
  { value: "inbox_predefined", label: "Inbox default" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "spam", label: "Spam" },
];

export const conversationOutput = [
  { key: "id", type: "number" as const, label: "Conversation ID" },
  { key: "number", type: "number" as const, label: "Conversation number" },
  { key: "subject", type: "string" as const, label: "Subject" },
  { key: "status", type: "string" as const, label: "Status" },
  { key: "mailboxId", type: "number" as const, label: "Inbox ID" },
];

export const customerOutput = [
  { key: "id", type: "number" as const, label: "Customer ID" },
  { key: "firstName", type: "string" as const, label: "First name" },
  { key: "lastName", type: "string" as const, label: "Last name" },
];
