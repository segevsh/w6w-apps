import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  idempotent: true,
  resource: "webhook",
  title: "Delete Webhook",
  description:
    "Permanently delete a webhook subscription; deliveries stop immediately (DELETE /webhooks/{webhook_id}).",
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
    { key: "status", type: "string", label: "ok on success" },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).delete(`/webhooks/${seg(input.webhookId)}`);
  },
};

export default webhookDelete;
