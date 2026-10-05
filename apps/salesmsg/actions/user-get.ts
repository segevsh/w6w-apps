import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /user` — "Get Current User" (scope `users:read`). The caller's own profile: name, email,
 * default team and inbox ids. The `team` and `user` ids it carries are what `message-send` and the
 * conversation actions address.
 */
type Input = Record<string, never>;

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the profile of the user the token belongs to.",
  params: [],
  output: [{ key: "response", type: "object", label: "User profile" }],

  execute(_input, ctx) {
    return new SalesmsgClient(ctx).json("/user");
  },
};

export default userGet;
