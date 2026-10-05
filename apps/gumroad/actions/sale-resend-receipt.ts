import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `POST /v2/sales/:saleId/resend_receipt`
 * Needs the `edit_sales` or `account` scope.
 */
interface Input {
  saleId: string;
}

const saleResendReceipt: ActionDefinition<Input> = {
  key: "sale-resend-receipt",
  type: "perform",
  resource: "sale",
  title: "Resend Receipt",
  description:
    "Email the purchase receipt to the customer again. Needs the `edit_sales` or `account` scope.",
  idempotent: false,
  params: [{
    "key": "saleId",
    "label": "Sale ID",
    "type": "string",
    "required": true,
    "hint": "The sale's `id` from List Sales.",
  }],
  output: [{ "key": "success", "type": "boolean", "label": "True when queued" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "POST",
      `/sales/${seg(input.saleId)}/resend_receipt`,
    );
    return { success: body.success };
  },
};

export default saleResendReceipt;
