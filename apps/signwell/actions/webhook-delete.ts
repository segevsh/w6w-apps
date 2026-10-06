import type { ActionDefinition } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /api/v1/hooks/{id}` — verified against SignWell's OpenAPI document (`deleteWebhook`):
 * 204 no content, 404 if it is gone.
 */
const webhookDelete: ActionDefinition = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete a Webhook",
  description: "Remove a webhook so SignWell stops posting events to it.",
  idempotent: true,
  params: [idParam("Webhook id")],
  output: [
    { key: "id", type: "string", label: "Webhook id" },
    { key: "deleted", type: "boolean", label: "True once SignWell answered 204" },
  ],

  async execute(input, ctx) {
    const id = requireId((input as { id?: unknown }).id);
    ctx.log("info", "deleting a SignWell webhook", { id });
    await new SignWellClient(ctx).request(`/hooks/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { id, deleted: true };
  },
};

export default webhookDelete;
