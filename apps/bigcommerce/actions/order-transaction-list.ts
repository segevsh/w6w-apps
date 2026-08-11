import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, encodeId } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

/**
 * `GET /v3/orders/{order_id}/transactions` — the payment events on an order.
 *
 * The one place where "Orders V3" is a real thing: order CRUD lives at v2, and
 * `/v3/orders/…` exists only for transactions, refunds, metafields and settings.
 * So a single order is addressed under **two** versions depending on what you
 * want from it, and that is by design rather than a migration in progress.
 *
 * This returns the gateway-level authorisations, captures, voids and refunds —
 * the audit trail behind the order's `payment_status`.
 */
interface Input {
  orderId: number;
}

const orderTransactionList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "order-transaction-list",
  type: "read",
  resource: "order",
  title: "List Order Transactions",
  description: "The gateway transactions behind one order — authorisations, captures and refunds.",
  params: [orderIdParam],
  output: [{ key: "data", type: "array", label: "Transactions" }],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page(`/orders/${encodeId(input.orderId)}/transactions`);
  },
};

export default orderTransactionList;
