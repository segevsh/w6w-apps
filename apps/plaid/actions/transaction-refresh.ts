import type { ActionDefinition } from "@w6w/types";
import { PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM } from "../lib/params.ts";

/**
 * `POST /transactions/refresh` — ask Plaid to go and look now.
 *
 * Plaid refreshes an Item's transactions on its own schedule, typically a few
 * times a day. This forces an extra fetch from the bank immediately — and it is
 * a **billable** on-demand request on most plans, which is the reason it is a
 * separate action rather than a flag on the sync.
 *
 * ## It does not return the transactions
 *
 * The response is an acknowledgement. The new data arrives asynchronously, and
 * the way to learn it has landed is the `SYNC_UPDATES_AVAILABLE` webhook — or,
 * failing that, calling `transaction-sync` again a little later. A workflow that
 * refreshes and immediately syncs will usually see nothing new and conclude,
 * wrongly, that there is nothing there.
 *
 * The honest pattern is: refresh only when a user is *waiting* for something to
 * appear, and let the scheduled refresh cover everything else.
 */
const action: ActionDefinition = {
  key: "transaction-refresh",
  type: "perform",
  resource: "transaction",
  title: "Refresh transactions",
  description:
    "Force an immediate fetch from the bank. Billable on most plans, and it returns an " +
    "acknowledgement rather than data — the transactions arrive asynchronously.",
  idempotent: false,
  params: [ACCESS_TOKEN_PARAM],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");

    ctx.log(
      "info",
      "requested an on-demand Plaid refresh — the data arrives asynchronously, not in this " +
        "response",
      {},
    );
    return await new PlaidClient(ctx).request("/transactions/refresh", {
      access_token: accessToken,
    });
  },
};

export default action;
