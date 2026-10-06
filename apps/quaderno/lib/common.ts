import type { Param } from "@w6w/types";

/** Quaderno's cursor pagination: `limit` (max 100, default 25) and `created_before`. */
export const pagination: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 25,
    advanced: true,
    validation: { min: 1, max: 100, integer: true },
    hint: "Quaderno caps this at 100.",
  },
  {
    key: "createdBefore",
    label: "Created before (ID)",
    type: "number",
    advanced: true,
    hint: "Cursor: return objects created before this ID. Use `nextCursor` from the previous page.",
  },
];

export const listOutput = [
  { key: "items", type: "array" as const, label: "Items" },
  { key: "hasMore", type: "boolean" as const, label: "More pages exist" },
  { key: "nextCursor", type: "number" as const, label: "Next cursor" },
];

export const paymentMethods = [
  "credit_card",
  "cash",
  "wire_transfer",
  "direct_debit",
  "check",
  "iou",
  "paypal",
  "offset",
  "other",
].map((v) => ({ value: v, label: v }));
