import type { Option, OutputField, Param } from "@w6w/types";

/**
 * Param builders shared by the 21 actions.
 *
 * Everything here is transcribed from the live reference pages under
 * `https://developers.squarespace.com/commerce-apis/*` (fetched 2026-09-22).
 * Three decisions are worth naming once, because they repeat:
 *
 *  - **Every list endpoint uses a cursor, never an offset.** The vendor's own
 *    example bodies carry an opaque `nextPageCursor` (`"ewogICJhIiA6…"`), and its
 *    pages say the cursor "cannot be combined" with the date filters. There is
 *    no `limit` parameter anywhere in this API — the page size is the vendor's
 *    (50) — so this app declares no page-size param rather than inventing one.
 *  - **Date filters are ISO 8601 UTC strings, not `date` pickers.** `modifiedAfter`
 *    / `modifiedBefore` take a full timestamp ("ISO 8601 UTC date and time
 *    string"), and the pair must be supplied together. A date-only picker would
 *    silently send a value the vendor's parser has to guess about, so the param
 *    is a string whose hint states the format and the pairing rule.
 *  - **Comma-separated id routes take a string, not an array widget.** The
 *    vendor's `{variantIdCsvs}`/`{productIdCsvs}`/`{documentIds}` routes are
 *    one path segment holding comma-separated ids, so the form field is a plain
 *    comma-separated string and `csvIds()` in `lib/client.ts` validates it.
 */

/** Squarespace's own `select` vocabulary, as the vendor writes it. */
export function options(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: value }));
}

/** The one pagination field every list response carries. */
export const paginationOutput: OutputField = {
  key: "pagination",
  type: "object",
  label: "Pagination (`hasNextPage`, `nextPageCursor`, `nextPageUrl`)",
};

/**
 * The opaque `cursor` every list endpoint accepts.
 *
 * Read `pagination.nextPageCursor` off the previous call and feed it back here;
 * it is not a number and cannot be constructed by hand.
 */
export function cursorParam(hint?: string): Param {
  return {
    key: "cursor",
    label: "Cursor",
    type: "string",
    advanced: true,
    hint: hint ??
      "Opaque cursor from the previous page's `pagination.nextPageCursor`. Cannot be combined " +
        "with a modified-date filter on the endpoints that take one.",
  };
}

/**
 * A comma-separated list of resource ids, for one of the `{…Csvs}` /
 * `{…Ids}` path routes.
 *
 * `max` is the vendor's documented ceiling (`50` on three of these routes, and
 * none stated on profiles) — enforced here so the caller gets a readable error
 * instead of the vendor's `400`.
 */
export function csvIdsParam(
  key: string,
  label: string,
  hint: string,
  max?: number,
): Param {
  return {
    key,
    label,
    type: "string",
    required: true,
    hint: max !== undefined
      ? `${hint} Comma-separated, up to ${max} ids.`
      : `${hint} Comma-separated.`,
  };
}

/**
 * The `modifiedAfter`/`modifiedBefore` pair, which the vendor documents as
 * "required together" and mutually exclusive with `cursor`.
 */
export function modifiedParams(): Param[] {
  return [
    {
      key: "modifiedAfter",
      label: "Modified after",
      type: "string",
      advanced: true,
      placeholder: "2026-09-01T00:00:00Z",
      hint: "ISO 8601 UTC date-time. Must be supplied together with `modifiedBefore`, and " +
        "cannot be combined with `cursor`.",
    },
    {
      key: "modifiedBefore",
      label: "Modified before",
      type: "string",
      advanced: true,
      placeholder: "2026-09-30T23:59:59Z",
      hint: "ISO 8601 UTC date-time. Must be supplied together with `modifiedAfter`, and " +
        "cannot be combined with `cursor`.",
    },
  ];
}

export interface ModifiedWindow {
  modifiedAfter?: string;
  modifiedBefore?: string;
}

/**
 * Validate the documented pairing rule and hand back the two values.
 *
 * The vendor's rule is a request-shape rule, not a value rule: one half alone
 * is rejected, and the pair cannot ride along with a cursor. Catching it here
 * means a workflow author sees what is wrong instead of a `400 MISSING_ARGUMENT`
 * from the far end.
 */
export function modifiedWindow(input: ModifiedWindow, withCursor = false): ModifiedWindow {
  const after = input.modifiedAfter?.trim() || undefined;
  const before = input.modifiedBefore?.trim() || undefined;
  if ((after === undefined) !== (before === undefined)) {
    throw new Error(
      "modifiedAfter and modifiedBefore must be supplied together — Squarespace rejects one " +
        "half of the pair on its own",
    );
  }
  if (after !== undefined && withCursor) {
    throw new Error(
      "a modified-date window cannot be combined with `cursor` — drop one or the other",
    );
  }
  return { modifiedAfter: after, modifiedBefore: before };
}

/**
 * The `ProductV2` fields the vendor's own response schema marks, shared by
 * `create-product` and `update-product`.
 */
export const productOutput: OutputField[] = [
  { key: "id", type: "string", label: "Product id" },
  { key: "type", type: "string", label: "`PHYSICAL`, `SERVICE`, `GIFT_CARD` or `DIGITAL`" },
  { key: "storePageId", type: "string", label: "Store page the product is published on" },
  { key: "createdOn", type: "string", label: "Created on (ISO 8601 UTC)" },
  { key: "modifiedOn", type: "string", label: "Last modified on (ISO 8601 UTC)" },
  { key: "name", type: "string", label: "Product name" },
  { key: "description", type: "string", label: "Description" },
  { key: "isVisible", type: "boolean", label: "Visible on the store page" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "url", type: "string", label: "Storefront URL" },
  { key: "urlSlug", type: "string", label: "URL slug" },
  { key: "seoOptions", type: "object", label: "SEO options (`title`, `description`)" },
  { key: "pricing", type: "object", label: "Pricing (`basePrice`, `onSale`, `salePrice`)" },
  { key: "images", type: "array", label: "Images" },
  { key: "digitalGood", type: "object", label: "Digital good (DIGITAL products only)" },
];

/**
 * The `ProductVariantV2` fields common to all three variant shapes; the
 * type-specific members (`attributes`, `gtin`, `mpn`, `shippingMeasurements`,
 * `stock`, `digitalGood`) come back as well.
 */
export const variantOutput: OutputField[] = [
  { key: "id", type: "string", label: "Variant id" },
  { key: "sku", type: "string", label: "SKU" },
  { key: "image", type: "object", label: "Assigned image" },
];

/**
 * The `Order` fields this app names in its outputs, shared by `get-order`,
 * `create-order` and `list-orders`.
 *
 * Only field names the vendor's own pages state are listed — the response
 * example on the List orders page plus the fields its Create order page adds
 * (`channel`, `id`, `orderNumber`, `modifiedOn`, `paymentState`, `testmode`).
 * The action still returns whatever Squarespace sent, verbatim; this is the
 * declared shape, not a projection.
 */
export const orderOutput: OutputField[] = [
  { key: "id", type: "string", label: "Order id" },
  { key: "orderNumber", type: "string", label: "Order number" },
  { key: "createdOn", type: "string", label: "Created on (ISO 8601 UTC)" },
  { key: "modifiedOn", type: "string", label: "Last modified on (ISO 8601 UTC)" },
  { key: "channel", type: "string", label: "Where the order originated (`web` or `pos`)" },
  { key: "channelName", type: "string", label: "Third-party sales channel name" },
  { key: "externalOrderReference", type: "string", label: "External order reference" },
  { key: "customerEmail", type: "string", label: "Customer email" },
  { key: "customerId", type: "string", label: "Customer profile id" },
  { key: "fulfillmentStatus", type: "string", label: "`PENDING`, `FULFILLED` or `CANCELED`" },
  { key: "fulfilledOn", type: "string", label: "Fulfilled on (ISO 8601 UTC)" },
  { key: "paymentState", type: "string", label: "Payment state" },
  { key: "priceTaxInterpretation", type: "string", label: "`INCLUSIVE` or `EXCLUSIVE`" },
  { key: "testmode", type: "boolean", label: "Created in test mode" },
  { key: "grandTotal", type: "object", label: "Grand total (`currency`, `value`)" },
  { key: "subtotal", type: "object", label: "Subtotal (`currency`, `value`)" },
  { key: "shippingTotal", type: "object", label: "Shipping total (`currency`, `value`)" },
  { key: "discountTotal", type: "object", label: "Discount total (`currency`, `value`)" },
  { key: "taxTotal", type: "object", label: "Tax total (`currency`, `value`)" },
  { key: "lineItems", type: "array", label: "Purchased line items" },
  { key: "fulfillments", type: "array", label: "Shipping fulfillments" },
  { key: "discountLines", type: "array", label: "Discount lines" },
  { key: "shippingLines", type: "array", label: "Shipping lines" },
  { key: "billingAddress", type: "object", label: "Billing address" },
  { key: "shippingAddress", type: "object", label: "Shipping address" },
];
