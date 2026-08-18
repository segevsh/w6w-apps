import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM } from "../lib/params.ts";

/**
 * `POST /liabilities/get` — what the account holder owes, and on what terms.
 *
 * Credit cards, student loans and mortgages, with the fields that make them
 * loans rather than balances: APR, minimum payment, next payment due date, last
 * payment amount, origination date, and for student loans the servicer and
 * repayment plan.
 *
 * That turns "this person has a card with £2,000 on it" into "£2,000 at 24.9%
 * with £45 due on the 8th", which is the difference between a balance and an
 * affordability picture.
 *
 * Coverage is narrower than transactions — not every institution supports it,
 * and the fields present vary by account type. A workflow should treat missing
 * fields as normal rather than as an error.
 */
const action: ActionDefinition = {
  key: "liabilities-get",
  type: "read",
  resource: "liability",
  title: "Get liabilities",
  description:
    "Credit cards, student loans and mortgages with their APRs, minimum payments and due " +
    "dates — the terms, not just the balance. Coverage varies by institution.",
  params: [ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM],
  output: [
    { key: "liabilities", type: "object", label: "Credit, student and mortgage liabilities" },
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "item", type: "object", label: "Item" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");
    const accountIds = csv(p.accountIds);

    return await new PlaidClient(ctx).request(
      "/liabilities/get",
      compact({
        access_token: accessToken,
        options: accountIds ? { account_ids: accountIds } : undefined,
      }),
    );
  },
};

export default action;
