import type { ActionDefinition } from "@w6w/types";
import { API_V2, compact, jsonParam, SquarespaceClient } from "../lib/client.ts";
import { options, productOutput } from "../lib/params.ts";

/**
 * `POST /v2/commerce/products` — create a product.
 *
 * ## Create is a discriminated `oneOf`, and `DIGITAL` cannot be created here
 *
 * The vendor documents three request shapes — `CreatePhysicalProductRequest`,
 * `CreateServiceProductRequest` and `CreateGiftCardProductRequest` — selected by
 * `type`, and states plainly that **a `DIGITAL` product cannot be created
 * through the API** (one can exist and be read/updated/deleted; it is uploaded
 * in the admin UI). `type` is therefore a required select of the three creatable
 * values, not of the four product types.
 *
 * ## The common required fields
 *
 * `name`, `storePageId` and `type`. `storePageId` is not optional anywhere —
 * run `list-store-pages` first and pass a page's `id`.
 *
 * ## `variants`
 *
 * Passed through as JSON because the three shapes differ in what a variant may
 * carry: every variant needs `sku`, and `pricing.basePrice` (`{currency, value}`)
 * for the simple cases, while physical variants additionally take `attributes`
 * (at most six key/value pairs), `gtin`, `mpn`, `shippingMeasurements` and
 * `stock`. Modelled loosely on purpose — the vendor's pages are the authority,
 * and freezing the union here would reject shape variants it adds later.
 */
const CREATABLE_TYPES = ["PHYSICAL", "SERVICE", "GIFT_CARD"] as const;

interface Input {
  name: string;
  storePageId: string;
  type: string;
  description?: string;
  isVisible?: boolean;
  tags?: string[];
  urlSlug?: string;
  variants?: unknown;
}

const createProduct: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-product",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description:
    "Create a PHYSICAL, SERVICE or GIFT_CARD product on a store page. `DIGITAL` products " +
    "cannot be created through the API.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "storePageId",
      label: "Store page id",
      type: "string",
      required: true,
      hint: "The store page to publish the product on — a `storePages[].id` from List store " +
        "pages. Required by every create shape.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: options(CREATABLE_TYPES),
      hint: "`DIGITAL` is deliberately absent: the vendor documents that a digital product " +
        "cannot be created through the API.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      advanced: true,
    },
    {
      key: "isVisible",
      label: "Visible",
      type: "boolean",
      advanced: true,
      hint: "Publish the product on its store page immediately.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string", placeholder: "summer-sale" },
      advanced: true,
    },
    {
      key: "urlSlug",
      label: "URL slug",
      type: "string",
      advanced: true,
      hint: "Leave empty to let Squarespace derive it from the name.",
    },
    {
      key: "variants",
      label: "Variants",
      type: "json",
      placeholder: '[{"sku":"TSHIRT-M","pricing":{"basePrice":{"currency":"USD",' +
        '"value":29.99}},"stock":{"quantity":10,"unlimited":false}}]',
      hint: "Array of variants. Each needs a unique `sku`; `pricing.basePrice` " +
        '(`{"currency","value"}`) is required for the simple cases. Physical variants also ' +
        "take `attributes` (≤6 key/value pairs), `gtin`, `mpn`, `shippingMeasurements` and " +
        "`stock`.",
    },
  ],
  output: productOutput,

  execute(input, ctx) {
    const variants = jsonParam<unknown>(input.variants, "variants");
    const body = compact({
      name: input.name,
      storePageId: input.storePageId,
      type: input.type,
      description: input.description,
      isVisible: input.isVisible,
      tags: input.tags,
      urlSlug: input.urlSlug,
      variants,
    });
    return new SquarespaceClient(ctx).post<Record<string, unknown>>(
      `${API_V2}/commerce/products`,
      body,
    );
  },
};

export default createProduct;
