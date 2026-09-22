import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";

/**
 * `GET /users` — the organisation's users, unpaginated.
 *
 * The response is the full `User` schema, cost and billable rates included.
 * Both are returned: this is an internal agency system and the caller already
 * holds a token that can read logged time and invoices, so there is no honest
 * way to claim the rates are a secret — but note that they are per-user
 * defaults, and the rate actually charged lives on the job item.
 */
const usersList: ActionDefinition<Record<string, never>> = {
  key: "users-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List every user in the organisation, with their branch, role, status and default rates. " +
    "Unpaginated.",
  params: [],
  output: [{ key: "users", type: "array", label: "Users" }],

  async execute(_input, ctx) {
    const users = await new StreamtimeClient(ctx).request<unknown[]>("/users");
    return { users: users ?? [] };
  },
};

export default usersList;
