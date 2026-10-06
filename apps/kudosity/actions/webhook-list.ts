import type { ActionDefinition } from "@w6w/types";
import { KudosityClient } from "../lib/client.ts";

/** `GET /v2/webhook` — every webhook on the account (the response documents no paging). */
const webhookList: ActionDefinition<Record<string, never>> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks configured on the account.",
  params: [],
  output: [{ key: "webhooks", type: "array", label: "Webhooks" }],

  async execute(_input, ctx) {
    const body = await new KudosityClient(ctx).json<{ webhooks?: unknown[] } | null>("/webhook");
    return { webhooks: body?.webhooks ?? [] };
  },
};

export default webhookList;
