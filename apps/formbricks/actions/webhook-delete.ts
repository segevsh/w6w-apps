import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/** `DELETE /api/v1/webhooks/{webhookId}` */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook; it stops firing immediately.",
  idempotent: true,
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
    const res = await new FormbricksClient(ctx).request(
      "DELETE",
      `/webhooks/${seg(input.webhookId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default webhookDelete;
