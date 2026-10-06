import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /hooks/{hookId}` — Delete a webhook.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  hookId: number;
}

const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook.",
  idempotent: true,
  params: [
    {
      key: "hookId",
      label: "Webhook ID",
      type: "number",
      required: true,
      hint: "Numeric webhook id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/hooks/${encodeId(input.hookId)}`, { method: "DELETE" });
  },
};

export default webhookDelete;
