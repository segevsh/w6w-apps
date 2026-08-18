import type { ActionDefinition } from "@w6w/types";
import { GustoClient } from "../lib/client.ts";

/**
 * `GET /v1/token_info` — what this access token actually reaches.
 *
 * The first call to make on a new connection, and the only one that needs
 * neither a company id nor any particular permission. It reports the token's
 * resource — the company or partner it is scoped to — which is how a workflow
 * discovers the company id that every other action needs, and how an
 * administrator with several companies finds out which ones this token covers.
 *
 * It is also this app's connection test, for the same reason: a read of a
 * business resource would report a *missing permission* as a broken connection,
 * while this cannot.
 */
const action: ActionDefinition = {
  key: "token-info",
  type: "read",
  resource: "account",
  title: "Get token info",
  description:
    "What this token is scoped to, and which companies it reaches — the call that answers " +
    "'which company id do I use', and the only one needing no permission.",
  params: [],
  output: [
    { key: "resource", type: "object", label: "Token resource" },
    { key: "scope", type: "string", label: "Scope" },
    { key: "companies", type: "array", label: "Companies" },
  ],

  async execute(_input, ctx) {
    return await new GustoClient(ctx).request("/v1/token_info");
  },
};

export default action;
