import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/**
 * `DELETE /v1/webhooks/{id}` — answers `204` with no body.
 *
 * `idempotent: true` — deletion converges. A replay finds the subscription
 * already gone and answers 404, which is the same end state, so a retry cannot
 * do additional damage.
 *
 * This is the only true delete in the whole API. There is no endpoint to delete
 * a subscriber, a segment or a custom field.
 */
const deleteWebhook: ActionDefinition<Input> = {
  key: "delete-webhook",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description:
    "Delete a webhook subscription. Answers 204 with no body. This is the only delete endpoint Flodesk publishes.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const path = `/webhooks/${FlodeskClient.seg(input.webhookId)}`;
    const res = await new FlodeskClient(ctx).send(path, { method: "DELETE" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Flodesk ${res.status} ${res.statusText} for DELETE ${path}: ${detail}`);
    }
    return { status: res.status };
  },
};

export default deleteWebhook;
