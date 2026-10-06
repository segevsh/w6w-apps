import type { Param } from "@w6w/types";

/** Shared `Param` fragments, copied from Synthflow's OpenAPI document (2026-10-05). */

/** `limit` — every offset-paginated list documents a default of 20 (voices 50, KBs 25). */
export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  validation: { integer: true, min: 1 },
  hint:
    "Maximum items per page. Synthflow's default is 20 (50 for voices, 25 for knowledge bases).",
};

export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  validation: { integer: true, min: 0 },
  hint: "Index of the first item to return. Page by adding Limit to the previous Offset.",
};

/** Workspace id — required query parameter on `/calls`-adjacent catalog endpoints. */
export const workspaceParam: Param = {
  key: "workspace",
  label: "Workspace ID",
  type: "string",
  required: true,
  hint: "Synthflow workspace id (Admin > Workspace Settings in the dashboard).",
};

export function idParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "string", required: true, hint };
}
