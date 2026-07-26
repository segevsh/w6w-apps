import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

const subscriptionGet: ActionDefinition<{ subscriptionId: string }> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Retrieve a subscription and its current period.",
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      placeholder: "sub_…",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "cancel_at_period_end", type: "boolean", label: "Cancels at period end" },
    { key: "items", type: "object", label: "Items" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    );
  },
};

export default subscriptionGet;
