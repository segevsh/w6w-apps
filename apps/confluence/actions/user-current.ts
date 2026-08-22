import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";

/**
 * `GET /wiki/rest/api/user/current` — the second and last v1 call in this app.
 *
 * v2's only user endpoint is `POST /users-bulk`, which resolves account IDs you
 * already have; it cannot answer "who am I". Both auth methods' `test` hooks
 * use this same endpoint, so it is also the cheapest way for a workflow to
 * confirm which account a Connection is acting as.
 */
const action: ActionDefinition = {
  key: "user-current",
  type: "read",
  resource: "user",
  title: "Get the current user",
  description: "Retrieve the account this connection authenticates as.",
  params: [],
  output: [
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "accountType", type: "string", label: "Account type" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "email", type: "string", label: "Email" },
    { key: "publicName", type: "string", label: "Public name" },
    { key: "profilePicture", type: "object", label: "Profile picture" },
    { key: "_links", type: "object", label: "Links" },
  ],

  async execute(_input, ctx) {
    const client = new ConfluenceClient(ctx);
    ctx.log("info", "getting the current Confluence user");
    return await client.requestV1("/user/current");
  },
};

export default action;
