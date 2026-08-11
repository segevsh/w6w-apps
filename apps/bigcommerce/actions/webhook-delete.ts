import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /v3/hooks/{webhook_id}` — remove a webhook subscription.
 *
 * The success status is **200 with a body**, not 204 — the OpenAPI document
 * lists only `200` for this operation, and the deleted webhook comes back in
 * `data`. Most deletes in this API answer 204, so this one is worth not assuming.
 *
 * A webhook can only be deleted by the API account that created it, the same
 * ownership rule that makes `webhook-list` account-scoped.
 */
interface Input {
  webhookId: number;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete one webhook subscription. Only the API account that created it may do so.",
  // Re-deleting a gone webhook 404s rather than doing something different.
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "id", type: "number", label: "Deleted webhook ID" }],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3(`/hooks/${encodeId(input.webhookId)}`, {
      method: "DELETE",
    });
  },
};

export default webhookDelete;
