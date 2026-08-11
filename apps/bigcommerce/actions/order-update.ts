import type { ActionDefinition } from "@w6w/types";
import { asJson, BigCommerceClient, encodeId } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

/**
 * `PUT /v2/orders/{order_id}` — a partial order update.
 *
 * The overwhelmingly common use is changing `status_id`, which is the documented
 * way to move an order through the store's workflow — and *that* is what fires
 * the store's customer notifications, unlike creating the order in the first
 * place. Look the numeric status up with `order-status-list` rather than
 * hard-coding it: a merchant can rename any status, and custom statuses exist.
 */
interface Input {
  orderId: number;
  fields: unknown;
}

const orderUpdate: ActionDefinition<Input> = {
  key: "order-update",
  type: "perform",
  resource: "order",
  title: "Update Order",
  description: "Apply a partial update to one order — most often to change its status.",
  idempotent: true,
  params: [
    orderIdParam,
    {
      key: "fields",
      label: "Fields to change",
      type: "json",
      required: true,
      placeholder: '{ "status_id": 2 }',
      hint: "A partial order object. Changing `status_id` is what triggers the store's " +
        "order-status notification emails.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const body = asJson<Record<string, unknown>>(input.fields, "Fields to change");
    return await new BigCommerceClient(ctx).v2(`/orders/${encodeId(input.orderId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default orderUpdate;
