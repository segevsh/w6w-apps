import type { ActionDefinition } from "@w6w/types";
import { GotifyClient } from "../lib/client.ts";

/**
 * `GET /current/user` — verified against Gotify's OpenAPI document
 * (`currentUser`). The same call this app's Auth `test`/`afterConnect` hooks
 * use, exposed as an action for a workflow that wants to confirm which
 * account (and whether it is an admin) a connection belongs to.
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get current user",
  description: "The account the connection's client token belongs to.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "admin", type: "boolean", label: "Admin" },
  ],

  async execute(_input, ctx) {
    return await new GotifyClient(ctx).request("/current/user");
  },
};

export default action;
