import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";
import { redactWebhook } from "../lib/redact.ts";

interface Input {
  subscriptionId: string;
}

/** Fetch one webhook subscription. The signing `secret` is redacted. */
const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook Subscription",
  description: "Fetch one webhook subscription. The signing `secret` is redacted.",
  params: [
    { "key": "subscriptionId", "label": "Subscription ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
    { "key": "target_url", "type": "string", "label": "Target URL" },
    { "key": "events", "type": "array", "label": "Events" },
    { "key": "delivery", "type": "object", "label": "Delivery status" },
  ],

  async execute(input, ctx) {
    return redactWebhook(
      await new SuperchatClient(ctx).request(`/webhooks/${seg(input.subscriptionId)}`),
    );
  },
};

export default webhookGet;
