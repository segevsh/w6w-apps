import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  purpose: string;
}

const channelSetPurpose: ActionDefinition<Input> = {
  key: "channel-set-purpose",
  type: "perform",
  resource: "channel",
  title: "Set Channel Purpose",
  description: "Sets the purpose (description) of a channel (conversations.setPurpose).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "purpose", label: "Purpose", type: "text", required: true },
  ],

  output: [
    { key: "id", type: "string", label: "Channel ID" },
    { key: "name", type: "string", label: "Channel name" },
    { key: "is_channel", type: "boolean", label: "Is a public channel" },
    { key: "is_private", type: "boolean", label: "Is private" },
    { key: "is_archived", type: "boolean", label: "Is archived" },
    { key: "is_member", type: "boolean", label: "Caller is a member" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
    { key: "creator", type: "string", label: "Creator user ID" },
    { key: "topic.value", type: "string", label: "Topic" },
    { key: "purpose.value", type: "string", label: "Purpose" },
    { key: "num_members", type: "number", label: "Member count" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ channel?: unknown }>("/conversations.setPurpose", {
      method: "POST",
      body: { channel: input.channelId, purpose: input.purpose },
    });
    return res.channel ?? res;
  },
};

export default channelSetPurpose;
