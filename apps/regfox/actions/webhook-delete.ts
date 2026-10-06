import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `DELETE /v2/public/webhooks/{id}` */
const webhookDelete: ActionDefinition<Record<string, unknown>> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook. Its delivery stops immediately.",
  idempotent: true,
  params: [requiredId("webhookId", "Webhook ID")],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  async execute(input, ctx) {
    await new RegfoxClient(ctx).call(`/webhooks/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default webhookDelete;
