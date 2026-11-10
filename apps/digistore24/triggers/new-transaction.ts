import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-transactions.ts";

/**
 * Wraps `list-transactions` (`listTransactions`) sorted `sort_by=date&sort_order=desc` — the
 * vendor's default order is ascending (`digistore24.com/api/docs/paths/listTransactions.yaml`), so
 * the descending order is always sent. With no `from` Digistore24 lists the last 24 hours, which
 * one check interval always covers; `page_size` 100 (maximum 1000).
 */
export default pollFromListAction({
  key: "new-transaction",
  title: "New Transaction",
  description:
    "The run gets each new payment, refund or chargeback Digistore24 records for you, including joint-venture sales.",
  action,
  params: action.params?.filter((p) => ["email", "product_id", "transaction_type"].includes(p.key)),
  input: (params) => ({
    email: params.email,
    product_id: params.product_id,
    transaction_type: params.transaction_type,
    sort_by: "date",
    sort_order: "desc",
    page_no: 1,
    page_size: 100,
  }),
  items: (result) => (result as { transaction_list?: unknown[] }).transaction_list ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  output: [
    { key: "id", type: "number", label: "Transaction ID" },
    { key: "purchase_id", type: "string", label: "Purchase ID" },
    { key: "transaction_type", type: "string", label: "Transaction type (payment, refund, …)" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 1234,
    purchase_id: "X26QE8GN",
    transaction_type: "payment",
    amount: 49,
    currency: "EUR",
    created_at: "2026-11-09 10:00:00",
  },
  maxPages: 1,
});
