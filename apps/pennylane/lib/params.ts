import type { Param } from "@w6w/types";
import type { QueryValue } from "./client.ts";

/**
 * Shared query plumbing for Pennylane's list endpoints.
 *
 * Every listing endpoint in API v2 takes the same four query parameters —
 * `cursor`, `limit`, `filter`, `sort` (`docs/using-cursor-based-pagination.md`
 * and `docs/setting-up-filters.md`) — so they are declared once here rather
 * than twenty times in the actions. `customer_invoices` adds `include`, which
 * its own action appends through {@link listQuery}'s second argument.
 */

/** The listing inputs every list action accepts. */
export interface ListInput {
  cursor?: string;
  limit?: number;
  /** A JSON array of `{ field, operator, value }`, or an already-encoded string. */
  filter?: unknown;
  sort?: string;
}

/**
 * Render a `filter` value for the query string.
 *
 * Pennylane wants the raw JSON array as the query value — its own example is
 * `filter=[{"field":"date","operator":"gteq","value":"2024-01-01"}]`. A host
 * that hands this action a `type: "json"` param gives us the parsed structure,
 * which is stringified here; a value that already arrived as a string is passed
 * through untouched, so a caller pasting the docs' example is not double-encoded.
 */
export function encodeFilter(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * Build the query object for a list action, dropping nothing here — the client
 * drops empty values, so an omitted cursor or sort never reaches the wire.
 */
export function listQuery(
  input: ListInput,
  extra: Record<string, QueryValue> = {},
): Record<string, QueryValue> {
  return {
    cursor: input.cursor,
    limit: input.limit,
    filter: encodeFilter(input.filter),
    sort: input.sort,
    ...extra,
  };
}

/**
 * The four list params, with the vendor's own maximum stated per endpoint.
 *
 * `limit` deliberately carries **no** `validation` block: the vendor's ceiling
 * differs per endpoint (100 almost everywhere, 1000 on `ledger_accounts`) and is
 * stated in the hint, but enforcing it here would turn a vendor 400 that names
 * the parameter into a form error that does not. Defaults are left to the
 * vendor too — omitting `limit` means the same 20 the documentation specifies.
 */
export function listParams(maxLimit: number): Param[] {
  return [
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      advanced: true,
      hint:
        "Opaque cursor from the previous page's `next_cursor`. Leave empty for the first page. " +
        "Filters and sort must be re-sent alongside it — the cursor stores only a position.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      advanced: true,
      hint: `Items per page. Defaults to 20; this endpoint's maximum is ${maxLimit}.`,
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      advanced: true,
      hint: 'Array of `{ "field", "operator", "value" }`, e.g. ' +
        '`[{ "field": "id", "operator": "gteq", "value": 100 }]`. Operators: eq, not_eq, lt, ' +
        "lteq, gt, gteq, in, not_in, start_with.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      advanced: true,
      hint: "Field to sort on, prefixed with `-` for descending. Pennylane defaults to `-id`.",
    },
  ];
}

/**
 * A postal address, as the vendor models it.
 *
 * Pennylane spells the same four fields on both `billing_address` and
 * `delivery_address` (and on a supplier's single `postal_address`), all four
 * required whenever the object is sent at all. Modelled as a `group` rather
 * than a JSON blob so the four subfields are validated as fields: the value
 * nests under the param's own key, which is exactly the shape the request body
 * wants.
 */
export function addressParam(key: string, label: string, required = false): Param {
  return {
    key,
    label,
    type: "group",
    required,
    children: [
      { key: "address", label: "Street address", type: "string", required: true },
      {
        key: "postal_code",
        label: "Postal code",
        type: "string",
        required: true,
        placeholder: "75002",
      },
      { key: "city", label: "City", type: "string", required: true },
      {
        key: "country_alpha2",
        label: "Country (ISO 3166-1 alpha-2)",
        type: "string",
        required: true,
        placeholder: "FR",
        hint: "Two uppercase letters, e.g. FR, BE, GB.",
      },
    ],
  };
}

/**
 * A ledger account reference — `{ "number": "411100344" }` throughout the API.
 */
export function ledgerAccountParam(label = "Ledger account"): Param {
  return {
    key: "ledger_account",
    label,
    type: "group",
    advanced: true,
    hint: "The accounting number the third party is posted to.",
    children: [
      {
        key: "number",
        label: "Account number",
        type: "string",
        required: true,
        placeholder: "411100344",
      },
    ],
  };
}

/**
 * An `emails` array. `repeat: true` collects a list of plain strings, which is
 * exactly the vendor's schema (`items: { type: "string" }`).
 */
export function emailsParam(label = "Emails"): Param {
  return {
    key: "emails",
    label,
    type: "string",
    repeat: true,
    hint: "One address per entry.",
  };
}

/**
 * Drop the empty fields a form leaves behind before sending a body.
 *
 * Pennylane's create bodies are `additionalProperties: false` on every schema,
 * so an empty string or an untouched nested object is a `400`, not a no-op. An
 * object that becomes empty once its own empty members are dropped is dropped
 * too — that is the `delivery_address` an operator never opened.
 */
export function compact(input: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length > 0) out[k] = v;
      continue;
    }
    if (typeof v === "object") {
      const nested = compact(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[k] = nested;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * A document id from a list or a create.
 *
 * Pennylane's ids are integers on the wire but identifiers to a workflow, so
 * they are collected as strings and passed through — `new URL()` and
 * `JSON.stringify` both leave them alone, and a host that stores an id as a
 * number in one step and a string in another does not break the next call.
 */
export function idParam(resource: string): Param {
  return {
    key: "id",
    label: `${resource} ID`,
    type: "string",
    required: true,
    hint: "The `id` from a list or create result.",
  };
}
