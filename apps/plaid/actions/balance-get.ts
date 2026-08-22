import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM } from "../lib/params.ts";

/**
 * `POST /accounts/balance/get` — a **live** balance, fetched from the bank.
 *
 * The expensive read, and the difference from `account-list` is the whole
 * point: this one goes to the financial institution rather than to Plaid's
 * cache. It is slower, it is subject to the bank's own rate limits, and on some
 * institutions it can fail while cached data keeps working.
 *
 * Use it when the number has to be current — before initiating a payment,
 * checking whether a transfer will clear — and `account-list` for everything
 * else. Polling this on a schedule is the usual mistake: it is the one call in
 * this app that a bank can throttle.
 *
 * ## `available` and `current` are not the same number, and neither is "money"
 *
 * `current` includes pending transactions; `available` does not, and for a
 * **credit card** `available` is the remaining credit line rather than money
 * held. Comparing across account types without reading `type`/`subtype`
 * produces sums that look plausible and mean nothing.
 */
const action: ActionDefinition = {
  key: "balance-get",
  type: "read",
  resource: "account",
  title: "Get live balance",
  description:
    "Balances fetched from the bank rather than Plaid's cache — slower, rate limited by the " +
    "institution, and the only version safe to make a payment decision on.",
  params: [
    ACCESS_TOKEN_PARAM,
    ACCOUNT_IDS_PARAM,
    {
      key: "minLastUpdatedDatetime",
      label: "Require Data Newer Than",
      type: "datetime",
      default: "",
      advanced: true,
      hint: "For institutions that support it, forces a refresh if the cached balance is older " +
        "than this.",
    },
  ],
  output: [
    { key: "accounts", type: "array", label: "Accounts with live balances" },
    { key: "item", type: "object", label: "Item" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");
    const accountIds = csv(p.accountIds);
    const minUpdated = String(p.minLastUpdatedDatetime ?? "").trim();

    const options = compact({
      account_ids: accountIds,
      min_last_updated_datetime: minUpdated || undefined,
    });

    ctx.log("info", "fetching live Plaid balances — this call reaches the bank", {
      accounts: accountIds?.length,
    });
    return await new PlaidClient(ctx).request(
      "/accounts/balance/get",
      compact({
        access_token: accessToken,
        options: Object.keys(options).length ? options : undefined,
      }),
    );
  },
};

export default action;
