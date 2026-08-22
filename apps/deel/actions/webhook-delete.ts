import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `DELETE /webhooks/{id}` — verified against Deel's own OpenAPI document
 * (`endpoints.json`, `delete-webhook`).
 */
const action: ActionDefinition = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete a webhook",
  description: "Stop Deel sending events to a URL.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const webhookId = String(p.webhookId ?? "").trim();
    if (!webhookId) throw new Error("`webhookId` is required");

    ctx.log("info", "deleting Deel webhook", { webhookId });

    await new DeelClient(ctx).request(`/webhooks/${encodeURIComponent(webhookId)}`, {
      method: "DELETE",
    });
    return { id: webhookId, deleted: true };
  },
};

export default action;
