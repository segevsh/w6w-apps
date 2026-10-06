import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/webhooks` */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks of the workspace.",
  params: [],
  output: [
    { key: "data", type: "array", label: "The records returned by Formbricks" },
  ],

  async execute(_input, ctx) {
    const res = await new FormbricksClient(ctx).request("GET", "/webhooks");
    return { data: res.data ?? [] };
  },
};

export default webhookList;
