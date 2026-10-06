import type { ActionDefinition } from "@w6w/types";
import { HospitableClient } from "../lib/client.ts";
import { includeParam, PAGED, PAGED_OUTPUT } from "../lib/params.ts";

/** `GET /v2/transactions` — Account transactions. */
interface Input {
  include?: string;
  page?: number;
  per_page?: number;
}

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "search",
  resource: "finance",
  title: "List Transactions",
  description:
    "List the account's transactions, paginated. Needs transaction:read, and Airbnb accounts authorised before 12 Jan 2024 must reconnect the channel.",
  params: [includeParam("payout, reservation"), ...PAGED],
  output: PAGED_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", "/transactions", {
      query: { include: input.include, page: input.page, per_page: input.per_page },
    });
  },
};

export default transactionList;
