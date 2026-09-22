import type { OutputField, Param } from "@w6w/types";

/**
 * Param builders shared by the 16 actions, plus the two output shapes.
 *
 * Everything here is transcribed from GoCardless's OpenAPI 3.1 document and its
 * API reference (fetched 2026-09-22); the reasoning for each choice is in the
 * doc comment beside it.
 *
 * Two decisions worth naming once, because they are repeated everywhere:
 *
 *  - **Every list endpoint takes the same three pagination parameters** —
 *    `before`, `after` (opaque cursors) and `limit` — and answers the same
 *    envelope (`{"<resource>": [...], "meta": {"cursors": {"before", "after"},
 *    "limit"}}`). {@link paginationParams} and {@link listOutput} declare that
 *    pair once, so the seven `list-*` actions cannot drift apart, and
 *    {@link lib/client.ts} lifts the cursors out of `meta` for all of them.
 *  - **Date filters are four separate params, not one `json` blob.** GoCardless
 *    filters a date field with a bracketed query key — `created_at[gt]`,
 *    `created_at[lte]` — which a caller could supply as a JSON object, but four
 *    named date params render as four date pickers instead of asking a workflow
 *    author to type an object and get the key names right.
 */

/**
 * GoCardless's full supported-currency enum, read from the OpenAPI schema.
 *
 * Every `amount` in this API is an integer in the *lowest denomination* of its
 * currency — pence for GBP, cents for EUR — and GoCardless refuses any currency
 * outside this list, so the list is enforced here rather than discovered from a
 * 422.
 */
export const CURRENCIES = ["AUD", "CAD", "DKK", "EUR", "GBP", "NZD", "SEK", "USD"] as const;

const CURRENCY_OPTIONS = CURRENCIES.map((value) => ({ value, label: value }));

/** The currency of a payment, subscription or refund. */
export function currencyParam(required = false): Param {
  return {
    key: "currency",
    label: "Currency",
    type: "select",
    required,
    options: CURRENCY_OPTIONS,
    ...(required ? {} : { advanced: true }),
    hint: "ISO 4217 code. Australia, Canada, Denmark, the euro area, the UK, New Zealand, " +
      "Sweden and the USA are the only currencies GoCardless collects.",
  };
}

/**
 * An amount in the currency's lowest denomination.
 *
 * The hint says "pence" rather than "£10.00" on purpose: every amount in this
 * API is an integer, and a workflow that sends `10.5` gets a validation error
 * about a field it thought it had already formatted.
 */
export function amountParam(label = "Amount", hint?: string): Param {
  return {
    key: "amount",
    label,
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    hint: hint ??
      "An integer in the lowest denomination of the currency — pence for GBP, cents for EUR. " +
        "£10.00 is 1000.",
  };
}

/** Free-form metadata GoCardless stores and returns on every read. */
export function metadataParam(): Param {
  return {
    key: "metadata",
    label: "Metadata",
    type: "json",
    advanced: true,
    hint: "Your own key/value pairs, returned verbatim on every read of this resource. " +
      'A JSON object, e.g. {"order_id": "A-1042"}.',
  };
}

/**
 * An optional idempotency key for a creating action.
 *
 * GoCardless's own guidance: "Always use idempotency keys when creating payments
 * or mandates. A network timeout that causes you to retry without one can result
 * in the same payment being taken twice." When this is left blank the app sends
 * the workflow step's own id instead (see `resolveIdempotencyKey`), so the
 * protection is on by default and the field exists only for a caller that needs
 * to key on something of its own.
 */
export function idempotencyKeyParam(): Param {
  return {
    key: "idempotencyKey",
    label: "Idempotency key",
    type: "string",
    advanced: true,
    hint: "Leave blank to use this workflow step's own invocation id — a retry of the same " +
      "step then returns the resource it already created instead of creating a second one. " +
      "Set it only when you need to key the request on something of your own.",
  };
}

/**
 * Cursor pagination, which every GoCardless list endpoint shares.
 *
 * `limit` carries no upper bound: GoCardless applies its own default page size
 * when it is omitted and validates an out-of-range value itself, and inventing a
 * ceiling here would only reject a request GoCardless would have served.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Results per page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Records per page. GoCardless applies its own default page size when this is " +
        "omitted; the value is passed through unclamped.",
      advanced: true,
    },
    {
      key: "after",
      label: "After cursor",
      type: "string",
      hint: "Walk towards OLDER records: pass the `afterCursor` output of the previous step " +
        "here. A response with an empty `afterCursor` is the end of the collection.",
      advanced: true,
    },
    {
      key: "before",
      label: "Before cursor",
      type: "string",
      hint: "Walk towards NEWER records: pass the `beforeCursor` output of the previous step " +
        "here.",
      advanced: true,
    },
  ];
}

/** Every `list-*` action reports exactly these four output columns. */
export const listOutput: OutputField[] = [
  { key: "items", type: "array", label: "Records in this page" },
  { key: "afterCursor", type: "string", label: "Cursor for the next (older) page" },
  { key: "beforeCursor", type: "string", label: "Cursor for the newer page" },
  { key: "limit", type: "number", label: "Page size GoCardless applied" },
];

/**
 * The four `[gt]`/`[gte]`/`[lt]`/`[lte]` date filters for one field.
 *
 * GoCardless filters dates with bracketed query keys, so a filter on
 * `created_at` is sent as `created_at[gte]=2026-01-01T00:00:00Z`. The param keys
 * are camelCase (`createdAtGte`) and {@link dateFilterQuery} does the mapping, so
 * the wire spelling lives in exactly one place.
 */
export function dateFilterParams(
  { prefix, label, field }: { prefix: string; label: string; field: string },
): Param[] {
  const hint = (op: string) =>
    `${label} ${op}, in RFC 3339 (e.g. 2026-01-01T00:00:00Z). Sent as the API's own ` +
    `\`${field}[${op}]\` query parameter.`;
  return [
    {
      key: `${prefix}Gt`,
      label: `${label} after`,
      type: "date",
      hint: hint("gt") + " Exclusive.",
      advanced: true,
    },
    {
      key: `${prefix}Gte`,
      label: `${label} on or after`,
      type: "date",
      hint: hint("gte") + " Inclusive.",
      advanced: true,
    },
    {
      key: `${prefix}Lt`,
      label: `${label} before`,
      type: "date",
      hint: hint("lt") + " Exclusive.",
      advanced: true,
    },
    {
      key: `${prefix}Lte`,
      label: `${label} on or before`,
      type: "date",
      hint: hint("lte") + " Inclusive.",
      advanced: true,
    },
  ];
}

/**
 * Turn the four date params back into GoCardless's bracketed query keys.
 *
 * `undefined` for a value the caller left blank, which the client's query
 * builder drops — sending `created_at[gt]=` would filter on the empty string.
 */
export function dateFilterQuery(
  field: string,
  values: { gt?: string; gte?: string; lt?: string; lte?: string },
): Record<string, string | undefined> {
  return {
    [`${field}[gt]`]: blankToUndefined(values.gt),
    [`${field}[gte]`]: blankToUndefined(values.gte),
    [`${field}[lt]`]: blankToUndefined(values.lt),
    [`${field}[lte]`]: blankToUndefined(values.lte),
  };
}

/** `sort_field` + `sort_direction`, which only some GoCardless lists document. */
export function sortParams(fields: string): Param[] {
  return [
    {
      key: "sortField",
      label: "Sort by",
      type: "string",
      advanced: true,
      hint: `GoCardless's own \`sort_field\` value, passed through verbatim — this endpoint ` +
        `documents ${fields}. An unknown value comes back as the vendor's own validation error.`,
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
      hint: "GoCardless's `sort_direction` — one of `asc`, `desc`.",
    },
  ];
}

/**
 * A filter whose accepted values are an enum this reference does not pin down.
 *
 * Declared as free text rather than a `select` on purpose: a narrowed list would
 * reject a legitimate status the moment GoCardless adds one, and GoCardless
 * answers an unknown value with its own `validation_failed` naming the field.
 */
export function enumishParam(key: string, label: string, values: string): Param {
  return {
    key,
    label,
    type: "string",
    advanced: true,
    hint: `${values} An unrecognised value is rejected by GoCardless itself, with a ` +
      `\`validation_failed\` naming the field.`,
  };
}

/** A resource-id filter (`customer`, `mandate`, `creditor`, `subscription`, …). */
export function idFilterParam(key: string, label: string, hint: string): Param {
  return { key, label, type: "string", advanced: true, hint };
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}
