import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/sales/:saleId/refund`
 * Needs the `edit_sales` or `account` scope.
 */
interface Input {
  saleId: string;
  amountCents?: number;
}

const saleRefund: ActionDefinition<Input> = {
  key: "sale-refund",
  type: "perform",
  resource: "sale",
  title: "Refund Sale",
  description:
    "Refund a sale, fully or partially. Not safe to retry: a repeated partial refund may refund again. Needs the `edit_sales` or `account` scope.",
  idempotent: false,
  params: [{
    "key": "saleId",
    "label": "Sale ID",
    "type": "string",
    "required": true,
    "hint": "The sale's `id` from List Sales.",
  }, {
    "key": "amountCents",
    "label": "Amount",
    "type": "number",
    "hint":
      "Minor units of the sale's own `currency` (200 = 2.00; `jpy` has no minor unit). Empty refunds the whole sale.",
  }],
  output: [{ "key": "id", "type": "string", "label": "Sale id" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("PUT", `/sales/${seg(input.saleId)}/refund`, {
      form: { amount_cents: input.amountCents },
    });
    return body.sale;
  },
};

export default saleRefund;
