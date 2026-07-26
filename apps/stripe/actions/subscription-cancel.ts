import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
  atPeriodEnd?: boolean;
}

/**
 * Two different Stripe calls hide behind one switch:
 *   - immediate  -> DELETE /subscriptions/{id}
 *   - at period end -> POST /subscriptions/{id} with cancel_at_period_end=true
 * The second is reversible (set it back to false); the first is not.
 */
const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description:
    "Cancel now, or schedule cancellation for the end of the current period (which is reversible).",
  idempotent: true,
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      placeholder: "sub_…",
    },
    {
      key: "atPeriodEnd",
      label: "At period end",
      type: "boolean",
      default: true,
      hint:
        "On: the customer keeps access until the period ends, and it can be undone. Off: cancel immediately.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "cancel_at_period_end", type: "boolean", label: "Cancels at period end" },
  ],

  execute(input, ctx) {
    const path = `/subscriptions/${encodeURIComponent(input.subscriptionId)}`;
    if (input.atPeriodEnd === false) {
      return new StripeClient(ctx).request(path, { method: "DELETE" });
    }
    return new StripeClient(ctx).request(path, { form: { cancel_at_period_end: true } });
  },
};

export default subscriptionCancel;
