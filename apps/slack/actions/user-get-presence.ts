import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  user: string;
}

const userGetPresence: ActionDefinition<Input> = {
  key: "user-get-presence",
  type: "read",
  resource: "user",
  title: "Get User Presence",
  description: "Reads a user's presence status (users.getPresence).",
  params: [
    { key: "user", label: "User ID", type: "string", required: true },
  ],

  output: [
    { key: "ok", type: "boolean", label: "Succeeded" },
    { key: "presence", type: "string", label: "Presence (active or away)" },
    { key: "online", type: "boolean", label: "Connected" },
    { key: "auto_away", type: "boolean", label: "Auto-away" },
    { key: "manual_away", type: "boolean", label: "Manually away" },
    { key: "connection_count", type: "number", label: "Connection count" },
    { key: "last_activity", type: "number", label: "Last activity (unix seconds)" },
  ],

  execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/users.getPresence", { query: { user: input.user } });
  },
};

export default userGetPresence;
