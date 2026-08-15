import type { Param } from "@w6w/types";

/**
 * `X-TC-Mode: live | test`. The collection documents this header on a
 * handful of endpoints; the PHP SDK sends it on every request (see
 * `lib/client.ts`), so it is offered here on every action rather than only
 * the subset the collection happened to annotate.
 */
export const modeParam: Param = {
  key: "mode",
  label: "Mode",
  type: "select",
  advanced: true,
  options: [
    { value: "live", label: "Live" },
    { value: "test", label: "Test" },
  ],
  hint: "Optional. Leave unset to use your account's default (live).",
};

export function paginationParams(defaultPerPage: number): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: defaultPerPage,
      validation: { integer: true, min: 1 },
    },
  ];
}

export const productIdParam: Param = {
  key: "productId",
  label: "Product ID",
  type: "string",
  required: true,
};

export const bumpIdParam: Param = {
  key: "bumpId",
  label: "Bump ID",
  type: "string",
  required: true,
};

export const upsellIdParam: Param = {
  key: "upsellId",
  label: "Upsell ID",
  type: "string",
  required: true,
};

export const downsellIdParam: Param = {
  key: "downsellId",
  label: "Downsell ID",
  type: "string",
  required: true,
};

export const affiliateIdParam: Param = {
  key: "affiliateId",
  label: "Affiliate ID",
  type: "string",
  required: true,
  hint: "The affiliate's user ID, affiliate ID, or email address.",
};

export const orderIdParam: Param = {
  key: "orderId",
  label: "Order ID",
  type: "string",
  required: true,
  hint: "From a Search Transactions result or a customer's purchase history.",
};

export const subscriptionIdParam: Param = {
  key: "subscriptionId",
  label: "Subscription ID",
  type: "string",
  required: true,
  hint: "From a Search Transactions result or a customer's purchase history.",
};

/**
 * `transactionType`'s allowed values, copied from the PHP SDK's own
 * `Api::$api_config['transactionTypes']` — the collection's query string
 * shows a default of `any` but never enumerates the full set.
 */
export const transactionTypeOptions = [
  { value: "any", label: "Any (default)" },
  { value: "charge", label: "Charge" },
  { value: "rebill", label: "Rebill" },
  { value: "refund", label: "Refund" },
  { value: "cancel", label: "Cancel" },
];
