import { sinceTrigger } from "../lib/triggers.ts";
import bankTransactionList from "../actions/bank-transaction-list.ts";

export default sinceTrigger({
  key: "new-bank-transaction",
  title: "New Bank Transaction",
  description: "The run gets each bank transaction newly added to a FreeAgent bank account.",
  action: bankTransactionList,
  itemsKey: "bank_transactions",
  input: (p, w) => ({ bankAccountId: p.bankAccountId, ...w }),
  params: [{ key: "bankAccountId", label: "Bank account ID", type: "string", required: true }],
  output: [
    { key: "url", type: "string", label: "Transaction URL (its ID)" },
    { key: "bank_account", type: "string", label: "Bank account URL" },
    { key: "amount", type: "string", label: "Amount" },
    { key: "dated_on", type: "string", label: "Date" },
    { key: "description", type: "string", label: "Description" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/bank_transactions/8",
    bank_account: "https://api.freeagent.com/v2/bank_accounts/1",
    amount: "-730.0",
    dated_on: "2026-11-09",
    description: "Office supplies",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
});
