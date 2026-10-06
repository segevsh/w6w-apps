import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const deleteWebhook: ActionDefinition<Input> = {
  key: "delete-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by ID. Permanently removes the webhook from Eventbrite.",
  idempotent: true,
  params: [{ key: "webhookId", label: "Webhook ID", type: "string", required: true }],
  output: [],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/webhooks/${encodeURIComponent(input.webhookId)}/`, {
      method: "DELETE",
    });
  },
};

export default deleteWebhook;
