import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  webhookId: string;
  onBehalfOf?: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id.",
  idempotent: false,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "From the `id` of a Create Webhook or List Webhooks result.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "webhook_id", type: "string", label: "Webhook id" },
    { key: "deleted", type: "boolean", label: "Whether it was deleted" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).request(`/webhook/${encodeId(input.webhookId)}`, {
      method: "DELETE",
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default webhookDelete;
