import type { Param } from "@w6w/types";

/** `page` / `pageSize` / `includeTotal` — every ServiceTitan list endpoint takes these three. */
export const pagingParams: Param[] = [
  { key: "page", label: "Page", type: "number", default: 1, hint: "1-based." },
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    default: 50,
    hint: "Records per page. ServiceTitan's own default is 50.",
    validation: { min: 1, integer: true },
  },
  {
    key: "includeTotal",
    label: "Include total count",
    type: "boolean",
    default: false,
    hint: "Adds `totalCount` to the response; it costs ServiceTitan an extra count query.",
  },
];

export const activeParam: Param = {
  key: "active",
  label: "Active",
  type: "select",
  options: [
    { label: "Active only (vendor default)", value: "True" },
    { label: "Inactive only", value: "False" },
    { label: "Any", value: "Any" },
  ],
  hint: "ServiceTitan returns only active records unless told otherwise.",
};

export const idsParam: Param = {
  key: "ids",
  label: "IDs",
  type: "string",
  hint: "Comma-separated record ids (maximum 50).",
};

export const modifiedParam: Param = {
  key: "modifiedOnOrAfter",
  label: "Modified on or after",
  type: "string",
  placeholder: "2026-01-01T00:00:00Z",
  hint: "ISO 8601 date/time, in UTC.",
};

export const createdParam: Param = {
  key: "createdOnOrAfter",
  label: "Created on or after",
  type: "string",
  placeholder: "2026-01-01T00:00:00Z",
  hint: "ISO 8601 date/time, in UTC.",
};

/** The paging fields as ServiceTitan spells them. */
export function pagingQuery(
  input: { page?: number; pageSize?: number; includeTotal?: boolean },
): Record<string, unknown> {
  return {
    page: input.page,
    pageSize: input.pageSize,
    includeTotal: input.includeTotal ? "true" : undefined,
  };
}

/** Output shared by every list endpoint: `{page, pageSize, hasMore, totalCount, data}`. */
export const listOutput = [
  { key: "data", type: "array" as const, label: "Records" },
  { key: "page", type: "number" as const, label: "Page" },
  { key: "pageSize", type: "number" as const, label: "Page size" },
  { key: "hasMore", type: "boolean" as const, label: "Has more pages" },
  { key: "totalCount", type: "number" as const, label: "Total count (when requested)" },
];
