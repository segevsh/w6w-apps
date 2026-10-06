import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient, stripWebhookSecret } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Fetch one webhook. The signing `secret` is removed from the output.",
  params: [{ key: "webhookId", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Webhook ID" }],

  async execute(input, ctx) {
    return stripWebhookSecret(
      await new SavvyCalClient(ctx).json(`/webhooks/${encodeId(input.webhookId)}`),
    );
  },
};

export default webhookGet;
