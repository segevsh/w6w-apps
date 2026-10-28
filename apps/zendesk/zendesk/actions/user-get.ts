import type { ActionDefinition } from "@w6w/types";
import { ZendeskClient } from "../lib/client.ts";

const userGet: ActionDefinition<{ userId: number }> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a user by id.",
  params: [{ key: "userId", label: "User ID", type: "number", required: true }],
  output: [
    { key: "user.id", type: "number", label: "User ID" },
    { key: "user.name", type: "string", label: "Name" },
    { key: "user.email", type: "string", label: "Email" },
    { key: "user.role", type: "string", label: "Role" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/users/${input.userId}.json`);
  },
};

export default userGet;
