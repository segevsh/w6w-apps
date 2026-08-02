import type { Param } from "@w6w/types";

export const recordId: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The Zoho CRM record id.",
};

export const dataFields: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint: 'Field API name -> value, e.g. { "Last_Name": "Smith", "Company": "Acme" }.',
};

/**
 * Zoho's Get Records / Get Record API requires at least one field API name in
 * `fields` — unlike most vendors it has no "give me everything" default. Every
 * list/get action declares its own module-appropriate default so the field
 * stays usable without the caller having to look up field names first.
 */
export function listFields(defaultFields: string): Param {
  return {
    key: "fields",
    label: "Fields",
    type: "string",
    required: true,
    default: defaultFields,
    hint: "Comma-separated field API names. Zoho requires at least one on every read.",
  };
}

export const pageParams: Param[] = [
  { key: "page", label: "Page", type: "number", default: 1 },
  { key: "per_page", label: "Per page", type: "number", default: 200, hint: "Max 200." },
];

/** What a successful create/update/delete/convert answers with. */
export const writeOutput = [
  { key: "code", type: "string" as const, label: "Result code" },
  { key: "status", type: "string" as const, label: "success | error" },
  { key: "details", type: "object" as const, label: "Record id, timestamps and owner" },
  { key: "message", type: "string" as const, label: "Human-readable result message" },
];
