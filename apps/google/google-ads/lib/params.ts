import type { Param } from "@w6w/types";

/**
 * Params shared across actions.
 *
 * `customerId` is on every action as an *optional override*, not a required
 * input: a Connection already records the account it was made for (see
 * `auth/oauth2.ts`), so the common case needs nothing. The override exists
 * because one OAuth grant can reach several accounts under the same manager —
 * `list-accessible-customers` enumerates them — and re-connecting per account
 * would be busywork.
 */
export const customerId: Param = {
  key: "customerId",
  label: "Customer ID",
  type: "string",
  hint:
    "Optional. Defaults to the account this connection was made for. Dashes are fine — `123-456-7890` and `1234567890` both work.",
  placeholder: "123-456-7890",
  validation: { pattern: "^[0-9-]*$" },
};

/** GAQL page token — every read in this app pages through `search`. */
export const pageToken: Param = {
  key: "pageToken",
  label: "Page token",
  type: "string",
  hint: "From the previous response's `nextPageToken`. Omit for the first page.",
};

/**
 * GAQL `LIMIT`. This is how a result set is bounded here — `pageSize` is
 * deprecated in `SearchGoogleAdsRequest` and the API rejects it with
 * `PAGE_SIZE_NOT_SUPPORTED`.
 */
export const limit: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  hint:
    "Rows to request (GAQL `LIMIT`). Google pages `search` at 10,000 rows regardless; use `pageToken` for more.",
  validation: { integer: true, min: 1, max: 10000 },
};

/** A raw GAQL predicate appended to the action's own filters. */
export const where: Param = {
  key: "where",
  label: "Extra WHERE clause",
  type: "text",
  hint:
    "Raw GAQL, ANDed onto this action's own filters — e.g. `campaign.name LIKE '%brand%'`. Field paths use snake_case.",
};

/** Extra GAQL fields to add to the action's default SELECT list. */
export const extraFields: Param = {
  key: "extraFields",
  label: "Extra fields",
  type: "string",
  hint:
    "Comma-separated GAQL field paths to add to the SELECT list — e.g. `metrics.clicks, segments.date`.",
};

export const orderBy: Param = {
  key: "orderBy",
  label: "Order by",
  type: "string",
  hint: "GAQL `ORDER BY` clause without the keyword — e.g. `metrics.impressions DESC`.",
};

/**
 * `validate_only` on every mutate. Google runs the whole operation server-side
 * and returns the errors it would have produced without applying anything,
 * which is the honest way for an action to behave under an editor/test trigger.
 */
export const validateOnly: Param = {
  key: "validateOnly",
  label: "Validate only",
  type: "boolean",
  hint: "Run Google's validation and return any errors without applying the change.",
};

/**
 * `partial_failure`. Every action here sends exactly one operation, so the flag
 * only decides whether a single failure comes back as an HTTP error (`false`,
 * the API default for these services) or inside `partialFailureError`.
 */
export const partialFailure: Param = {
  key: "partialFailure",
  label: "Partial failure",
  type: "boolean",
  hint:
    "Return per-operation errors in `partialFailureError` instead of failing the request. These actions send one operation, so this mostly changes where the error appears.",
};

/** Output shape shared by every GAQL-backed read. */
export const searchOutput = [
  { key: "results", type: "array" as const, label: "Rows" },
  { key: "nextPageToken", type: "string" as const, label: "Next page token" },
  { key: "fieldMask", type: "string" as const, label: "Field mask" },
  { key: "totalResultsCount", type: "string" as const, label: "Total results count" },
];

/** Output shape shared by every `:mutate`-backed write. */
export const mutateOutput = [
  { key: "results", type: "array" as const, label: "Mutate results" },
  { key: "partialFailureError", type: "object" as const, label: "Partial failure error" },
];
