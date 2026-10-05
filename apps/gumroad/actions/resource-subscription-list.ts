import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/resource_subscriptions`
 */
interface Input {
  resourceName: string;
}

const resourceSubscriptionList: ActionDefinition<Input> = {
  key: "resource-subscription-list",
  type: "read",
  resource: "webhook",
  title: "List Resource Subscriptions",
  description: "Active webhook subscriptions for one resource type.",
  params: [{
    "key": "resourceName",
    "label": "Resource",
    "type": "select",
    "required": true,
    "options": [
      { "value": "sale", "label": "sale" },
      { "value": "refund", "label": "refund" },
      { "value": "dispute", "label": "dispute" },
      { "value": "dispute_won", "label": "dispute_won" },
      { "value": "cancellation", "label": "cancellation" },
      { "value": "subscription_updated", "label": "subscription_updated" },
      { "value": "subscription_ended", "label": "subscription_ended" },
      { "value": "subscription_restarted", "label": "subscription_restarted" },
    ],
  }],
  output: [{ "key": "resourceSubscriptions", "type": "array", "label": "Subscriptions" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/resource_subscriptions`, {
      query: { resource_name: input.resourceName },
    });
    return { resourceSubscriptions: body.resource_subscriptions ?? [] };
  },
};

export default resourceSubscriptionList;
