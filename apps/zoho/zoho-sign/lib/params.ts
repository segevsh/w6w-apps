import type { Param } from "@w6w/types";

export const requestId: Param = {
  key: "requestId",
  label: "Request ID",
  type: "string",
  required: true,
  hint: "The Zoho Sign `request_id` — returned by Create Document / List Requests.",
};

export const templateId: Param = {
  key: "templateId",
  label: "Template ID",
  type: "string",
  required: true,
  hint: "The Zoho Sign `template_id` — returned by List Templates.",
};

export const actionsParam = (hint: string): Param => ({
  key: "actions",
  label: "Actions (recipients)",
  type: "json",
  required: true,
  hint,
});

export const notesParam: Param = {
  key: "notes",
  label: "Notes",
  type: "text",
  hint: "Message sent to all recipients in common.",
};

export const isSequentialParam: Param = {
  key: "isSequential",
  label: "Sequential Signing",
  type: "boolean",
  default: true,
  hint: "true = recipients sign in order; false = everyone at once.",
};

export const expirationDaysParam: Param = {
  key: "expirationDays",
  label: "Expiration (days)",
  type: "number",
  hint: "Number of days after which the request expires and can no longer be signed.",
};

export const emailRemindersParam: Param = {
  key: "emailReminders",
  label: "Email Reminders",
  type: "boolean",
  default: false,
};

export const reminderPeriodParam: Param = {
  key: "reminderPeriod",
  label: "Reminder Period (days)",
  type: "number",
  showIf: { "==": [{ var: "emailReminders" }, true] },
};

export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder ID",
  type: "string",
};

export const pageParams: Param[] = [
  { key: "rowCount", label: "Row Count", type: "number", default: 25, hint: "Rows per page." },
  { key: "startIndex", label: "Start Index", type: "number", default: 1 },
  { key: "sortColumn", label: "Sort Column", type: "string" },
  {
    key: "sortOrder",
    label: "Sort Order",
    type: "select",
    default: "DESC",
    options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
  },
];

/** What a bare status-transition (recall, remind, delete) answers with. */
export const statusOutput = [
  { key: "code", type: "number" as const, label: "Zoho Sign result code (0 = success)" },
  { key: "message", type: "string" as const, label: "Human-readable result message" },
  { key: "status", type: "string" as const, label: '"success" or "failure"' },
];
