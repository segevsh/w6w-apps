import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId?: string;
  users?: string;
  returnIm?: boolean;
}

const channelOpen: ActionDefinition<Input> = {
  key: "channel-open",
  type: "perform",
  resource: "channel",
  title: "Open Channel",
  description: "Opens/resumes an IM or MPIM (conversations.open).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string" },
    {
      key: "users",
      label: "Users",
      type: "string",
      hint: "Comma-separated user IDs to open a DM/MPIM with.",
    },
    { key: "returnIm", label: "Return IM", type: "boolean" },
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
    const body: Record<string, unknown> = {};
    if (input.channelId) body.channel = input.channelId;
    if (input.users) body.users = input.users;
    if (input.returnIm !== undefined) body.return_im = input.returnIm;
    const res = await client.request<{ channel?: unknown }>("/conversations.open", {
      method: "POST",
      body,
    });
    return res.channel ?? res;
  },
};

export default channelOpen;
