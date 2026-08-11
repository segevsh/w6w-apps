import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the BigCommerce actions.
 *
 * Every enum here is copied from BigCommerce's OpenAPI 3.1 documents (fetched
 * 2026-08-11 from `docs.bigcommerce.com/openapi/`), not inferred. Where the
 * vendor documents a different default or ceiling per endpoint, the value is
 * stated at the call site rather than averaged into one wrong number here.
 */

/**
 * The `page`/`limit` pair. BigCommerce paginates by page number everywhere in
 * this app's surface (two endpoints *additionally* offer cursors — see
 * `lib/client.ts`).
 *
 * **The limit default is the vendor's own, restated rather than raised.** v3
 * lists default to `limit=50` and v2 lists to 50 as well ("requests sent without
 * parameters will only return 50 orders"). The documented ceiling is 250 and is
 * enforced by a `413 Request Entity Too Large`, not by silent truncation, so the
 * validation below refuses 251 rather than letting the API do it.
 */
export function paginationParams(limitHint?: string): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 250 },
      hint: limitHint ??
        "Items per page. BigCommerce's own default is 50 and its maximum is 250; asking for more " +
          "returns a 413 rather than a truncated page.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-based. Defaults to 1.",
    },
  ];
}

/** `include_fields` / `exclude_fields`, supported by most v3 reads. */
export function fieldSelectionParams(): Param[] {
  return [
    {
      key: "includeFields",
      label: "Include fields",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Returns only these fields plus the id. Dropping big fields such as " +
        "`description` is the cheapest way to speed a large catalog read up.",
    },
    {
      key: "excludeFields",
      label: "Exclude fields",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Returns everything except these fields.",
    },
  ];
}

export interface FieldSelectionInput {
  includeFields?: string;
  excludeFields?: string;
}

/** Build the query pair for {@link fieldSelectionParams}. */
export function fieldSelectionQuery(
  input: FieldSelectionInput,
): Record<string, string | undefined> {
  return {
    include_fields: input.includeFields,
    exclude_fields: input.excludeFields,
  };
}

/**
 * `include` on `GET /v3/catalog/products` — the sub-resources returned inline.
 *
 * Copied from `IncludeParamBaseItems`. Worth knowing before reaching for it:
 * asking for `variants` on a catalogue of configurable products multiplies the
 * response size, which is why it is off by default in both the API and here.
 */
export const productIncludeOptions = [
  { value: "variants", label: "Variants" },
  { value: "images", label: "Images" },
  { value: "primary_image", label: "Primary image" },
  { value: "custom_fields", label: "Custom fields" },
  { value: "bulk_pricing_rules", label: "Bulk pricing rules" },
  { value: "modifiers", label: "Modifiers" },
  { value: "options", label: "Variant options" },
  { value: "videos", label: "Videos" },
  { value: "reviews", label: "Reviews" },
  { value: "channels", label: "Channel assignments" },
  { value: "parent_relations", label: "Parent relations" },
];

/** `sort` on `GET /v3/catalog/products` — `CatalogProductsGetParametersSort`. */
export const productSortOptions = [
  { value: "id", label: "ID" },
  { value: "name", label: "Name" },
  { value: "sku", label: "SKU" },
  { value: "price", label: "Price" },
  { value: "date_modified", label: "Date modified" },
  { value: "date_last_imported", label: "Date last imported" },
  { value: "inventory_level", label: "Inventory level" },
  { value: "is_visible", label: "Visibility" },
  { value: "total_sold", label: "Total sold" },
  { value: "calculated_price", label: "Calculated price" },
];

/** `direction` — `asc` / `desc`. Shared by the catalog list endpoints. */
export const directionParam: Param = {
  key: "direction",
  label: "Direction",
  type: "select",
  options: [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
  ],
};

/** `type` on a product — `CatalogProductsGetParametersType`. */
export const productTypeOptions = [
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

/** `availability` on a product — `CatalogProductsGetParametersAvailability`. */
export const productAvailabilityOptions = [
  { value: "available", label: "Available" },
  { value: "disabled", label: "Disabled" },
  { value: "preorder", label: "Pre-order" },
];

/** `condition` on a product — `CatalogProductsGetParametersCondition`. */
export const productConditionOptions = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

/** `sort` on `GET /v2/orders` — `OrdersGetParametersSort`. */
export const orderSortOptions = [
  { value: "id", label: "Order ID" },
  { value: "customer_id", label: "Customer ID" },
  { value: "date_created", label: "Date created" },
  { value: "date_modified", label: "Date modified" },
  { value: "status_id", label: "Status ID" },
  { value: "channel_id", label: "Channel ID" },
  { value: "external_id", label: "External ID" },
];

/** `include` on `GET /v2/orders` — `OrdersGetParametersIncludeSchemaItems`. */
export const orderIncludeOptions = [
  { value: "consignments", label: "Consignments" },
  { value: "consignments.line_items", label: "Consignment line items" },
  { value: "fees", label: "Fees" },
];

/** `sort` on `GET /v3/customers`. Value and direction are one token here. */
export const customerSortOptions = [
  { value: "date_created:asc", label: "Date created, oldest first" },
  { value: "date_created:desc", label: "Date created, newest first" },
  { value: "date_modified:asc", label: "Date modified, oldest first" },
  { value: "date_modified:desc", label: "Date modified, newest first" },
  { value: "last_name:asc", label: "Last name, A–Z" },
  { value: "last_name:desc", label: "Last name, Z–A" },
];

/** `include` on `GET /v3/customers` — `CustomersGetParametersIncludeSchemaItems`. */
export const customerIncludeOptions = [
  { value: "addresses", label: "Addresses" },
  { value: "storecredit", label: "Store credit" },
  { value: "attributes", label: "Attributes" },
  { value: "formfields", label: "Form fields" },
  { value: "shopper_profile_id", label: "Shopper profile ID" },
  { value: "segment_ids", label: "Segment IDs" },
];

/** `include` on the cart endpoints — `CartsCartIdGetParametersIncludeSchemaItems`. */
export const cartIncludeOptions = [
  { value: "redirect_urls", label: "Redirect URLs (checkout / cart links)" },
  { value: "line_items.physical_items.options", label: "Physical item options" },
  { value: "line_items.digital_items.options", label: "Digital item options" },
  { value: "promotions.banners", label: "Promotion banners" },
];

export const productIdParam: Param = {
  key: "productId",
  label: "Product ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
};

export const orderIdParam: Param = {
  key: "orderId",
  label: "Order ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
};
