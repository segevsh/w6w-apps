import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, RocketChatClient } from "../lib/client.ts";

interface Input {
  name: string;
  members?: string;
  readOnly?: boolean;
  excludeSelf?: boolean;
  topic?: string;
  customFields?: unknown;
}

const createChannel: ActionDefinition<Input> = {
  key: "create-channel",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description:
    "Create a public channel (`POST /channels.create`). Needs the `create-c` permission.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "members",
      label: "Members",
      type: "string",
      placeholder: "alice,bob",
      hint: "Comma-separated usernames to add when the channel is created.",
    },
    { key: "readOnly", label: "Read only", type: "boolean", default: false },
    {
      key: "excludeSelf",
      label: "Exclude self",
      type: "boolean",
      hint: "Do not add the connected user as a member.",
    },
    { key: "topic", label: "Topic", type: "string" },
    { key: "customFields", label: "Custom fields", type: "json" },
  ],
  output: [
    { key: "channel", type: "object", label: "The new channel" },
    { key: "channel._id", type: "string", label: "Channel ID" },
  ],

  execute(input, ctx) {
    const members = (input.members ?? "").split(",").map((m) => m.trim()).filter(Boolean);
    return new RocketChatClient(ctx).request("/channels.create", {
      method: "POST",
      body: compact({
        name: input.name,
        members: members.length ? members : undefined,
        readOnly: input.readOnly,
        excludeSelf: input.excludeSelf,
        customFields: jsonValue(input.customFields, "customFields"),
        extraData: input.topic ? { topic: input.topic } : undefined,
      }),
    });
  },
};

export default createChannel;
