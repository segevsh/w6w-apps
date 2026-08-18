import type { ActionDefinition } from "@w6w/types";
import { SnykClient } from "../lib/client.ts";

/**
 * `GET /self` — verified against Snyk's own API document (`getSelf`).
 *
 * Snyk's whoami: it takes no org, group or tenant id, which is why both the
 * auth `test` hook and the `api-version` health check use it as their probe.
 */
const action: ActionDefinition = {
  key: "self-get",
  type: "read",
  resource: "user",
  title: "Get the current user",
  description: "Retrieve the account this connection authenticates as.",
  params: [],
  output: [
    { key: "data", type: "object", label: "User" },
    { key: "jsonapi", type: "object", label: "JSON:API metadata" },
    { key: "links", type: "object", label: "Links" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting the Snyk user");
    return await new SnykClient(ctx).request("/self");
  },
};

export default action;
