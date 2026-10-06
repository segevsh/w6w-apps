import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";

const userGetMany: ActionDefinition<Record<string, never>> = {
  key: "user-get-many",
  type: "read",
  resource: "user",
  title: "List Active Users",
  description:
    "List the active users of the account — use it to find an owner id for other actions.",
  params: [],
  output: [{
    key: "users",
    type: "array",
    label: "Users (id, firstName, lastName, email, Role, …)",
  }],

  async execute(_input, ctx) {
    const data = await new SalesmateClient(ctx).request<unknown[]>("/core/v4/users", {
      query: { status: "active" },
    });
    return { users: data ?? [] };
  },
};

export default userGetMany;
