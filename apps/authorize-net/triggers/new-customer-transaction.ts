import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-customer-transactions.ts";

const trigger = pollFromListAction({
  key: "new-customer-transaction",
  title: "New Customer Transaction",
  description: "The run gets each new transaction for the selected customer profile.",
  action,
  input: (params) => ({
    ...params,
    sorting: { orderBy: "submitTimeUTC", orderDescending: true },
    paging: { limit: 100, offset: 1 },
  }),
  items: (result) => {
    const transactions =
      (result as { transactions?: unknown[] | { transaction?: unknown[] } }).transactions;
    return Array.isArray(transactions) ? transactions : transactions?.transaction ?? [];
  },
  idOf: (item) => String((item as { transId?: string | number }).transId),
  params: action.params,
  output: [{ key: "transId", type: "string", label: "Transaction ID" }],
  sample: { transId: "40000000001", submitTimeUTC: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});

export default trigger;
