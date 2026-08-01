import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { listFilters, page } from "../lib/params.ts";

interface Input {
  where?: string;
  order?: string;
  page?: number;
}

const bankTransactionList: ActionDefinition<Input> = {
  key: "bank-transaction-list",
  type: "read",
  resource: "bank-transaction",
  title: "List Bank Transactions",
  description: "List spend and receive money transactions against a bank account.",
  params: [...listFilters, page],
  output: [{ key: "BankTransactions", type: "array", label: "Bank transactions" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request("/BankTransactions", {
      query: { where: input.where, order: input.order, page: input.page ?? 1 },
    });
  },
};

export default bankTransactionList;
