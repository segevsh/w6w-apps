import type { Param } from "@w6w/types";
import { USER_TYPES } from "./users.ts";

export const recordId: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The Bigin record id.",
};

export const userId: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  required: true,
  hint: "The Bigin user id, from List Users.",
};

export const dataFields: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint: 'Field API name -> value, e.g. { "Last_Name": "Smith", "Company": "Acme" }.',
};

/**
 * Bigin's list endpoint requires at least one field API name in `fields`
 * (max 50) — like Zoho CRM it has no "give me everything" default. Every list
 * action declares its own module-appropriate default so the field stays usable
 * without the caller having to look field names up first.
 */
export function listFields(defaultFields: string): Param {
  return {
    key: "fields",
    label: "Fields",
    type: "string",
    required: true,
    default: defaultFields,
    hint: "Comma-separated field API names (max 50). Bigin requires at least one on every list.",
  };
}

/**
 * The single-record GET works without a field list — the docs list `fields` on
 * the list endpoint only — so it is offered here as an optional narrowing of
 * the response, never as a required default that would be sent needlessly.
 */
export const optionalFields: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  advanced: true,
  hint: "Optional comma-separated field API names to narrow the response.",
};

export const pageParams: Param[] = [
  { key: "page", label: "Page", type: "number", default: 1 },
  { key: "per_page", label: "Per page", type: "number", default: 200, hint: "Max 200." },
];

export const sortParams: Param[] = [
  {
    key: "sort_by",
    label: "Sort by",
    type: "string",
    advanced: true,
    hint: "Field API name to sort by, e.g. Created_Time. Defaults to the system-defined field.",
  },
  {
    key: "sort_order",
    label: "Sort order",
    type: "select",
    advanced: true,
    default: "desc",
    options: [
      { value: "desc", label: "Descending" },
      { value: "asc", label: "Ascending" },
    ],
  },
];

/** `page_token` (past 2000 records) and `cvid` (a saved custom view). */
export const cursorParams: Param[] = [
  {
    key: "page_token",
    label: "Page token",
    type: "string",
    advanced: true,
    hint: "`info.next_page_token` from a previous call; use it to page past 2000 records.",
  },
  {
    key: "cvid",
    label: "Custom view ID",
    type: "string",
    advanced: true,
    hint: "Restrict the listing to a saved custom view (costs 3 credits per call).",
  },
];

export const userType: Param = {
  key: "type",
  label: "User type",
  type: "select",
  default: "AllUsers",
  options: USER_TYPES.map((value) => ({ value, label: value })),
  hint: "`CurrentUser` returns the profile of the user this connection is authorized as.",
};

/** What a successful create/update/delete answers with. */
export const writeOutput = [
  { key: "code", type: "string" as const, label: "Result code" },
  { key: "status", type: "string" as const, label: "success | error" },
  { key: "details", type: "object" as const, label: "Record id, timestamps and owner" },
  { key: "message", type: "string" as const, label: "Human-readable result message" },
];

/** What a list/search answers with. */
export const listOutput = [
  { key: "data", type: "array" as const, label: "Records" },
  { key: "info", type: "object" as const, label: "Pagination info" },
];

/** What the user endpoints answer with. */
export const usersOutput = [
  { key: "users", type: "array" as const, label: "Users" },
  { key: "info", type: "object" as const, label: "Pagination info" },
];
