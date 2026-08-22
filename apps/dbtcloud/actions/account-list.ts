import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/` — the accounts this token can reach.
 *
 * Usually one, which is why the connection records its id at connect time and
 * no other action asks for it. This exists for the two cases where that is not
 * enough: a token that reaches several accounts, and confirming *which* account
 * a connection is actually pointed at when a job id mysteriously 404s.
 *
 * It is also the cheapest call in the API, which is why the connection test
 * uses it.
 */
const action: ActionDefinition = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List accounts",
  description:
    "The accounts this token can reach — usually one. Useful for confirming which account a " +
    "connection points at when a job id 404s.",
  params: [],
  output: [
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "count", type: "number", label: "Accounts reachable" },
  ],

  async execute(_input, ctx) {
    const accounts = await new DbtCloudClient(ctx).request<unknown[]>("/api/v2/accounts/");
    const list = Array.isArray(accounts) ? accounts : [];
    return { accounts: list, count: list.length };
  },
};

export default action;
