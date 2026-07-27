import type { ActionDefinition } from "@w6w/types";
import { GitLabClient } from "../lib/client.ts";

/**
 * Returns the account behind the connected credential — GitLab's `GET /user`.
 * Takes no parameters; the credential is the input.
 */
const userGetCurrent: ActionDefinition<Record<never, never>> = {
  key: "user-get-current",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the profile of the authenticated user.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "web_url", type: "string", label: "URL" },
  ],

  execute(_input, ctx) {
    return new GitLabClient(ctx).request(`/user`);
  },
};

export default userGetCurrent;
