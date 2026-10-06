import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { deleteOutput } from "../lib/params.ts";

/**
 * Delete a webhook (`DELETE /webhooks/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook (`DELETE /webhooks/{id}`).",
  idempotent: true,
  params: [{ key: "id", label: "Webhook ID", type: "string", required: true }],
  output: deleteOutput,

  execute(input, ctx) {
    return new ProductiveClient(ctx).remove(`/webhooks/${encodeId(input.id)}`, input.id);
  },
};

export default webhookDelete;
