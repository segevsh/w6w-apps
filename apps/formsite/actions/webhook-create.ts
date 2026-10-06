import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient, unset } from "../lib/client.ts";
import { formDir } from "../lib/params.ts";

interface Input {
  formDir: string;
  url: string;
  handshakeKey?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create or Update Webhook",
  description:
    "Subscribe a URL to a form's result-completed event. If a webhook with that URL already exists it is updated. The URL receives the same data as List Results, plus `handshake_key` when one is set.",
  // Formsite upserts on URL, so repeating the call converges on the same webhook.
  idempotent: true,
  params: [
    formDir,
    { key: "url", label: "Webhook URL", type: "string", required: true },
    {
      key: "handshakeKey",
      label: "Handshake key",
      type: "string",
      hint: "Optional. Sent back in each post so your receiver can verify the sender.",
    },
  ],
  output: [{ key: "webhook", type: "object", label: "Webhook" }],

  async execute(input, ctx) {
    const res = await new FormsiteClient(ctx).request<{ webhook?: unknown }>(
      `/forms/${encodeURIComponent(input.formDir)}/webhooks`,
      {
        method: "POST",
        body: {
          event: "result_completed",
          url: input.url,
          ...(unset(input.handshakeKey) ? { handshake_key: input.handshakeKey } : {}),
        },
      },
    );
    return { webhook: res.webhook ?? null };
  },
};

export default webhookCreate;
