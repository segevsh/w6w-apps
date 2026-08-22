import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM } from "../lib/params.ts";

/**
 * `POST /auth/get` — the account and routing numbers needed to move money.
 *
 * **This is the most sensitive call in the app.** It returns the actual bank
 * account and routing numbers (and their international equivalents), which are
 * what an ACH debit needs — and what somebody else's ACH debit would also need.
 * Plaid's whole payments business rests on this endpoint, and so does the risk.
 *
 * Three consequences worth building around:
 *
 *   - **Do not log the response.** A workflow that prints its output has put
 *     bank details in a log aggregator, probably permanently. This action logs
 *     nothing but the account count.
 *   - **Do not cache it broadly.** Read it at the moment a payment is set up,
 *     store what the payment processor needs, and no more.
 *   - It requires the `auth` product on the Item, which the user consented to
 *     when they connected — asking for it later means going through Link again.
 *
 * `numbers` is split by scheme (`ach`, `eft`, `international`, `bacs`) because
 * a Canadian account has a transit and institution number rather than a routing
 * number, and reaching for `ach[0]` on a non-US account finds nothing.
 */
const action: ActionDefinition = {
  key: "auth-get",
  type: "read",
  resource: "account",
  title: "Get account and routing numbers",
  description:
    "The bank details an ACH debit needs — the most sensitive call here. Read it when setting " +
    "up a payment, store only what the processor needs, and never log it.",
  params: [ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM],
  output: [
    { key: "numbers", type: "object", label: "Account numbers, by scheme" },
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "item", type: "object", label: "Item" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");
    const accountIds = csv(p.accountIds);

    const body = await new PlaidClient(ctx).request<{ accounts?: unknown[] }>(
      "/auth/get",
      compact({
        access_token: accessToken,
        options: accountIds ? { account_ids: accountIds } : undefined,
      }),
    );
    // Deliberately logs a count and nothing else — the response is bank details.
    ctx.log("info", "read Plaid account numbers", { accounts: body?.accounts?.length });
    return body;
  },
};

export default action;
