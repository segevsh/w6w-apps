import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
}

/** Delete a webhook subscription. This cannot be undone. */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook Subscription",
  description: "Delete a webhook subscription. This cannot be undone.",
  idempotent: true,
  params: [
    {
      "key": "subscriptionId",
      "label": "Webhook subscription ID",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/webhooks/${seg(input.subscriptionId)}`, {
      method: "DELETE",
    });
  },
};

export default webhookDelete;
