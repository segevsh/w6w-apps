import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam, orderIdParam, subscriptionIdParam } from "../lib/params.ts";

/**
 * `POST /cancelSubscription` — end a recurring subscription. Idempotent: a
 * subscription is a single target that ends up cancelled either way, and
 * ThriveCart's own error for a subscription that is not accessible/cancellable
 * is a 400 rather than a silent success, so a retry cannot double-cancel.
 */
interface Input {
  orderId: string;
  subscriptionId: string;
  mode?: string;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description: "Cancel a customer's recurring subscription.",
  idempotent: true,
  params: [orderIdParam, subscriptionIdParam, modeParam],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/cancelSubscription", {
      form: { order_id: input.orderId, subscription_id: input.subscriptionId },
      mode: input.mode,
    });
  },
};

export default subscriptionCancel;
