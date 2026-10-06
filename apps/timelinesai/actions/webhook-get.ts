import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Get one webhook subscription (GET /webhooks/{webhook_id}).",
  params: [
    {
      "key": "webhookId",
      "label": "Webhook ID",
      "type": "string",
      "required": true,
      "hint": "From List Webhooks or Create Webhook.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The webhook" },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/webhooks/${seg(input.webhookId)}`);
  },
};

export default webhookGet;
