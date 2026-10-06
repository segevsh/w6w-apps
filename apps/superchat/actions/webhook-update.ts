import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";
import { redactWebhook } from "../lib/redact.ts";

interface Input {
  subscriptionId: string;
  targetUrl?: string;
  eventTypes?: string[];
  filters?: unknown[];
}

/** Replace a subscription's target URL and/or events (PUT). Events you leave out are not kept: pass the full list you want. The signing `secret` is redacted. */
const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook Subscription",
  description:
    "Replace a subscription's target URL and/or events (PUT). Events you leave out are not kept: pass the full list you want. The signing `secret` is redacted.",
  idempotent: true,
  params: [
    { "key": "subscriptionId", "label": "Subscription ID", "type": "string", "required": true },
    {
      "key": "targetUrl",
      "label": "Target URL",
      "type": "string",
      "hint": "HTTPS endpoint that receives deliveries. Superchat's own domains are refused.",
    },
    {
      "key": "eventTypes",
      "label": "Event types",
      "type": "multiselect",
      "hint": "Events to subscribe to.",
      "options": [
        { "value": "message_inbound", "label": "message_inbound" },
        { "value": "message_outbound", "label": "message_outbound" },
        { "value": "message_failed", "label": "message_failed" },
        { "value": "note_created", "label": "note_created" },
        { "value": "contact_created", "label": "contact_created" },
        { "value": "contact_updated", "label": "contact_updated" },
        { "value": "contact_deleted", "label": "contact_deleted" },
        { "value": "conversation_opened", "label": "conversation_opened" },
        { "value": "conversation_done", "label": "conversation_done" },
        { "value": "conversation_snoozed", "label": "conversation_snoozed" },
        { "value": "conversation_deleted", "label": "conversation_deleted" },
        { "value": "ai_call_completed", "label": "ai_call_completed" },
      ],
    },
    {
      "key": "filters",
      "label": "Filters",
      "type": "json",
      "hint":
        'Optional filters applied to every selected event, e.g. [{"type": "inbox", "ids": ["i_1"]}].',
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Subscription ID" },
    { "key": "target_url", "type": "string", "label": "Target URL" },
    { "key": "events", "type": "array", "label": "Events" },
  ],

  async execute(input, ctx) {
    const events = input.eventTypes?.map((type) => ({
      type,
      ...(input.filters ? { filters: input.filters } : {}),
    }));
    return redactWebhook(
      await new SuperchatClient(ctx).request(`/webhooks/${seg(input.subscriptionId)}`, {
        method: "PUT",
        body: {
          ...(input.targetUrl ? { target_url: input.targetUrl } : {}),
          ...(events ? { events } : {}),
        },
      }),
    );
  },
};

export default webhookUpdate;
