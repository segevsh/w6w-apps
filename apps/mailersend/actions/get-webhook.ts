import type { ActionDefinition } from "@w6w/types";
import { MailerSendClient, redactSecrets, seg } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const getWebhook: ActionDefinition<Input> = {
  key: "get-webhook",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description:
    "Read one webhook (GET /v1/webhooks/{id}). Any signing-secret field is stripped from the result.",
  params: [{ key: "webhookId", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The webhook" }],

  async execute(input, ctx) {
    return redactSecrets(
      await new MailerSendClient(ctx).json(`/webhooks/${seg(input.webhookId)}`),
    );
  },
};

export default getWebhook;
