import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import transactionList from "../actions/transaction-list.ts";

/** Newest-first via the documented `order=desc` query parameter (https://docs.mercury.com/reference/listtransactions). */
export default pollFromListAction({
  key: "new-transaction",
  title: "New Transaction",
  description:
    "The run gets each new transaction across every account: id, amount, status, counterparty and timestamps.",
  action: transactionList as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Transaction ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "status", type: "string", label: "Status" },
    { key: "counterpartyName", type: "string", label: "Counterparty" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "transaction-1",
    amount: -125.5,
    status: "pending",
    counterpartyName: "Acme Supplies",
    createdAt: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
