import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID } from "../lib/params.ts";

interface Input {
  customerId: string;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Customer Subscription",
  description:
    "The customer's active subscription. `active` is false and `subscription` null when they have none (the API answers 204).",
  params: [
    CUSTOMER_ID(""),
  ],
  output: [
    { key: "active", type: "boolean", label: "Whether a subscription was returned" },
    { key: "subscription", type: "object", label: "The subscription, or null" },
  ],

  async execute(input, ctx) {
    const subscription = await new UscreenClient(ctx).call<Record<string, unknown>>(
      "GET",
      `/customers/${seg(input.customerId)}/subscription`,
    );
    return { active: subscription !== null, subscription };
  },
};

export default subscriptionGet;
