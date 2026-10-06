import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";

interface Input {
  includeDeactivated?: boolean;
}

/** `GET /users` — documents `include_deactivated` only; no cursor parameter is documented. */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List the organization's users (support agents). Deactivated users are left out unless asked for.",
  params: [{ key: "includeDeactivated", label: "Include deactivated users", type: "boolean" }],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "hasNextPage", type: "boolean", label: "Whether Pylon reports more results" },
  ],

  async execute(input, ctx) {
    const { items, hasNextPage } = await new PylonClient(ctx).list("GET", "/users", {
      query: { include_deactivated: input.includeDeactivated },
    });
    return { users: items, hasNextPage };
  },
};

export default userList;
