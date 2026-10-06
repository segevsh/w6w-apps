import type { ActionDefinition } from "@w6w/types";
import { LoopClient } from "../lib/client.ts";

/**
 * List Webhooks.
 *
 * `GET /webhooks`.
 */
type Input = Record<string, never>;

const action: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List webhook subscriptions, whether created through the API or in Loop Admin.",
  params: [],
  output: [
    {
      key: "webhooks",
      type: "array",
      label: "Subscriptions: id, shop_id, topic, trigger, url, status",
    },
  ],

  async execute(_input, ctx) {
    const res = await new LoopClient(ctx).get("/webhooks") as Record<string, unknown>;
    return { webhooks: res.webhooks ?? [] };
  },
};

export default action;
