import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /webhooks` — Get the store's webhook URL and enabled event types. */
const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get the store's webhook URL and enabled event types.",
  params: [],
  output: [
    { key: "url", type: "string", label: "Webhook URL" },
    { key: "types", type: "array", label: "Enabled event types" },
    { key: "params", type: "object", label: "Event parameters" },
  ],

  async execute(_input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "GET",
      "/webhooks",
    );
    return result ?? {};
  },
};

export default webhookGet;
