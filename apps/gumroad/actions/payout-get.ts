import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/payouts/:payoutId`
 * Needs the `view_payouts` or `account` scope.
 */
interface Input {
  payoutId: string;
  includeSales?: boolean;
  includeTransactions?: boolean;
}

const payoutGet: ActionDefinition<Input> = {
  key: "payout-get",
  type: "read",
  resource: "payout",
  title: "Get Payout",
  description:
    "One payout with its sales (and optionally per-transaction rows). Needs the `view_payouts` or `account` scope.",
  params: [{ "key": "payoutId", "label": "Payout ID", "type": "string", "required": true }, {
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
  output: [{ "key": "id", "type": "string", "label": "Payout id" }, {
    "key": "amount",
    "type": "string",
    "label": "Amount",
  }, { "key": "status", "type": "string", "label": "Status" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/payouts/${seg(input.payoutId)}`, {
      query: { include_sales: input.includeSales, include_transactions: input.includeTransactions },
    });
    return body.payout;
  },
};

export default payoutGet;
