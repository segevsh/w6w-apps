import type { ActionDefinition } from "@w6w/types";
import { type DeleteResult, encodeId, ProductboardClient } from "../lib/client.ts";

/**
 * `DELETE /v2/webhooks/{webhookId}` — unsubscribe.
 *
 * There is no update endpoint for a webhook subscription — the v2 Webhooks API
 * has exactly four operations (create, list, get, delete). Changing the event
 * list or the target URL therefore means delete-and-recreate, and the
 * `Authorization` header has to be supplied again because Productboard never
 * returned it.
 *
 * **Idempotent.**
 */
interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input, DeleteResult> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete webhook",
  description:
    "Delete a webhook subscription. There is no update endpoint — changing a subscription means " +
    "deleting and recreating it, re-supplying the authorization header.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "UUID from a List webhooks result.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "deleted", type: "boolean", label: "The subscription was removed" },
  ],

  async execute(input, ctx) {
    const status = await new ProductboardClient(ctx).status(
      `/webhooks/${encodeId(input.webhookId)}`,
      { method: "DELETE" },
    );
    return { status, deleted: status === 204 };
  },
};

export default webhookDelete;
