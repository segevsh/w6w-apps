import type { ActionDefinition } from "@w6w/types";
import { PracticeBetterClient } from "../lib/client.ts";

/**
 * `GET /webhooks/subscription/event/types` — the valid webhook event types.
 *
 * Security: `[read]`. The document's summary: "Returns all webhook event types
 * supported by Practice Better, grouped by category."
 *
 * The response is a **bare array of groups** — `{name, eventTypes: [{label,
 * value}]}` — with no pagination envelope, so the action returns it verbatim and
 * declares the bare-array output key.
 *
 * This exists so a caller never has to guess what `create-webhook-subscription`'s
 * `eventTypes` accepts: the `value` of each entry in each group is the string
 * that goes in that field.
 */
const listWebhookEventTypes: ActionDefinition<Record<string, never>, unknown[]> = {
  key: "list-webhook-event-types",
  type: "read",
  resource: "webhook-subscription",
  title: "List Webhook Event Types",
  description:
    "List every webhook event type Practice Better supports, grouped by category — the valid " +
    "values for a subscription's `eventTypes`.",
  params: [],
  output: [{
    key: "[]",
    type: "array",
    label: "Event-type groups — a bare array, not an envelope",
  }],

  async execute(_input, ctx) {
    const groups = await new PracticeBetterClient(ctx).request<unknown[]>(
      "/webhooks/subscription/event/types",
    );
    return Array.isArray(groups) ? groups : [];
  },
};

export default listWebhookEventTypes;
