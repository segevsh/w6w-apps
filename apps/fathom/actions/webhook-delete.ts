import type { ActionDefinition } from "@w6w/types";
import { FathomClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
}

/**
 * `DELETE /webhooks/{id}` — remove a webhook subscription. Answers **204** with
 * no body, so this action reports the id it removed.
 *
 * Marked idempotent: deleting the same webhook twice leaves the account in the
 * identical state (the second call answers 404 rather than removing anything
 * else), so a retry after an ambiguous failure is safe.
 *
 * Fathom publishes no list-webhooks endpoint — ids come from Create Webhook's
 * response or from the API Access section of Fathom's settings, where
 * API-created webhooks also appear.
 */
const webhookDelete: ActionDefinition<Input, { id: string; deleted: boolean }> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description: "Delete a webhook subscription by ID.",
  idempotent: true,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "The `id` returned by Create Webhook.",
      placeholder: "ikEoQ4bVoq4JYUmc",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted webhook ID" },
    { key: "deleted", type: "boolean", label: "Always true on success" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Fathom webhook", { webhookId: input.webhookId });
    await new FathomClient(ctx).request(`/webhooks/${encodeURIComponent(input.webhookId)}`, {
      method: "DELETE",
    });
    return { id: input.webhookId, deleted: true };
  },
};

export default webhookDelete;
