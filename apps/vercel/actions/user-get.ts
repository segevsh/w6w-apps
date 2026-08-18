import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";

/**
 * `GET /v2/user` — verified against Vercel's OpenAPI document (`getAuthUser`).
 * Vercel's whoami: it takes no parameters at all, not even a team scope, and
 * is the same probe both auth methods' `test` hooks use.
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get the authenticated user",
  description: "Retrieve the account this connection authenticates as.",
  params: [],
  output: [{ key: "user", type: "object", label: "User" }],

  async execute(_input, ctx) {
    // No team scope: the endpoint declares no `teamId` parameter.
    const client = new VercelClient(ctx);
    ctx.log("info", "getting the Vercel user");
    return await client.request("/v2/user");
  },
};

export default action;
