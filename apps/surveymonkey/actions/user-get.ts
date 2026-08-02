import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

/**
 * GET /users/me — the authenticated user's account (name, email, plan,
 * granted OAuth scopes). Needs no resource scope beyond `users_read`.
 */
const userGet: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Retrieve the authenticated user's account details.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "account_type", type: "string", label: "Account type" },
  ],

  execute(_input, ctx) {
    return new SurveyMonkeyClient(ctx).request("/users/me");
  },
};

export default userGet;
