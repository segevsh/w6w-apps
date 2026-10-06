import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  webhookUuid: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  idempotent: true,
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription (DELETE /webhooks/{webhook-uuid}).",
  params: [
    {
      key: "webhookUuid",
      label: "Webhook UUID",
      type: "string",
      required: true,
      hint: "Starts with WHK. From List Webhooks or Subscribe Webhook.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.delete(`/webhooks/${seg(input.webhookUuid)}`);
  },
};

export default webhookDelete;
