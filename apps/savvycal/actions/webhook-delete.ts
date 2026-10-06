import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient, stripWebhookSecret } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook. Returns the deleted webhook without its secret.",
  idempotent: false,
  params: [{ key: "webhookId", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Deleted webhook ID" }],

  async execute(input, ctx) {
    return stripWebhookSecret(
      await new SavvyCalClient(ctx).json(`/webhooks/${encodeId(input.webhookId)}`, {
        method: "DELETE",
      }),
    );
  },
};

export default webhookDelete;
