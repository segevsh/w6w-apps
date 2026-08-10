import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * `GET /v1/me` — who this Connection is.
 *
 * Returns the user the User API Key was minted against. The spec documents
 * `me_attributes` as exactly four fields: `initials`, `name`, `email` and
 * `role_level` (`OWNER`, `ADMINISTRATOR`, …). Nothing credential-shaped is in
 * that schema, which is why the auth hook is willing to use this same endpoint
 * as its liveness probe — see `auth/client-credentials.ts` for the reasoning
 * and for the precedents (Follow Up Boss, Mailjet) that make a `/me` route
 * worth checking before trusting.
 *
 * `role_level` is the useful part in a workflow: it is the cheapest way to tell
 * whether the key in play is an owner key or a restricted one, before another
 * action finds out the hard way with a 403.
 *
 * Takes no parameters, so it is safe for a host to invoke with `{}`.
 */
const meGet: ActionDefinition<Record<string, never>> = {
  key: "me-get",
  type: "read",
  resource: "me",
  title: "Get Current User",
  description:
    "Return the Kajabi user this connection's API key belongs to — name, email and role level.",
  params: [],
  output: resourceOutput,

  execute(_input, ctx) {
    return new KajabiClient(ctx).request("/me");
  },
};

export default meGet;
