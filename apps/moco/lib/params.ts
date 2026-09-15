import type { Param } from "@w6w/types";

/** MOCO's page-number pagination (`page`, `per_page`, capped at 100) — every list endpoint. */
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
    default: 100,
    row: "page",
    advanced: true,
    validation: { min: 1, max: 100, integer: true },
    hint: "MOCO caps this at 100.",
  },
];

/** `updated_after` — MOCO's incremental-sync filter, supported by every list endpoint. */
export const updatedAfter: Param = {
  key: "updatedAfter",
  label: "Updated after",
  type: "datetime",
  advanced: true,
  hint: "ISO 8601 UTC timestamp. Returns only entities created or updated after this time.",
};

/** Turn a comma-separated string (or an already-parsed array) into a string list, or undefined. */
export function parseList(raw: string[] | string | undefined): string[] | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const items = Array.isArray(raw) ? raw : raw.split(",").map((s) => s.trim());
  const filtered = items.map((s) => s.trim()).filter(Boolean);
  return filtered.length ? filtered : undefined;
}

/**
 * Parse the "Custom properties" JSON param into MOCO's flat `{ name: value }` map. Accepts either
 * that map directly, or a JSON string of it. Unknown field names are silently ignored by MOCO
 * itself (`docs.mocoapp.com/api/docs/v1.yaml` "Custom Fields" section) — nothing to validate here.
 */
export function customProperties(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error('`customProperties` must be a JSON object, e.g. { "Sector": "Automotive" }.');
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  return entries.length ? (parsed as Record<string, unknown>) : undefined;
}
