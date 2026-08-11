import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, BigCommerceClient, compact } from "../lib/client.ts";

/**
 * `POST /v2/orders` — create an order.
 *
 * Three vendor facts that shape this action, all from the Orders overview guide:
 *
 *  - **This does not send the order email.** "The V2 Orders API will not trigger
 *    the typical Order Email when creating orders." If a customer needs to hear
 *    about it, the vendor's documented route is to create a *cart* and convert it
 *    through checkout instead.
 *  - **Migrating historical orders needs `external_source: "M-MIG"`.** That code
 *    excludes them from the store's GMV and order count, which factor into
 *    BigCommerce's own pricing. Getting it wrong changes what the merchant pays.
 *  - **Shipping and pickup are mutually exclusive.** An order uses either
 *    `shipping_addresses` + `products` (shipping) or `consignments` (pickup) —
 *    never both — and the create endpoint rejects the combination.
 *
 * `billing_address` and `products` are the minimum the guide's own example
 * carries, so they are the two required inputs here; everything else merges in
 * through `extraFields`. A product line may reference a catalog product by
 * `product_id` or be a *custom* product (name + price, not in the catalog), which
 * is what the vendor's worked example uses.
 */
interface Input {
  billingAddress: unknown;
  products: unknown;
  customerId?: number;
  statusId?: number;
  channelId?: number;
  staffNotes?: string;
  customerMessage?: string;
  externalSource?: string;
  extraFields?: unknown;
}

const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description:
    "Create an order directly. Note this does NOT send the store's order email — create a cart " +
    "and check it out if the customer should be notified.",
  // BigCommerce mints the order ID and accepts no client idempotency key, so a
  // retry creates a second order. `external_id` can be used to detect that after
  // the fact, but it does not prevent it.
  idempotent: false,
  params: [
    {
      key: "billingAddress",
      label: "Billing address",
      type: "json",
      required: true,
      placeholder:
        '{ "first_name": "Jane", "last_name": "Doe", "street_1": "123 Main St", "city": "Austin", ' +
        '"state": "Texas", "zip": "78751", "country_iso2": "US", "email": "jane@example.com" }',
    },
    {
      key: "products",
      label: "Products",
      type: "json",
      required: true,
      placeholder: '[{ "product_id": 77, "quantity": 1 }]',
      hint: "Either catalog lines (`product_id` + `quantity`) or custom lines (`name`, " +
        "`quantity`, `price_inc_tax`, `price_ex_tax`).",
    },
    { key: "customerId", label: "Customer ID", type: "number", validation: { integer: true } },
    {
      key: "statusId",
      label: "Status ID",
      type: "number",
      validation: { integer: true },
      hint: "See List Order Statuses. Omit to use the store's default for a new order.",
    },
    { key: "channelId", label: "Channel ID", type: "number", validation: { integer: true } },
    { key: "customerMessage", label: "Customer message", type: "text", advanced: true },
    { key: "staffNotes", label: "Staff notes", type: "text", advanced: true },
    {
      key: "externalSource",
      label: "External source",
      type: "string",
      advanced: true,
      hint: "Use the exact code `M-MIG` when migrating historical orders from another platform — " +
        "it keeps them out of the store's GMV and order count, which affect BigCommerce pricing.",
    },
    {
      key: "extraFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Merged into the request body. Use it for shipping_addresses, discount_amount, " +
        "payment_method, external_id and the rest.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New order ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const body = {
      ...compact({
        billing_address: asJson<unknown>(input.billingAddress, "Billing address"),
        products: asJson<unknown>(input.products, "Products"),
        customer_id: input.customerId,
        status_id: input.statusId,
        channel_id: input.channelId,
        customer_message: input.customerMessage,
        staff_notes: input.staffNotes,
        external_source: input.externalSource,
      }),
      ...(extra ?? {}),
    };
    return await new BigCommerceClient(ctx).v2("/orders", { method: "POST", body });
  },
};

export default orderCreate;
