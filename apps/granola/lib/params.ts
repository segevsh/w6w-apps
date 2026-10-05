import type { Param } from "@w6w/types";
import type { GranolaCustodianInput } from "./client.ts";

/**
 * Shared `Param` fragments and input coercion for the Granola actions. Every ID
 * pattern and bound is copied from `components.schemas` / the operation
 * parameters of Granola's OpenAPI 3.1 document, not inferred.
 */

export const webhookEventOptions = [
  { value: "note.generated", label: "Note generated" },
  { value: "note.edited", label: "Note edited" },
  { value: "note.access_granted", label: "Note access granted" },
];

export const webhookScopeOptions = [
  {
    value: "personal",
    label: "Personal",
    description:
      "Notes you own, notes shared with you, and notes in private folders shared with you",
  },
  { value: "public", label: "Public", description: "Notes visible to everyone in the workspace" },
  {
    value: "workspace",
    label: "Workspace",
    description: "Workspace API keys only — pass exactly this one",
  },
];

/** The cursor is opaque. Page on `hasMore` + `cursor`, never on the page length. */
export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "The `cursor` returned by the previous page. Leave empty for the first page.",
};

export function pageSizeParam(max: number, what: string, def = 10): Param {
  return {
    key: "pageSize",
    label: "Page size",
    type: "number",
    default: def,
    validation: { min: 1, max, integer: true },
    hint: `Maximum number of ${what} per page (1-${max}, Granola's own default is ${def}).`,
  };
}

export const noteIdParam: Param = {
  key: "noteId",
  label: "Note ID",
  type: "string",
  required: true,
  placeholder: "not_1d3tmYTlCICgjy",
  validation: { pattern: "^not_[a-zA-Z0-9]{14}$" },
};

export const holdIdParam: Param = {
  key: "holdId",
  label: "Legal hold ID",
  type: "string",
  required: true,
  placeholder: "lgh_...",
  validation: { pattern: "^lgh_[a-zA-Z0-9]{14}$" },
};

export const webhookIdParam: Param = {
  key: "webhookEndpointId",
  label: "Webhook endpoint ID",
  type: "string",
  required: true,
  placeholder: "whe_...",
  validation: { pattern: "^whe_[a-zA-Z0-9]{14}$" },
};

/** Accept a real array (JSON / multiselect) or a comma/newline separated string. */
export function toList(v: unknown): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  const raw = Array.isArray(v) ? v.map(String) : String(v).split(/[\s,]+/);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Build Granola's custodian input objects from email and user-id lists. */
export function toCustodians(emails: unknown, userIds: unknown): GranolaCustodianInput[] {
  return [
    ...(toList(emails) ?? []).map((email) => ({ email })),
    ...(toList(userIds) ?? []).map((id) => ({ id })),
  ];
}

export const custodianParams: Param[] = [
  {
    key: "emails",
    label: "Custodian emails",
    type: "text",
    hint: "Email addresses, comma or newline separated. At most 100 custodians in total.",
  },
  {
    key: "userIds",
    label: "Custodian user IDs",
    type: "text",
    hint: "Granola user IDs (usr_...), comma or newline separated.",
  },
];
