import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/**
 * Cancel an unclaimed payout item, returning its funds to the sender before
 * PayPal's automatic 30-day refund. Wraps
 * `POST /v1/payments/payouts-item/{id}/cancel`. Only items with
 * `transaction_status: UNCLAIMED` can be cancelled — PayPal rejects the call
 * otherwise.
 */
const action: ActionDefinition = {
  key: "payout-item-cancel",
  type: "perform",
  resource: "payout",
  title: "Cancel a payout item",
  description: "Cancel an unclaimed payout item and return its funds to the sender.",
  idempotent: false,
  params: [
    { key: "payoutItemId", label: "Payout Item ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "payout_item_id", type: "string", label: "Payout Item ID" },
    { key: "transaction_status", type: "string", label: "Status after cancellation" },
  ],

  async execute(input, ctx) {
    const payoutItemId = String((input as Record<string, unknown>).payoutItemId ?? "").trim();
    if (!payoutItemId) throw new Error("`payoutItemId` is required");

    ctx.log("info", "cancelling PayPal payout item", { payoutItemId });

    return await new PayPalClient(ctx).request(`/v1/payments/payouts-item/${payoutItemId}/cancel`, {
      method: "POST",
      body: {},
    });
  },
};

export default action;
