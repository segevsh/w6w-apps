import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  user: string;
  includeLocale?: boolean;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieves user profile information (users.info).",
  params: [
    { key: "user", label: "User ID", type: "string", required: true },
    { key: "includeLocale", label: "Include locale", type: "boolean" },
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
    const res = await client.request<{ user?: unknown }>("/users.info", {
      query: { user: input.user, include_locale: input.includeLocale },
    });
    return res.user ?? res;
  },
};

export default userGet;
