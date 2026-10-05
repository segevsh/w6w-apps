import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/sales/:saleId/mark_as_shipped`
 * Needs the `mark_sales_as_shipped` or `account` scope.
 */
interface Input {
  saleId: string;
  trackingUrl?: string;
}

const saleMarkShipped: ActionDefinition<Input> = {
  key: "sale-mark-shipped",
  type: "perform",
  resource: "sale",
  title: "Mark Sale Shipped",
  description:
    "Mark a physical-product sale as shipped. Needs the `mark_sales_as_shipped` or `account` scope.",
  idempotent: true,
  params: [{
    "key": "saleId",
    "label": "Sale ID",
    "type": "string",
    "required": true,
    "hint": "The sale's `id` from List Sales.",
  }, {
    "key": "trackingUrl",
    "label": "Tracking URL",
    "type": "string",
    "hint": "Full http:// or https:// URL.",
  }],
  output: [{ "key": "id", "type": "string", "label": "Sale id" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "PUT",
      `/sales/${seg(input.saleId)}/mark_as_shipped`,
      {
        form: { tracking_url: input.trackingUrl },
      },
    );
    return body.sale;
  },
};

export default saleMarkShipped;
