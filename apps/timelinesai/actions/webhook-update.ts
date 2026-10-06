import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
  eventType?: string;
  url?: string;
  enabled?: boolean;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  idempotent: true,
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Change a webhook's event, URL or enabled flag; only supplied fields change (PUT /webhooks/{webhook_id}).",
  params: [
    {
      "key": "webhookId",
      "label": "Webhook ID",
      "type": "string",
      "required": true,
      "hint": "From List Webhooks or Create Webhook.",
    },
    {
      "key": "eventType",
      "label": "Event",
      "type": "select",
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
      "hint": "New endpoint.",
    },
    {
      "key": "enabled",
      "label": "Enabled",
      "type": "boolean",
      "hint": "Enable or disable delivery.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated webhook" },
  ],

  execute(input, ctx) {
    const body = compact({ event_type: input.eventType, url: input.url, enabled: input.enabled });
    if (Object.keys(body).length === 0) throw new Error("set at least one field to update");
    return new TimelinesClient(ctx).put(`/webhooks/${seg(input.webhookId)}`, body);
  },
};

export default webhookUpdate;
