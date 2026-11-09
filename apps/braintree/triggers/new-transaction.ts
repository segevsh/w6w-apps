import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/transaction-search.ts";

const trigger = pollFromListAction({
  key: "new-transaction",
  title: "New Transaction",
  description: "The run gets each newly created Braintree transaction.",
  action,
  input: (params) => ({ ...params, first: 100 }),
  items: (result) => (result as { transactions?: unknown[] }).transactions ?? [],
  idOf: (item) => String((item as { id?: string }).id),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Transaction ID" }],
  sample: { id: "transaction_1", createdAt: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});

export default trigger;
