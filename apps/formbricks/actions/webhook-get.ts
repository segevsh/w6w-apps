import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/** `GET /api/v1/webhooks/{webhookId}` */
const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Fetch one webhook by ID.",
  params: [
    {
      "key": "webhookId",
      "label": "Webhook ID",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request("GET", `/webhooks/${seg(input.webhookId)}`);
    return { data: res.data ?? null };
  },
};

export default webhookGet;
