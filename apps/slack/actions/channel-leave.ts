import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

const channelLeave: ActionDefinition<Input> = {
  key: "channel-leave",
  type: "perform",
  resource: "channel",
  title: "Leave Channel",
  description: "Leaves a channel (conversations.leave).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  output: [
    { key: "ok", type: "boolean", label: "Succeeded" },
    { key: "not_in_channel", type: "boolean", label: "Caller was not in the channel" },
  ],

  execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.leave", {
      method: "POST",
      body: { channel: input.channelId },
    });
  },
};

export default channelLeave;
