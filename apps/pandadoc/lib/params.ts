/**
 * Params and output blocks shared across PandaDoc's list endpoints.
 *
 * PandaDoc pages with `count` (1–100, default 50) and `page` (1-based) — the
 * same two on List Documents, List Templates and List Documents Folders. It is
 * *offsetless*: there is no cursor and no total count in the response, so a
 * caller walks pages until a short page comes back.
 */
import type { OutputField, Param } from "@w6w/types";

export interface PagingInput {
  count?: number;
  page?: number;
}

export const paging: Param[] = [
  {
    key: "count",
    label: "Count",
    type: "number",
    hint: "Results per page, 1–100. PandaDoc's default is 50.",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "1-based page number. There is no cursor — walk pages until one comes back short.",
    validation: { min: 1, integer: true },
  },
];

/**
 * The output block for the endpoints that answer `{ "results": [...] }`.
 * (Webhook subscriptions answer `{ "items": [...] }` and declare their own.)
 */
export const resultsOutput: OutputField[] = [
  { key: "results", type: "array", label: "Results" },
];

/**
 * A document id param. PandaDoc calls the same value `id` on most routes and
 * `document_id` on the reminder route; it is one opaque string either way.
 */
export const documentIdParam: Param = {
  key: "documentId",
  label: "Document ID",
  type: "string",
  required: true,
  hint:
    "PandaDoc document id, e.g. `BhVzRcxH9Z2LgfPPGXFUBa`. Returned by Create Document and List Documents.",
};
