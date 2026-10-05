import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `PUT /v2/resource_subscriptions`
 * Needs the `view_sales` or `account` scope.
 */
interface Input {
  resourceName: string;
  postUrl: string;
}

const resourceSubscriptionCreate: ActionDefinition<Input> = {
  key: "resource-subscription-create",
  type: "perform",
  resource: "webhook",
  title: "Subscribe to Resource",
  description:
    "Register a URL that Gumroad POSTs to when the resource event happens (a sale needs the view_sales scope). Gumroad documents this as PUT. Needs the `view_sales` or `account` scope.",
  idempotent: false,
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
  }, {
    "key": "postUrl",
    "label": "Post URL",
    "type": "string",
    "required": true,
    "hint": "Must be reachable by Gumroad.",
  }],
  output: [{ "key": "id", "type": "string", "label": "Subscription id" }, {
    "key": "resource_name",
    "type": "string",
    "label": "Resource",
  }, { "key": "post_url", "type": "string", "label": "Post URL" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("PUT", `/resource_subscriptions`, {
      form: { resource_name: input.resourceName, post_url: input.postUrl },
    });
    return body.resource_subscription;
  },
};

export default resourceSubscriptionCreate;
