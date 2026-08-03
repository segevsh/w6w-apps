import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
  eventId: string;
}

/**
 * POST /webhooks/{webhookId}/events/{eventId} — redeliver one event.
 *
 * Responds 204 with no body. Not idempotent: each call is another delivery
 * attempt against the receiver, and the receiver may not be idempotent itself.
 */
const webhookEventRetry: ActionDefinition<Input, Record<string, unknown>> = {
  key: "webhook-event-retry",
  type: "perform",
  resource: "webhook-event",
  title: "Retry Webhook Event",
  description: "Redeliver a webhook event that previously failed.",
  // Each retry is a fresh POST to the subscriber — replaying it delivers again.
  idempotent: false,
  params: [
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Webhooks.",
    },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Webhook Events.",
    },
  ],
  output: [
    { key: "eventId", type: "string", label: "Retried event ID" },
    { key: "retried", type: "boolean", label: "Retry accepted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "retrying Tally webhook event", { eventId: input.eventId });
    await new TallyClient(ctx).request(
      `/webhooks/${encodeURIComponent(input.webhookId)}/events/${
        encodeURIComponent(input.eventId)
      }`,
      { method: "POST" },
    );
    return { eventId: input.eventId, retried: true };
  },
};

export default webhookEventRetry;
