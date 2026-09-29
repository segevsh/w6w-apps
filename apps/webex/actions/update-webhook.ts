import type { ActionDefinition } from "@w6w/types";
import { stripWebhookSecret, unset, WebexClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
  name: string;
  targetUrl: string;
  secret?: string;
  reactivate?: boolean;
}

const updateWebhook: ActionDefinition<Input> = {
  key: "update-webhook",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Update a webhook's name or target URL, or reactivate one Webex disabled after " +
    "repeated delivery failures. A full replace — Webex requires Name and Target URL even when " +
    "only reactivating.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "targetUrl", label: "Target URL", type: "string", required: true },
    { key: "secret", label: "Secret", type: "secret", advanced: true },
    {
      key: "reactivate",
      label: "Reactivate",
      type: "boolean",
      hint: 'Sets status to "active". Webex disables a webhook after enough failed deliveries.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const webhook = await new WebexClient(ctx).request(
      `/webhooks/${encodeURIComponent(input.webhookId)}`,
      {
        method: "PUT",
        body: {
          name: input.name,
          targetUrl: input.targetUrl,
          secret: unset(input.secret),
          status: input.reactivate ? "active" : undefined,
        },
      },
    );
    // See stripWebhookSecret in lib/client.ts.
    return stripWebhookSecret(webhook);
  },
};

export default updateWebhook;
