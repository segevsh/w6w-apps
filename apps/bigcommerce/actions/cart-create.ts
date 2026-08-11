import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, BigCommerceClient, compact, toList } from "../lib/client.ts";
import { cartIncludeOptions } from "../lib/params.ts";

/**
 * `POST /v3/carts` — create a cart.
 *
 * This is the vendor's own recommended route to an order that behaves like a
 * real one: creating an order directly through `/v2/orders` does **not** send the
 * store's order email, and the Orders guide's remedy is "create a cart and
 * convert that cart into an order" through checkout.
 *
 * The success status is **201** here (the OpenAPI document lists only 201),
 * unlike most v3 creates in this app, which answer 200.
 *
 * Ask for `include=redirect_urls` and the response carries the storefront cart
 * and checkout URLs, which is the point of building a cart from a workflow.
 */
interface Input {
  lineItems: unknown;
  customerId?: number;
  channelId?: number;
  currency?: string;
  customItems?: unknown;
  include?: string[];
}

const cartCreate: ActionDefinition<Input> = {
  key: "cart-create",
  type: "perform",
  resource: "cart",
  title: "Create Cart",
  description:
    "Create a cart from catalog or custom line items. Ask for redirect_urls to get a shoppable " +
    "checkout link back.",
  // A retry makes a second, independent cart — BigCommerce mints the UUID.
  idempotent: false,
  params: [
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      required: true,
      placeholder: '[{ "quantity": 1, "product_id": 77 }]',
      hint: "Catalog lines: `product_id` plus `quantity`, and `variant_id` when the product has " +
        "variants.",
    },
    { key: "customerId", label: "Customer ID", type: "number", validation: { integer: true } },
    { key: "channelId", label: "Channel ID", type: "number", validation: { integer: true } },
    {
      key: "currency",
      label: "Currency",
      type: "json",
      advanced: true,
      placeholder: '{ "code": "USD" }',
      hint: "The API takes an object here, not a bare code.",
    },
    {
      key: "customItems",
      label: "Custom items",
      type: "json",
      advanced: true,
      hint: "Lines that are not in the catalog — name, quantity and list_price.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      default: ["redirect_urls"],
      options: cartIncludeOptions,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Cart ID" },
    { key: "redirect_urls", type: "object", label: "Cart and checkout URLs" },
  ],

  async execute(input, ctx) {
    const body = compact({
      line_items: asJson<unknown>(input.lineItems, "Line items"),
      customer_id: input.customerId,
      channel_id: input.channelId,
      currency: asOptionalJson<unknown>(input.currency, "Currency"),
      custom_items: asOptionalJson<unknown>(input.customItems, "Custom items"),
    });
    return await new BigCommerceClient(ctx).v3("/carts", {
      method: "POST",
      body,
      query: { include: toList(input.include) },
    });
  },
};

export default cartCreate;
