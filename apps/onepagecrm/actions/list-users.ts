import type { ActionDefinition } from "@w6w/types";
import { OnePageClient } from "../lib/client.ts";

/** `GET /users` — The account's users with name, email and role (unpaginated); use the ids as owners and assignees. */
const listUsers: ActionDefinition<Record<string, never>> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "The account's users with name, email and role (unpaginated); use the ids as owners and assignees.",
  params: [],
  output: [{ key: "users", type: "array", label: "Users ({user})" }],

  async execute(_input, ctx) {
    const data = await new OnePageClient(ctx).data("/users");
    return { users: Array.isArray(data) ? data : [] };
  },
};

export default listUsers;
