/**
 * Params shared across Square's list, search and write endpoints.
 *
 * Every field here is documented in Square's own OpenAPI document; nothing is
 * inferred. Where two endpoints spell the same idea differently (`limit`
 * defaults to 100 on Payments and Refunds, 100 on Customers, 500 on
 * SearchOrders, 200-max on Invoices) the per-action param carries its own hint
 * rather than pretending one number fits all.
 */
import type { Param } from "@w6w/types";

/** Square's opaque forward-only pagination cursor. Never an offset. */
export const cursor: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint:
    "Opaque pagination cursor from the previous response's `cursor`. Leave empty for the first page; Square omits `cursor` on the last page.",
};

/** `DESC`/`ASC`, the only two values Square's `SortOrder` enum admits. */
export const sortOrder: Param = {
  key: "sortOrder",
  label: "Sort order",
  type: "select",
  options: [
    { value: "DESC", label: "Newest first (DESC)" },
    { value: "ASC", label: "Oldest first (ASC)" },
  ],
};

export function limit(hint: string): Param {
  return {
    key: "limit",
    label: "Limit",
    type: "number",
    hint,
    validation: { min: 1, integer: true },
  };
}

/** A location id. Optional on most reads, required on ListInvoices. */
export function locationId(required: boolean, hint: string): Param {
  return {
    key: "locationId",
    label: "Location ID",
    type: "string",
    required,
    placeholder: "L1A2B3C4D5E6F",
    hint,
  };
}

/**
 * Amounts are integer minor units plus an ISO 4217 code — Square's `Money`
 * type. Spelled out here because getting it wrong is a 100x billing error.
 */
export const amountMoney: Param = {
  key: "amount",
  label: "Amount",
  type: "number",
  required: true,
  hint:
    "In the currency's smallest denomination: 1000 = $10.00 for USD. Whole units for zero-decimal currencies like JPY.",
  validation: { min: 0, integer: true },
};

export const currency: Param = {
  key: "currency",
  label: "Currency",
  type: "string",
  required: true,
  default: "USD",
  placeholder: "USD",
  hint: "ISO 4217 code. Must match the location's currency.",
  validation: { pattern: "^[A-Za-z]{3}$" },
};

/**
 * The optional override for Square's `idempotency_key` body field. Defaults to
 * the host's invocation id — see `idempotencyKey()` in lib/client.ts for why
 * there is no random fallback.
 */
export function idempotencyKeyParam(maxLength: number): Param {
  return {
    key: "idempotencyKey",
    label: "Idempotency key",
    type: "string",
    hint:
      `Optional. Defaults to this call's invocation id, so a retry replays the original result instead of repeating the operation. Max ${maxLength} characters.`,
    validation: { maxLength },
  };
}

/** The `output` block every cursor-paginated action declares. */
export function listOutput(itemsKey: string, itemsLabel: string) {
  return [
    { key: itemsKey, type: "array" as const, label: itemsLabel },
    {
      key: "cursor",
      type: "string" as const,
      label: "Cursor for the next page (absent when last)",
    },
    { key: "errors", type: "array" as const, label: "Errors reported alongside a 2xx" },
  ];
}
