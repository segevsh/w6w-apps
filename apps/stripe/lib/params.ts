import type { Param } from "@w6w/types";

/** Stripe's `metadata` bag — the same field on nearly every object. */
export const metadataParam: Param = {
  key: "metadata",
  label: "Metadata",
  type: "json",
  advanced: true,
  hint: 'Up to 50 key -> value string pairs stored on the object, e.g. { "orderId": "A-17" }.',
};

/** The cursor pagination every Stripe list endpoint uses. */
export const listParams: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 10,
    validation: { min: 1, max: 100, integer: true },
    hint: "1-100. Stripe defaults to 10.",
  },
  {
    key: "startingAfter",
    label: "Starting after",
    type: "string",
    row: "cursor",
    advanced: true,
    hint: "Object id to page forward from.",
  },
  {
    key: "endingBefore",
    label: "Ending before",
    type: "string",
    row: "cursor",
    advanced: true,
    hint: "Object id to page backward from.",
  },
];

/** The envelope every Stripe list endpoint returns. */
export const listOutput = [
  { key: "object", type: "string" as const, label: "Always `list`" },
  { key: "data", type: "array" as const, label: "Results" },
  { key: "has_more", type: "boolean" as const, label: "More pages available" },
];

/** Currency codes Stripe supports most widely. Free text is allowed too. */
export const currency: Param = {
  key: "currency",
  label: "Currency",
  type: "string",
  required: true,
  default: "usd",
  row: "amount",
  hint: "Three-letter ISO code, lowercase (`usd`, `eur`, `gbp`).",
  validation: { pattern: "^[a-zA-Z]{3}$" },
};

/**
 * Stripe amounts are in the currency's smallest unit — 1000 is $10.00, not
 * $1000. Getting this wrong is the single most expensive mistake in the API,
 * so the hint says it on every amount field.
 */
export function amount(label: string, required = true): Param {
  return {
    key: "amount",
    label,
    type: "number",
    required,
    row: "amount",
    validation: { min: 0, integer: true },
    hint:
      "In the smallest currency unit — 1000 = $10.00. Zero-decimal currencies (JPY) use whole units.",
  };
}
