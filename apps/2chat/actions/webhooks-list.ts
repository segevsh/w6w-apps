import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  channelUuid?: string;
}

const webhooksList: ActionDefinition<Input> = {
  key: "webhooks-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the enabled webhook subscriptions on the account (GET /webhooks), or those of one channel " +
    "(GET /webhooks/channel/{channel-uuid}).",
  params: [
    {
      key: "channelUuid",
      label: "Channel UUID",
      type: "string",
      hint: "Optional. Restrict to one channel's webhooks.",
    },
  ],
  output: [
    {
      key: "webhooks",
      type: "array",
      label: "Subscriptions: uuid, event_name, channel_uuid, hook_url, hook_params",
    },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return input.channelUuid
      ? client.get(`/webhooks/channel/${seg(input.channelUuid)}`)
      : client.get("/webhooks");
  },
};

export default webhooksList;
