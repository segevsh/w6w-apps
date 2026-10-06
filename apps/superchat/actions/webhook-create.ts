import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

interface Input {
  targetUrl: string;
  eventTypes?: string[];
  filters?: unknown[];
}

/** Subscribe an HTTPS URL to Superchat events. The response carries the signing `secret` ONCE here; store it now, because every other read of the subscription is redacted by this app. */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook Subscription",
  description:
    "Subscribe an HTTPS URL to Superchat events. The response carries the signing `secret` ONCE here; store it now, because every other read of the subscription is redacted by this app.",
  idempotent: false,
  params: [
    {
      "key": "targetUrl",
      "label": "Target URL",
      "type": "string",
      "required": true,
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
    { "key": "secret", "type": "string", "label": "Signing secret (returned only by this action)" },
    { "key": "target_url", "type": "string", "label": "Target URL" },
  ],

  execute(input, ctx) {
    const events = input.eventTypes?.map((type) => ({
      type,
      ...(input.filters ? { filters: input.filters } : {}),
    }));
    return new SuperchatClient(ctx).request("/webhooks", {
      method: "POST",
      body: { target_url: input.targetUrl, ...(events ? { events } : {}) },
    });
  },
};

export default webhookCreate;
