import type { ActionDefinition } from "@w6w/types";
import { NewRelicClient } from "../lib/client.ts";

/**
 * `{ actor { accounts { id name } } }` — which accounts this key can reach.
 *
 * Nearly every other query needs an account id, and the key does not carry one:
 * a user key sees every account its user belongs to, which in a large
 * organisation is dozens. This is how to find out which, and it is the first
 * thing to run when a query returns nothing for an account that definitely has
 * data — the usual answer being that the id belongs to a different account than
 * the one being looked at in the UI.
 *
 * It also reports the region, because an account in the other data centre is
 * simply absent from this list rather than listed and empty.
 */
const action: ActionDefinition = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List accounts",
  description:
    "Accounts this key can reach. An account in the OTHER region is absent from this list " +
    "entirely rather than listed and empty.",
  params: [],
  output: [
    { key: "accounts", type: "array", label: "Accounts, with ids and names" },
    { key: "count", type: "number", label: "How many" },
    { key: "region", type: "string", label: "Which data centre this connection reads" },
    { key: "defaultAccountId", type: "number", label: "The connection's own default" },
  ],

  async execute(_input, ctx) {
    const client = new NewRelicClient(ctx);
    const data = await client.gql<{
      actor?: { accounts?: Array<{ id?: number; name?: string }> };
    }>("{ actor { accounts { id name } } }");

    const accounts = data?.actor?.accounts ?? [];
    let defaultAccountId: number | undefined;
    try {
      defaultAccountId = client.account(undefined);
    } catch {
      // No default recorded, which is a normal state rather than a failure.
    }

    return {
      accounts,
      count: accounts.length,
      region: client.region,
      defaultAccountId,
    };
  },
};

export default action;
