import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, RocketChatClient } from "../lib/client.ts";

interface Input {
  name: string;
  members?: string;
  readOnly?: boolean;
  excludeSelf?: boolean;
  customFields?: unknown;
}

const createGroup: ActionDefinition<Input> = {
  key: "create-group",
  type: "perform",
  resource: "group",
  title: "Create Private Group",
  description: "Create a private group (`POST /groups.create`). Needs the `create-p` permission.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "members",
      label: "Members",
      type: "string",
      placeholder: "alice,bob",
      hint: "Comma-separated usernames to add when the group is created.",
    },
    { key: "readOnly", label: "Read only", type: "boolean", default: false },
    {
      key: "excludeSelf",
      label: "Exclude self",
      type: "boolean",
      hint: "Do not add the connected user as a member.",
    },
    { key: "customFields", label: "Custom fields", type: "json" },
  ],
  output: [
    { key: "group", type: "object", label: "The new private group" },
    { key: "group._id", type: "string", label: "Group ID" },
  ],

  execute(input, ctx) {
    const members = (input.members ?? "").split(",").map((m) => m.trim()).filter(Boolean);
    return new RocketChatClient(ctx).request("/groups.create", {
      method: "POST",
      body: compact({
        name: input.name,
        members: members.length ? members : undefined,
        readOnly: input.readOnly,
        excludeSelf: input.excludeSelf,
        customFields: jsonValue(input.customFields, "customFields"),
      }),
    });
  },
};

export default createGroup;
