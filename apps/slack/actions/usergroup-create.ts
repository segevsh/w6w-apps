import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  name: string;
  handle?: string;
  description?: string;
  channels?: string;
  includeCount?: boolean;
}

const userGroupCreate: ActionDefinition<Input> = {
  key: "usergroup-create",
  type: "perform",
  resource: "usergroup",
  title: "Create User Group",
  description: "Creates a new user group (usergroups.create).",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "handle", label: "Handle", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "channels",
      label: "Default channels",
      type: "string",
      hint: "Comma-separated channel IDs.",
    },
    { key: "includeCount", label: "Include count", type: "boolean" },
  ],

  output: [
    { key: "id", type: "string", label: "User group ID" },
    { key: "team_id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "handle", type: "string", label: "Handle" },
    { key: "description", type: "string", label: "Description" },
    { key: "date_create", type: "number", label: "Created (unix seconds)" },
    { key: "date_update", type: "number", label: "Updated (unix seconds)" },
    { key: "user_count", type: "number", label: "Member count" },
    { key: "users", type: "array", label: "Member user IDs" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = { name: input.name };
    if (input.handle) body.handle = input.handle;
    if (input.description) body.description = input.description;
    if (input.channels) body.channels = input.channels;
    if (input.includeCount !== undefined) body.include_count = input.includeCount;
    const res = await client.request<{ usergroup?: unknown }>("/usergroups.create", {
      method: "POST",
      body,
    });
    return res.usergroup ?? res;
  },
};

export default userGroupCreate;
