import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  pathId,
} from "../lib/client.ts";

interface Input extends PageInput {
  accountUid: string;
}

/** `GET /api/v1/billing/transactions/{accountUid}` — List the invoice, payment, credit, refund and chargeback transactions of one account. */
const listTransactions: ActionDefinition<Input> = {
  key: "list-transactions",
  type: "search",
  resource: "billing",
  title: "List Account Transactions",
  description:
    "List the invoice, payment, credit, refund and chargeback transactions of one account.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "accountUid",
      label: "Account Uid",
      type: "string",
      hint: "The account's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(
      `/billing/transactions/${pathId(input.accountUid)}`,
      { method: "GET", query: { ...pageQuery(input) } },
    );
  },
};

export default listTransactions;
