import type { OutputField, Param } from "@w6w/types";

export const companyIdParam: Param = {
  key: "companyId",
  label: "Company ID",
  type: "string",
  required: true,
  hint: "The company's `_id` from List Companies.",
};

export const positionIdParam: Param = {
  key: "positionId",
  label: "Position ID",
  type: "string",
  required: true,
  hint: "The position's `_id` from List Positions.",
};

export const candidateIdParam: Param = {
  key: "candidateId",
  label: "Candidate ID",
  type: "string",
  required: true,
  hint: "The candidate's `_id` from List Candidates.",
};

/** company + position + candidate, the triple most candidate routes need. */
export const candidateParams: Param[] = [companyIdParam, positionIdParam, candidateIdParam];

export const pageSizeParam: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  hint: "Switches on paging; capped at 50 by Breezy. Omit to receive the full list in one call.",
  validation: { min: 1, max: 50, integer: true },
};

export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "1-based page number. Only used when Page size is set.",
  validation: { min: 1, integer: true },
};

export const skipParam: Param = {
  key: "skip",
  label: "Skip",
  type: "number",
  hint: "Records to skip; use the `nextSkip` from the previous page.",
  validation: { min: 0, max: 10000, integer: true },
};

export const POSITION_OUTPUT: OutputField[] = [
  { key: "_id", type: "string", label: "Position ID" },
  { key: "name", type: "string", label: "Title" },
  { key: "state", type: "string", label: "State" },
  { key: "friendly_id", type: "string", label: "Friendly ID (URL slug)" },
  { key: "type", type: "object", label: "Employment type" },
  { key: "location", type: "object", label: "Location" },
  { key: "department", type: "string", label: "Department" },
  { key: "category", type: "object", label: "Category" },
  { key: "description", type: "string", label: "Description (HTML)" },
];

export const CANDIDATE_OUTPUT: OutputField[] = [
  { key: "_id", type: "string", label: "Candidate ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "email_address", type: "string", label: "Email" },
  { key: "phone_number", type: "string", label: "Phone" },
  { key: "stage", type: "object", label: "Current stage" },
  { key: "source", type: "object", label: "Source" },
  { key: "origin", type: "string", label: "Origin (applied, sourced, referral)" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "creation_date", type: "string", label: "Created" },
];

export const WEBHOOK_EVENTS = [
  "candidateAdded",
  "candidateDeleted",
  "candidateStatusUpdated",
  "candidateResumeAdded",
  "candidateResumeUpdated",
  "companyPositionAdded",
  "companyPositionUpdated",
  "companyPositionDeleted",
  "companyPositionStateUpdated",
  "companyNotePosted",
  "companyNoteUpdated",
  "companyNoteDeleted",
] as const;

export const WEBHOOK_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Endpoint ID" },
  { key: "url", type: "string", label: "URL" },
  { key: "events", type: "array", label: "Subscribed events" },
  { key: "status", type: "string", label: "Status" },
  { key: "enabled", type: "boolean", label: "Enabled" },
];
