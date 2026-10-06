import type { Param } from "@w6w/types";

/**
 * Shared pagination params. Verified in the reference's Pagination section:
 * `limit` (default 100), `after` (an id; records start beyond it), `dir`
 * (`asc` | `desc`, default `desc` = newest first).
 */
export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 25,
  validation: { integer: true, min: 1 },
  hint: "Maximum records to return. The vendor default is 100.",
};

export const afterParam: Param = {
  key: "after",
  label: "After ID",
  type: "number",
  hint: "Cursor: the last id of the previous page. With newest-first order returns ids below it; " +
    "with oldest-first returns ids above it.",
};

export const dirParam: Param = {
  key: "dir",
  label: "Order",
  type: "select",
  default: "desc",
  options: [
    { value: "desc", label: "Newest first (default)" },
    { value: "asc", label: "Oldest first" },
  ],
};

export const paginationParams: Param[] = [limitParam, afterParam, dirParam];

export interface Pagination {
  limit?: number;
  after?: number;
  dir?: string;
}

export function paginationQuery(i: Pagination): Record<string, string | number | undefined> {
  return {
    limit: i.limit,
    after: i.after,
    dir: i.dir === "asc" || i.dir === "desc" ? i.dir : undefined,
  };
}

/** Print job content types, verbatim from the reference. */
export const contentTypeOptions = [
  { value: "pdf_uri", label: "PDF at a URL" },
  { value: "pdf_base64", label: "PDF, base64-encoded" },
  { value: "raw_uri", label: "Raw printer data at a URL" },
  { value: "raw_base64", label: "Raw printer data, base64-encoded" },
];

/** Webhook message types. `*` must stand alone. */
export const webhookMessageOptions = [
  { value: "*", label: "Every message type (must be the only selection)" },
  { value: "computer state", label: "Computer state" },
  { value: "print job state", label: "Print job state" },
];
