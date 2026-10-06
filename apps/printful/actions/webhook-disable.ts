import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `DELETE /webhooks` — Remove the store's webhook URL and all of its event types. */
const webhookDisable: ActionDefinition<Input> = {
  key: "webhook-disable",
  type: "perform",
  resource: "webhook",
  title: "Disable Webhook",
  description: "Remove the store's webhook URL and all of its event types.",
  idempotent: true,
  params: [],
  output: [
    { key: "url", type: "string", label: "Webhook URL" },
    { key: "types", type: "array", label: "Enabled event types" },
    { key: "params", type: "object", label: "Event parameters" },
  ],

  async execute(_input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "DELETE",
      "/webhooks",
    );
    return result ?? {};
  },
};

export default webhookDisable;
