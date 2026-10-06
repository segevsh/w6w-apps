import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID } from "../lib/params.ts";

interface Input {
  customerId: string;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description:
    "Cancel the customer's active non-OTT subscription. Apple, Roku, Android and Amazon subscriptions are refused by Uscreen (422). No active subscription is a success with `active: false`.",
  idempotent: true,
  params: [
    CUSTOMER_ID(""),
  ],
  output: [
    { key: "active", type: "boolean", label: "Whether a subscription was returned" },
    { key: "subscription", type: "object", label: "The subscription, or null" },
  ],

  async execute(input, ctx) {
    const subscription = await new UscreenClient(ctx).call<Record<string, unknown>>(
      "DELETE",
      `/customers/${seg(input.customerId)}/subscription`,
    );
    return { active: subscription !== null, subscription };
  },
};

export default subscriptionCancel;
