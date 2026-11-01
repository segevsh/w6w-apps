import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  name: string;
  visibility?: "public" | "private";
}

const channelCreate: ActionDefinition<Input> = {
  key: "channel-create",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Creates a new channel (conversations.create). Names starting with # are cleaned.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      default: "public",
      options: [
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
      ],
    },
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
    const name = input.name.startsWith("#") ? input.name.slice(1) : input.name;
    const res = await client.request<{ channel?: unknown }>("/conversations.create", {
      method: "POST",
      body: { name, is_private: input.visibility === "private" },
    });
    return res.channel ?? res;
  },
};

export default channelCreate;
