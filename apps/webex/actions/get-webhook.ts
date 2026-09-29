import type { ActionDefinition } from "@w6w/types";
import { stripWebhookSecret, WebexClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const getWebhook: ActionDefinition<Input> = {
  key: "get-webhook",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get the details of a single webhook.",
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const webhook = await new WebexClient(ctx).request(
      `/webhooks/${encodeURIComponent(input.webhookId)}`,
    );
    // See stripWebhookSecret in lib/client.ts.
    return stripWebhookSecret(webhook);
  },
};

export default getWebhook;
