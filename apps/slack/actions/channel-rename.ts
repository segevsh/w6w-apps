import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  name: string;
}

const channelRename: ActionDefinition<Input> = {
  key: "channel-rename",
  type: "perform",
  resource: "channel",
  title: "Rename Channel",
  description: "Renames a channel (conversations.rename).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "name", label: "New name", type: "string", required: true },
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
    const res = await client.request<{ channel?: unknown }>("/conversations.rename", {
      method: "POST",
      body: { channel: input.channelId, name: input.name },
    });
    return res.channel ?? res;
  },
};

export default channelRename;
