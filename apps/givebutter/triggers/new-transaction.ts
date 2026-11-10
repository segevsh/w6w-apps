import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import transactionList from "../actions/transaction-list.ts";
import { idOf, rows } from "../lib/triggers.ts";

// `sortByDesc=created_at` is a documented value of GET /v1/transactions' `sortByDesc` enum
// (https://docs.givebutter.com/api-reference/transactions/list-all-transactions, 2026-11-10).
export default pollFromListAction<Record<string, unknown>>({
  key: "new-transaction",
  title: "New Transaction",
  description:
    "The run gets each newly created Givebutter transaction (donation, ticket sale, ...).",
  action: transactionList as unknown as ActionDefinition,
  input: () => ({ sortByDesc: "created_at", page: 1, per_page: 100 }),
  items: rows,
  idOf,
  output: [
    { key: "id", type: "string", label: "Transaction ID" },
    { key: "number", type: "string", label: "Transaction number" },
    { key: "status", type: "string", label: "Status" },
    { key: "method", type: "string", label: "Payment method" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "campaign_id", type: "number", label: "Campaign ID" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: "txn_1001",
    number: "T-1001",
    status: "succeeded",
    method: "card",
    amount: 50,
    campaign_id: 1201,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
