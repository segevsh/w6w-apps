import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCardlessClient } from "../lib/client.ts";

/**
 * `POST /subscriptions/{id}/actions/cancel` — cancel a subscription.
 *
 * Stops future collections from this series. Payments already generated are
 * untouched — GoCardless keeps them, and a subscription that has already
 * produced a payment for the current period will not un-produce it, so a workflow
 * that cancels mid-period still needs to refund that one with `create-refund`.
 *
 * Cancelling the mandate is the stronger action: it stops every subscription and
 * every ad-hoc payment against that bank account at once.
 *
 * Declared `idempotent: false` because a repeat is the vendor's `invalid_state`
 * error, not a no-op; no `Idempotency-Key` is sent, because this endpoint creates
 * nothing.
 */
interface Input {
  subscriptionId: string;
}

const cancelSubscription: ActionDefinition<Input, Record<string, unknown>> = {
  key: "cancel-subscription",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description:
    "Stop a subscription collecting. Payments it has already generated are unaffected — refund " +
    "those with `create-refund` if they should not stand.",
  idempotent: false,
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      placeholder: "SB0000…",
      hint: "The subscription to cancel. GoCardless refuses an already-cancelled subscription " +
        "with `invalid_state`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount per payment (lowest denomination)" },
    { key: "currency", type: "string", label: "Currency" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).action(
      "subscriptions",
      `/subscriptions/${encodeId(input.subscriptionId)}/actions/cancel`,
    );
  },
};

export default cancelSubscription;
