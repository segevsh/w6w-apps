import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireText } from "../lib/client.ts";

/** Remove a webhook. Wraps `DELETE /webhooks/v1/unsubscribe`; the id travels in a JSON body `{id}`. */
const action: ActionDefinition = {
  key: "unsubscribe-webhook",
  type: "perform",
  idempotent: true,
  resource: "webhook",
  title: "Unsubscribe from a webhook",
  description: "Remove a webhook subscription by its id.",
  params: [{ key: "webhookId", label: "Webhook ID", type: "string", required: true }],
  output: [{ key: "ok", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new LodgifyClient(ctx).command("/webhooks/v1/unsubscribe", {
      method: "DELETE",
      body: { id: requireText(p.webhookId, "webhookId") },
    });
  },
};

export default action;
