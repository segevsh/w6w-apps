import type { ActionDefinition } from "@w6w/types";
import { OktaClient } from "../lib/client.ts";

const userGet: ActionDefinition<{ userId: string }> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a user by id, login, or login shortname (for org-assigned logins).",
  params: [
    {
      key: "userId",
      label: "User ID or login",
      type: "string",
      required: true,
      placeholder: "00u1abcd2345EfGHIjk6",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "profile.login", type: "string", label: "Login" },
    { key: "profile.email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new OktaClient(ctx).request(`/users/${encodeURIComponent(input.userId)}`);
  },
};

export default userGet;
