import type { ActionDefinition } from "@w6w/types";
import { RocketChatClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  username?: string;
  email?: string;
}

// The spec: "Provide exactly one of these parameters per request." `fields` was removed in 7.0.0.
const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by user ID, username or email (`GET /users.info`). Provide " +
    "exactly one. What comes back is limited to what the connected user may see.",
  params: [
    { key: "userId", label: "User ID", type: "string" },
    { key: "username", label: "Username", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Lookup by email needs Rocket.Chat 8.4+ and the permission to view it.",
    },
  ],
  output: [{ key: "user", type: "object", label: "The user" }],

  execute(input, ctx) {
    const given = [input.userId, input.username, input.email].filter(Boolean);
    if (given.length !== 1) {
      throw new Error("Provide exactly one of User ID, Username or Email");
    }
    return new RocketChatClient(ctx).request("/users.info", {
      query: { userId: input.userId, username: input.username, email: input.email },
    });
  },
};

export default getUser;
