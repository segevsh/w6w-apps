import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: number;
}

/**
 * `DELETE /api/public/webhooks/DeleteWebhook?webhookId=…` — remove a webhook.
 *
 * The id is a **query parameter** — not a path segment, and not a body field —
 * which the document states twice ("This must be provided as a query
 * parameter").
 *
 * `idempotent: true`: deleting a webhook is a delete, and a retry that finds
 * nothing left to delete has not done anything twice. The documented response
 * has no body, so the action returns the status.
 *
 * The webhook id comes from `webhook-list`; `CreateWebhook` cannot supply it,
 * because the document publishes no response body for that call.
 */
const action: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by id (DELETE /api/public/webhooks/DeleteWebhook).",
  idempotent: true,
  params: [webhookIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    const status = await new HeyReachClient(ctx).status("/webhooks/DeleteWebhook", {
      method: "DELETE",
      query: { webhookId: input.webhookId },
    });
    return { status };
  },
};

export default action;
