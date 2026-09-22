import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";

/**
 * `GET /me` — who is this token connected as?
 *
 * The only endpoint in this app that needs no scope at all: it reports the
 * `user` the grant belongs to, the `company` it is scoped to (with the
 * company's own `accounting_logic` chart-of-accounts convention) and the
 * `scopes` the token actually holds.
 *
 * That `scopes` array is why this is worth having as an action and not just as
 * the auth probe: a workflow that hits a 403 can ask this endpoint what the
 * grant covers instead of guessing, and a setup step can record which company an
 * OAuth connection landed on. The response never contains the token.
 */
const getMe: ActionDefinition<Record<string, never>> = {
  key: "get-me",
  type: "read",
  resource: "profile",
  title: "Get Current User and Company",
  description:
    "Report the user, company and granted scopes for the current token (GET /me). Requires no " +
    "particular scope.",
  params: [],
  output: [
    { key: "user", type: "object", label: "User" },
    { key: "company", type: "object", label: "Company" },
    { key: "scopes", type: "array", label: "Granted scopes" },
  ],

  execute(_input, ctx) {
    return new PennylaneClient(ctx).request("/me");
  },
};

export default getMe;
