import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, unknown>;

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhook Subscriptions",
  description: "List your webhook subscriptions.",
  params: [],
  output: [
    { key: "list", type: "array", label: "Subscriptions" },
    { key: "count", type: "number", label: "Subscriptions returned" },
  ],

  async execute(_input, ctx) {
    const res = await call(ctx, "GET", "/v1/webhooks/get");
    return {
      list: (res.list as unknown[] | undefined) ?? [],
      count: ((res.list as unknown[] | undefined) ?? []).length,
    };
  },
};

export default webhookList;
