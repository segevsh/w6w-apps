import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient } from "../lib/client.ts";

const userMe: ActionDefinition<Record<string, never>> = {
  key: "user-me",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "The Egnyte user the connection's access token belongs to.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(_input, ctx) {
    return new EgnyteClient(ctx).request("/v1/userinfo");
  },
};

export default userMe;
