import type { Param } from "@w6w/types";

export const PAGE: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "Page of results to return (starts at 1).",
  validation: { integer: true, min: 1 },
};

export const PER_PAGE: Param = {
  key: "per_page",
  label: "Per page",
  type: "number",
  hint: "Results per page.",
  validation: { integer: true, min: 1 },
};

export const PAGED = [PAGE, PER_PAGE];

/** Comma-separated `include` of related resources; scope-gated ones are silently omitted. */
export function includeParam(allowed: string, extra?: string): Param {
  return {
    key: "include",
    label: "Include",
    type: "string",
    placeholder: allowed.split(", ")[0],
    hint: `Comma-separated related resources to embed. Allowed: ${allowed}. ` +
      "An include that needs a scope the token lacks is silently omitted (still HTTP 200)." +
      (extra ? ` ${extra}` : ""),
  };
}

export const PAGED_OUTPUT = [
  { key: "data", type: "array" as const, label: "Results" },
  { key: "meta", type: "object" as const, label: "Pagination meta" },
  { key: "links", type: "object" as const, label: "Pagination links" },
];

export const ONE_OUTPUT = [{ key: "data", type: "object" as const, label: "The resource" }];

export const PROPERTY_IDS: Param = {
  key: "property_ids",
  label: "Property UUIDs",
  type: "text",
  required: true,
  hint: "One or more property UUIDs (from List Properties), comma or newline separated. " +
    "The vendor requires at least one.",
};
