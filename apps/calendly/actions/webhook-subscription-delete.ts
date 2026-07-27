import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient, uuidOf } from "../lib/client.ts";

interface Input {
  webhook: string;
}

/**
 * DELETE /webhook_subscriptions/{uuid} — remove a webhook by URI or UUID. Returns
 * 204 No Content, surfaced here as an empty object.
 */
const webhookSubscriptionDelete: ActionDefinition<Input> = {
  key: "webhook-subscription-delete",
  type: "perform",
  resource: "webhook-subscription",
  title: "Delete Webhook Subscription",
  description:
    "Delete a webhook subscription by URI or UUID (DELETE /webhook_subscriptions/{uuid}).",
  idempotent: true,
  params: [
    {
      key: "webhook",
      label: "Webhook URI or UUID",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/webhook_subscriptions/FFFF or just FFFF.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new CalendlyClient(ctx).request(
      `/webhook_subscriptions/${encodeURIComponent(uuidOf(input.webhook))}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default webhookSubscriptionDelete;
