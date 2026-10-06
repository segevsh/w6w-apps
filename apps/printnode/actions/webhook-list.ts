import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, stripWebhookSecrets } from "../lib/client.ts";

/**
 * `GET /webhooks` — the account's webhooks (at most five) with delivery counters.
 * The `secret` field the vendor returns in clear is removed; see
 * `stripWebhookSecrets`.
 */
const webhookList: ActionDefinition<Record<string, never>> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the account's webhooks and their delivery statistics.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Webhooks" },
    { key: "count", type: "number", label: "Returned" },
  ],
  async execute(_input, ctx) {
    const items = stripWebhookSecrets(await new PrintNodeClient(ctx).json<unknown[]>("/webhooks"));
    return { items, count: items.length };
  },
};

export default webhookList;
