import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient } from "../lib/client.ts";

/**
 * GET /users/me — the user the connected credential belongs to. Its `resource.uri`
 * and `resource.current_organization` are what most other calls take as the
 * `user` / `organization` parameter, so this is usually the first step.
 */
const userGetCurrent: ActionDefinition<Record<string, never>> = {
  key: "user-get-current",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the user associated with this connection (GET /users/me).",
  params: [],
  output: [
    { key: "resource", type: "object", label: "User" },
  ],

  execute(_input, ctx) {
    return new CalendlyClient(ctx).request("/users/me");
  },
};

export default userGetCurrent;
