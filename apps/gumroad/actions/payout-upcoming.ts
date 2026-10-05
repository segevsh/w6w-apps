import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/payouts/upcoming`
 * Needs the `view_payouts` or `account` scope.
 */
interface Input {
  includeSales?: boolean;
  includeTransactions?: boolean;
}

const payoutUpcoming: ActionDefinition<Input> = {
  key: "payout-upcoming",
  type: "read",
  resource: "payout",
  title: "List Upcoming Payouts",
  description: "Up to two upcoming payouts. Needs the `view_payouts` or `account` scope.",
  params: [{
    "key": "includeSales",
    "label": "Include sales",
    "type": "boolean",
    "hint": "Gumroad's default is true.",
  }, {
    "key": "includeTransactions",
    "label": "Include transactions",
    "type": "boolean",
    "hint": "Gumroad's default is false.",
  }],
  output: [{ "key": "payouts", "type": "array", "label": "Upcoming payouts" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/payouts/upcoming`, {
      query: { include_sales: input.includeSales, include_transactions: input.includeTransactions },
    });
    return { payouts: body.payouts ?? [] };
  },
};

export default payoutUpcoming;
