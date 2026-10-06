import type { Param } from "@w6w/types";
import type { QueryValue } from "./client.ts";

/** Which request parameter carries the start index on a given endpoint (see `lib/client.ts`). */
export type StartIndexName = "recordStartIndex" | "pageStartIndex";

export function pageSizeParam(max?: number): Param {
  return {
    key: "pageSize",
    label: "Page size",
    type: "number",
    hint: max
      ? `1-${max}. AccuLynx defaults to 10 when omitted.`
      : "Records per page. AccuLynx applies its own default when omitted.",
    validation: max ? { min: 1, max, integer: true } : { min: 1, integer: true },
  };
}

export const START_INDEX_PARAM: Param = {
  key: "startIndex",
  label: "Start index",
  type: "number",
  default: 0,
  advanced: true,
  hint: "Zero-based index of the first RECORD to return (not a page number). Add the previous " +
    "response's pageSize to move forward; compare against `count` to know when to stop.",
  validation: { min: 0, integer: true },
};

/** `pageSize` + `startIndex` for a list action. */
export function pagingParams(max?: number): Param[] {
  return [pageSizeParam(max), START_INDEX_PARAM];
}

export function includesParam(supported: string): Param {
  return {
    key: "includes",
    label: "Includes",
    type: "string",
    advanced: true,
    hint: `Comma-separated related resources to expand inline. Supported here: ${supported}.`,
  };
}

/** The envelope every paged AccuLynx list answers. */
export const PAGED_OUTPUT = [
  { key: "count", type: "number", label: "Total matching records" },
  { key: "pageSize", type: "number", label: "Page size" },
  { key: "pageStartIndex", type: "number", label: "Start index of this page" },
  { key: "items", type: "array", label: "Records" },
] as const;

/** Build the paging query using the endpoint's own spelling of the start-index parameter. */
export function pageQuery(
  input: { pageSize?: unknown; startIndex?: unknown },
  startName: StartIndexName,
): Record<string, QueryValue> {
  return {
    pageSize: input.pageSize as number | undefined,
    [startName]: input.startIndex as number | undefined,
  };
}

/** A required path-id param. */
export function idParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "string", required: true, ...(hint ? { hint } : {}) };
}
