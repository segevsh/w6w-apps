import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { bankTransactionId } from "../lib/params.ts";

interface Input {
  bankTransactionId: string;
}

const bankTransactionGet: ActionDefinition<Input> = {
  key: "bank-transaction-get",
  type: "read",
  resource: "bank-transaction",
  title: "Get Bank Transaction",
  description: "Retrieve one bank transaction by its BankTransactionID.",
  params: [bankTransactionId],
  output: [{ key: "BankTransactions", type: "array", label: "Bank transactions" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request(
      `/BankTransactions/${encodeURIComponent(input.bankTransactionId)}`,
    );
  },
};

export default bankTransactionGet;
