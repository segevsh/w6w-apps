import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/webhook-endpoints/{id}`. Permanent. Not marked idempotent: the
 * spec documents a 404 for an unknown id, so a retry after a lost response
 * would surface as an error rather than the same result.
 */
interface Input {
  webhookEndpointId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook Endpoint",
  description: "Permanently delete a webhook endpoint.",
  idempotent: false,
  params: [webhookIdParam],
  output: [
    { key: "id", type: "string", label: "Deleted webhook endpoint ID" },
    { key: "deleted", type: "boolean", label: "Always true on success" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request(
      `/webhook-endpoints/${encodeId(input.webhookEndpointId)}`,
      { method: "DELETE" },
    );
  },
};

export default webhookDelete;
