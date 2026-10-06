import type { ActionDefinition } from "@w6w/types";
import { compact, TimelinesClient } from "../lib/client.ts";

interface Input {
  eventType: string;
  url: string;
  enabled?: boolean;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  idempotent: false,
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Subscribe an HTTPS URL to a TimelinesAI event (POST /webhooks). Your endpoint must answer 2xx within 5 seconds.",
  params: [
    {
      "key": "eventType",
      "label": "Event",
      "type": "select",
      "required": true,
      "hint": "The event that fires this webhook.",
      "options": [
        {
          "value": "message:new",
          "label": "message:new",
        },
        {
          "value": "message:sent:new",
          "label": "message:sent:new",
        },
        {
          "value": "message:received:new",
          "label": "message:received:new",
        },
        {
          "value": "whatsapp:account:connected",
          "label": "whatsapp:account:connected",
        },
        {
          "value": "whatsapp:account:disconnected",
          "label": "whatsapp:account:disconnected",
        },
        {
          "value": "whatsapp:account:suspended",
          "label": "whatsapp:account:suspended",
        },
        {
          "value": "whatsapp:account:resumed",
          "label": "whatsapp:account:resumed",
        },
        {
          "value": "chat:new",
          "label": "chat:new",
        },
        {
          "value": "chat:incoming:new",
          "label": "chat:incoming:new",
        },
        {
          "value": "chat:outgoing:new",
          "label": "chat:outgoing:new",
        },
        {
          "value": "chat:responsible:assigned",
          "label": "chat:responsible:assigned",
        },
        {
          "value": "chat:responsible:unassigned",
          "label": "chat:responsible:unassigned",
        },
        {
          "value": "call:incoming:missed",
          "label": "call:incoming:missed",
        },
        {
          "value": "call:incoming:ended",
          "label": "call:incoming:ended",
        },
        {
          "value": "call:outgoing:ended",
          "label": "call:outgoing:ended",
        },
        {
          "value": "message:reaction",
          "label": "message:reaction",
        },
        {
          "value": "waba:message:received",
          "label": "waba:message:received",
        },
        {
          "value": "waba:message:delivered",
          "label": "waba:message:delivered",
        },
        {
          "value": "waba:message:failed",
          "label": "waba:message:failed",
        },
        {
          "value": "waba:message:read",
          "label": "waba:message:read",
        },
        {
          "value": "waba:chat:incoming",
          "label": "waba:chat:incoming",
        },
        {
          "value": "waba:chat:outgoing",
          "label": "waba:chat:outgoing",
        },
        {
          "value": "waba:chat:assigned",
          "label": "waba:chat:assigned",
        },
        {
          "value": "waba:chat:unassigned",
          "label": "waba:chat:unassigned",
        },
        {
          "value": "waba:chat:closed",
          "label": "waba:chat:closed",
        },
        {
          "value": "waba:chat:reopened",
          "label": "waba:chat:reopened",
        },
        {
          "value": "waba:account:active",
          "label": "waba:account:active",
        },
        {
          "value": "waba:account:disabled",
          "label": "waba:account:disabled",
        },
        {
          "value": "waba:account:disconnected",
          "label": "waba:account:disconnected",
        },
        {
          "value": "waba:template:approved",
          "label": "waba:template:approved",
        },
        {
          "value": "waba:template:rejected",
          "label": "waba:template:rejected",
        },
        {
          "value": "waba:template:disabled",
          "label": "waba:template:disabled",
        },
      ],
    },
    {
      "key": "url",
      "label": "URL",
      "type": "string",
      "required": true,
      "hint": "A public HTTPS endpoint.",
    },
    {
      "key": "enabled",
      "label": "Enabled",
      "type": "boolean",
      "hint": "Defaults to enabled when unset.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The webhook: id, event_type, url, enabled, errors_counter",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).post(
      "/webhooks",
      compact({
        event_type: input.eventType,
        url: input.url,
        enabled: input.enabled,
      }),
    );
  },
};

export default webhookCreate;
