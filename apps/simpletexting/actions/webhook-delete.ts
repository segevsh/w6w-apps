import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

/**
 * `DELETE /api/webhooks/{webhookId}` — "Delete a Webhook".
 *
 * Answers `204` with no body: "Success. Webhook was deleted."
 *
 * Idempotent in the sense the runtime cares about — the subscription is gone
 * after one call and after five — which matters more here than on the other
 * deletes in this app: an over-eager retry costs nothing, while a webhook left
 * alive after a workflow meant to retire it keeps POSTing to a URL that may no
 * longer exist. The document lists only `204` for this path, so a repeat is not
 * documented; a repeat failing is worth seeing anyway, because it usually means
 * the ID was wrong rather than that the work was already done.
 */
interface Input {
  webhookId: string;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook by its hexadecimal ID.",
  idempotent: true,
  params: [webhookIdParam],
  output: [
    { key: "webhookId", type: "string", label: "Webhook deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new SimpleTextingClient(ctx).status(
      `/api/webhooks/${encodePathSegment(input.webhookId)}`,
      { method: "DELETE" },
    );
    ctx.log("info", "deleted a SimpleTexting webhook", { status });
    return { webhookId: input.webhookId, status };
  },
};

export default webhookDelete;
