import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";

type Input = Record<string, never>;

const getCurrentUser: ActionDefinition<Input> = {
  key: "get-current-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the Help Scout user this connection authenticates as.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
  ],

  execute(_input, ctx) {
    return new HelpScoutClient(ctx).request("/users/me");
  },
};

export default getCurrentUser;
