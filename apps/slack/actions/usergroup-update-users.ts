import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  userGroupId: string;
  users: string;
  includeCount?: boolean;
}

const userGroupUpdateUsers: ActionDefinition<Input> = {
  key: "usergroup-update-users",
  type: "perform",
  resource: "usergroup",
  title: "Set User Group Members",
  description: "Replaces the user list of a user group (usergroups.users.update).",
  params: [
    { key: "userGroupId", label: "User group ID", type: "string", required: true },
    {
      key: "users",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated. Replaces the full membership list.",
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
    const body: Record<string, unknown> = {
      usergroup: input.userGroupId,
      users: input.users,
    };
    if (input.includeCount !== undefined) body.include_count = input.includeCount;
    const res = await client.request<{ usergroup?: unknown }>("/usergroups.users.update", {
      method: "POST",
      body,
    });
    return res.usergroup ?? res;
  },
};

export default userGroupUpdateUsers;
