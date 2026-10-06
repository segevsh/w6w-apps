import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  eventName: string;
  hookUrl: string;
  onNumber: string;
  timePeriod?: string;
  toGroupUuid?: string;
}

const webhookSubscribe: ActionDefinition<Input> = {
  key: "webhook-subscribe",
  type: "perform",
  idempotent: false,
  resource: "webhook",
  title: "Subscribe Webhook",
  description:
    "Subscribe a URL to a 2Chat event (POST /webhooks/subscribe/{event-name}) for a connected " +
    "WhatsApp number — WhatsApp Web (`whatsapp.*`) or WABA (`whatsapp.waba.*`) events. Not " +
    "idempotent: each call creates another subscription.",
  params: [
    {
      key: "eventName",
      label: "Event name",
      type: "string",
      required: true,
      hint:
        "e.g. whatsapp.message.received, whatsapp.message.sent, whatsapp.conversation.new, whatsapp.waba.message.received, whatsapp.waba.template.status.updated, whatsapp.number.status.",
    },
    {
      key: "hookUrl",
      label: "Webhook URL",
      type: "string",
      required: true,
      hint: "A publicly reachable URL 2Chat will POST to.",
    },
    {
      key: "onNumber",
      label: "Connected number",
      type: "string",
      required: true,
      hint: "The number you connected to 2Chat, in international format. It must be connected.",
    },
    {
      key: "timePeriod",
      label: "New-conversation window",
      type: "select",
      options: [
        { "value": "all-time", "label": "all-time" },
        { "value": "hour", "label": "hour" },
        { "value": "day", "label": "day" },
        { "value": "week", "label": "week" },
        { "value": "month", "label": "month" },
        { "value": "year", "label": "year" },
      ],
      hint: "Only for whatsapp.conversation.new. Defaults to all-time.",
    },
    {
      key: "toGroupUuid",
      label: "Group UUID",
      type: "string",
      hint: "Only for group events: restrict to one group. Defaults to any group.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The subscription: uuid, event_name, channel_uuid, hook_url, hook_params",
    },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.post(
      `/webhooks/subscribe/${seg(input.eventName)}`,
      compact({
        hook_url: input.hookUrl,
        on_number: input.onNumber,
        time_period: input.timePeriod,
        to_group_uuid: input.toGroupUuid,
      }),
    );
  },
};

export default webhookSubscribe;
