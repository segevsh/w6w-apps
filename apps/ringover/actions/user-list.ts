import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List the team users with their phone numbers and plan. Without Monitoring on the key only the key owner is returned.",
  params: [],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
  ],

  async execute(_input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/users");
    return { users: listOf(body, "list"), count: numberOf(body, "list_count") };
  },
};

export default userList;
