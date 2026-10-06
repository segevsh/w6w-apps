import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PrintfulClient } from "../lib/client.ts";
import { itemsParam, recipientParam } from "../lib/params.ts";

interface Input {
  externalId?: string;
  shipping?: string;
  recipient: unknown;
  items: unknown;
  retailCosts?: unknown;
  gift?: unknown;
  packingSlip?: unknown;
  confirm?: boolean;
  updateExisting?: boolean;
}

/** `POST /orders` — Create an order as a draft, or submit it for fulfillment at once with Confirm. */
const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description:
    "Create an order as a draft, or submit it for fulfillment at once with Confirm. Confirming charges the store owner.",
  idempotent: false,
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Your own order id; later usable as `@<external_id>`.",
    },
    {
      key: "shipping",
      label: "Shipping method",
      type: "string",
      hint: "Shipping method id from Calculate Shipping Rates, e.g. `STANDARD`.",
    },
    recipientParam,
    itemsParam,
    {
      key: "retailCosts",
      label: "Retail costs",
      type: "json",
      hint:
        'Object {"currency":"USD","subtotal":"…","discount":"…","shipping":"…","tax":"…"} printed on the packing slip.',
    },
    {
      key: "gift",
      label: "Gift",
      type: "json",
      hint: 'Object {"subject":"…","message":"…"}.',
    },
    {
      key: "packingSlip",
      label: "Packing slip",
      type: "json",
      hint: 'Object {"email","phone","message","logo_url","store_name","custom_order_id"}.',
    },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      hint: "Submit for fulfillment immediately (charges the store owner). Off = save as a draft.",
    },
    {
      key: "updateExisting",
      label: "Update existing",
      type: "boolean",
      hint: "If an order with the same External ID exists, update it instead of failing.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "external_id", type: "string", label: "External ID" },
    { key: "status", type: "string", label: "Status (draft, pending, fulfilled, canceled…)" },
    { key: "shipping", type: "string", label: "Shipping method" },
    { key: "recipient", type: "object", label: "Recipient" },
    { key: "items", type: "array", label: "Items" },
    { key: "costs", type: "object", label: "Costs" },
    { key: "retail_costs", type: "object", label: "Retail costs" },
    { key: "shipments", type: "array", label: "Shipments" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "POST",
      "/orders",
      {
        query: { confirm: input.confirm, update_existing: input.updateExisting },
        body: compact({
          external_id: input.externalId,
          shipping: input.shipping,
          recipient: jsonValue(input.recipient),
          items: jsonValue(input.items),
          retail_costs: jsonValue(input.retailCosts),
          gift: jsonValue(input.gift),
          packing_slip: jsonValue(input.packingSlip),
        }),
      },
    );
    return result ?? {};
  },
};

export default orderCreate;
