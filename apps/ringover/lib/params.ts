import type { OutputField, Param } from "@w6w/types";

export const limitParam = (max: number, label = "Limit"): Param => ({
  key: "limitCount",
  label,
  type: "number",
  hint: `Maximum items to return (Ringover's default is 100, maximum ${max}).`,
  validation: { min: 1, max, integer: true },
});

export const offsetParam: Param = {
  key: "limitOffset",
  label: "Offset",
  type: "number",
  hint: "Number of items to skip.",
  validation: { min: 0, integer: true },
};

export const startDateParam: Param = {
  key: "startDate",
  label: "Start date",
  type: "string",
  hint: "ISO 8601, inclusive. Must be sent together with End date.",
};

export const endDateParam: Param = {
  key: "endDate",
  label: "End date",
  type: "string",
  hint: "ISO 8601, inclusive. Must be sent together with Start date.",
};

export const lastIdParam: Param = {
  key: "lastIdReturned",
  label: "Last ID returned",
  type: "number",
  hint: "Cursor pagination: only items older than this ID. Use the previous page's `lastId`.",
};

export const expandParam: Param = {
  key: "expand",
  label: "Embed",
  type: "multiselect",
  options: [
    { value: "summary", label: "AI summary" },
    { value: "transcription", label: "Transcription" },
  ],
  hint: "Embed the AI summary and/or the transcription on each call.",
};

export const CALL_TYPES = [
  { value: "ANSWERED", label: "Answered" },
  { value: "MISSED", label: "Missed" },
  { value: "OUT", label: "Outbound" },
  { value: "VOICEMAIL", label: "Voicemail" },
];

export const numberTypes = [
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
  { value: "mobile", label: "Mobile" },
  { value: "fax", label: "Fax" },
  { value: "other", label: "Other" },
];

export const contactIdParam: Param = {
  key: "contactId",
  label: "Contact ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const phoneParam = (key: string, label: string, hint?: string): Param => ({
  key,
  label,
  type: "string",
  required: true,
  hint: hint ?? "International format, e.g. 33612345678 or +33612345678.",
});

export const COUNT_OUTPUT: OutputField[] = [
  { key: "count", type: "number", label: "Items in this response" },
  { key: "total", type: "number", label: "Total matching items" },
];

export const CALLS_OUTPUT: OutputField[] = [
  { key: "calls", type: "array", label: "Call log entries (newest first)" },
  { key: "count", type: "number", label: "Entries in this page" },
  { key: "total", type: "number", label: "Total calls matching" },
  { key: "totalMissed", type: "number", label: "Total missed calls matching" },
  { key: "lastId", type: "number", label: "Oldest cdr_id in this page (cursor for the next)" },
];

export const CONTACT_OUTPUT: OutputField[] = [
  { key: "contact_id", type: "number", label: "Contact ID" },
  { key: "firstname", type: "string", label: "First name" },
  { key: "lastname", type: "string", label: "Last name" },
  { key: "company", type: "string", label: "Company" },
  { key: "is_shared", type: "boolean", label: "Shared with the team" },
  { key: "numbers", type: "array", label: "Phone numbers" },
];

export const USER_OUTPUT: OutputField[] = [
  { key: "user_id", type: "number", label: "User ID" },
  { key: "firstname", type: "string", label: "First name" },
  { key: "lastname", type: "string", label: "Last name" },
  { key: "email", type: "string", label: "Email" },
  { key: "numbers", type: "array", label: "Phone numbers" },
  { key: "plan", type: "object", label: "Licence plan" },
];

export const NUMBER_OUTPUT: OutputField[] = [
  { key: "number", type: "number", label: "Number (E.164 without +)" },
  { key: "label", type: "string", label: "Label" },
  { key: "type", type: "string", label: "Type" },
  { key: "user_id", type: "number", label: "Assigned user" },
  { key: "ivr_id", type: "number", label: "Assigned IVR" },
  { key: "conference_id", type: "number", label: "Assigned conference" },
  { key: "is_sms", type: "boolean", label: "SMS capable" },
  { key: "is_callable", type: "boolean", label: "Callable" },
];

export const OK_OUTPUT: OutputField[] = [
  { key: "ok", type: "boolean", label: "Ringover accepted the request" },
];

/** The 18-colour palette `POST /tags` accepts. */
export const TAG_COLORS = [
  "ff6b6b",
  "F06292",
  "BA68C8",
  "9575CD",
  "7986CB",
  "64B5F6",
  "4FC3F7",
  "4DD0E1",
  "4DB6AC",
  "81C784",
  "AED581",
  "DCE775",
  "FFD54F",
  "FFB74D",
  "FF8A65",
  "A1887F",
  "E0E0E0",
  "90A4AE",
].map((value) => ({ value, label: `#${value}` }));
