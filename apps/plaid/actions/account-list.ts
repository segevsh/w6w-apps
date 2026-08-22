import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM } from "../lib/params.ts";

/**
 * `POST /accounts/get` — the accounts on an Item, with cached balances.
 *
 * The cheap read. It answers from Plaid's cache, so it is fast, free of the
 * bank's rate limits, and **may be hours out of date**. That is the right
 * trade for "what accounts does this person have" and the wrong one for "can
 * this payment clear" — `balance-get` forces a live refresh for that.
 *
 * `mask` is the last few digits, which is what a user recognises; `account_id`
 * is Plaid's own and is what everything else here takes. The `type` and
 * `subtype` pair distinguishes a chequing account from a credit card from a
 * 401(k), which matters because the balance fields mean different things for
 * each — a credit card's `available` is remaining credit, not money.
 */
const action: ActionDefinition = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List accounts",
  description:
    "The Item's accounts with CACHED balances — fast and possibly hours stale. Use Get Balance " +
    "when the number has to be current.",
  params: [ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM],
  output: [
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "item", type: "object", label: "Item" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");
    const accountIds = csv(p.accountIds);

    return await new PlaidClient(ctx).request(
      "/accounts/get",
      compact({
        access_token: accessToken,
        options: accountIds ? { account_ids: accountIds } : undefined,
      }),
    );
  },
};

export default action;
