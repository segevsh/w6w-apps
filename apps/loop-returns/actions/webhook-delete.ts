import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Delete Webhook.
 *
 * `DELETE /webhooks/{id}` (HTTP 204).
 */
interface Input {
  webhookId: number;
}

const action: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Remove a webhook subscription.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "number",
      required: true,
      hint: "The subscription's id.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when removed" },
    { key: "webhookId", type: "number", label: "Webhook ID" },
  ],

  async execute(input, ctx) {
    await new LoopClient(ctx).delete(`/webhooks/${encodeId(input.webhookId)}`);
    return { success: true, webhookId: input.webhookId };
  },
};

export default action;
