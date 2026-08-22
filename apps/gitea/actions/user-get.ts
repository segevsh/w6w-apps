import type { ActionDefinition } from "@w6w/types";
import { GiteaClient } from "../lib/client.ts";

/**
 * `GET /user` — verified against Gitea's Swagger document (`userGetCurrent`).
 *
 * Who this token is. Useful beyond curiosity on a self-hosted instance where
 * several connections may point at the same server with different tokens, and
 * "which account made this commit" has a real answer.
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get the authenticated user",
  description: "The account this connection's token belongs to.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User id" },
    { key: "login", type: "string", label: "Username" },
    { key: "full_name", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
    { key: "is_admin", type: "boolean", label: "Instance administrator" },
    { key: "created", type: "string", label: "Created" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting the Gitea user", {});
    return await new GiteaClient(ctx).request("/user");
  },
};

export default action;
