import type { ActionDefinition } from "@w6w/types";
import { API_V1, SquarespaceClient } from "../lib/client.ts";
import { orderOutput } from "../lib/params.ts";

/**
 * `GET /1.0/commerce/orders/{id}` — one order, in full.
 *
 * The id is the order's own `id` (`585d498fdee9f31a60284a37` in the vendor's
 * example), not the customer-facing `orderNumber`. Both come back on the
 * response; the path takes the former.
 *
 * The response is the whole `Order`: addresses, line items with their
 * customizations, fulfillments with tracking numbers, the monetary totals, the
 * discount and shipping lines, and the refunded amounts. Note that it carries
 * `paymentState` but **not** the transaction documents — for the money side,
 * `list-transactions` filtered by `orderId` is the right read (Squarespace's
 * own Transactions page documents `orderId` for exactly that).
 */
interface Input {
  id: string;
}

const getOrder: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-order",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve one order by its id, including line items, fulfillments and totals.",
  params: [{
    key: "id",
    label: "Order id",
    type: "string",
    required: true,
    placeholder: "585d498fdee9f31a60284a37",
    hint: "The order's `id` from List orders — not its customer-facing `orderNumber`.",
  }],
  output: orderOutput,

  execute(input, ctx) {
    const id = encodeURIComponent(String(input.id ?? "").trim());
    return new SquarespaceClient(ctx).get<Record<string, unknown>>(
      `${API_V1}/commerce/orders/${id}`,
    );
  },
};

export default getOrder;
