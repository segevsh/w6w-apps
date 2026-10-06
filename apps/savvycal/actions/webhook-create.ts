import type { ActionDefinition } from "@w6w/types";
import { SavvyCalClient } from "../lib/client.ts";

interface Input {
  url: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook URL. The response includes the webhook's signing `secret` " +
    "(x-savvycal-signature is HMAC-SHA256 of the body, hex, prefixed `sha256=`) — this is the " +
    "one place it is returned; store it where the receiver can reach it.",
  idempotent: false,
  params: [{
    key: "url",
    label: "Webhook URL",
    type: "string",
    required: true,
    placeholder: "https://example.com/webhooks/savvycal",
  }],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "secret", type: "string", label: "Signing secret" },
  ],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json("/webhooks", {
      method: "POST",
      body: { url: input.url },
    });
  },
};

export default webhookCreate;
