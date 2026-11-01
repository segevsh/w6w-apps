import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  email: string;
}

const userLookupByEmail: ActionDefinition<Input> = {
  key: "user-lookup-by-email",
  type: "read",
  resource: "user",
  title: "Lookup User by Email",
  description: "Finds a user by their registered email address (users.lookupByEmail).",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],

  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "team_id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Username" },
    { key: "real_name", type: "string", label: "Real name" },
    { key: "deleted", type: "boolean", label: "Is deactivated" },
    { key: "is_admin", type: "boolean", label: "Is admin" },
    { key: "is_bot", type: "boolean", label: "Is bot" },
    { key: "tz", type: "string", label: "Time zone" },
    { key: "profile.display_name", type: "string", label: "Display name" },
    { key: "profile.email", type: "string", label: "Email" },
    { key: "profile.title", type: "string", label: "Title" },
    { key: "profile.status_text", type: "string", label: "Status text" },
    { key: "profile.status_emoji", type: "string", label: "Status emoji" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ user?: unknown }>("/users.lookupByEmail", {
      query: { email: input.email },
    });
    return res.user ?? res;
  },
};

export default userLookupByEmail;
