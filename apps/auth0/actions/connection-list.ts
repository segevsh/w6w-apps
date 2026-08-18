import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, csv } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/connections` — the ways people can sign in.
 *
 * A connection is an identity source: a username-and-password database, Google,
 * a customer's SAML IdP, a passwordless email link. Everything else in Auth0
 * hangs off this — a user *belongs to* a connection, their id is prefixed by
 * it, and only a database connection can have users created in it.
 *
 * `strategy` is the field that says which kind: `auth0` is the built-in
 * database (the only writable one), `google-oauth2`, `samlp`, `oidc`, `email`
 * and so on are federated or passwordless.
 *
 * `enabled_clients` decides which applications may use each connection, which
 * is the usual reason a login "does not work" while everything looks correctly
 * configured.
 */
const action: ActionDefinition = {
  key: "connection-list",
  type: "read",
  resource: "connection",
  title: "List connections",
  description:
    "The tenant's identity sources and their strategies. Only an `auth0`-strategy connection " +
    "can have users created in it.",
  params: [
    {
      key: "strategy",
      label: "Strategy",
      type: "string",
      default: "",
      placeholder: "auth0,samlp",
      hint: "Comma-separated strategies to filter by — `auth0` for the writable databases.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "connections", type: "array", label: "Connections" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const strategies = csv(p.strategy);

    const { items, total } = await new Auth0Client(ctx).requestAll(
      "/connections",
      "connections",
      { query: { strategy: strategies?.join(",") } },
      returnAll ? Infinity : limit,
    );
    return { connections: items, total };
  },
};

export default action;
