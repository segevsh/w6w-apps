import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";

/** `GET /webhooks/subscriptions` — Anchor operation `listWebhookSubscriptions`. */
type Input = Record<string, never>;

const webhookSubscriptionList: ActionDefinition<Input> = {
  key: "webhook-subscription-list",
  type: "read",
  resource: "webhook",
  title: "List Webhook Subscriptions",
  description: "List the active webhook subscriptions: target URL and event types.",
  params: [],
  output: [
    { key: "subscriptions", type: "array", label: "Active subscriptions" },
  ],

  execute(_input, ctx) {
    return new AnchorClient(ctx).request("GET", "/webhooks/subscriptions");
  },
};

export default webhookSubscriptionList;
