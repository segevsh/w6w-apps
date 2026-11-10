import { pollFromListAction } from "../../_shared/poll/mod.ts";
import transactionList from "../actions/transaction-list.ts";

/**
 * `GET /v1/transactions?sort=desc` — "Sort order by createdAt"
 * (https://developer.iclosed.io, OpenAPI `Get transactions`, verified 2026-11-10). The envelope
 * is `{ count, data: [...] }`.
 */
export default pollFromListAction({
  key: "new-transaction",
  title: "New Transaction",
  description: "The run gets each payment transaction newly recorded in iClosed.",
  action: transactionList,
  input: () => ({ sort: "desc", limit: 100, page: 0 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "number", label: "Transaction ID" },
    { key: "name", type: "string", label: "Payer name" },
    { key: "email", type: "string", label: "Payer email" },
    { key: "value", type: "number", label: "Amount" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "source", type: "string", label: "Source" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 771,
    name: "Ada Lovelace",
    email: "ada@example.test",
    value: 2500,
    currency: "USD",
    source: "Stripe",
    createdAt: "2026-11-10T09:45:00.000Z",
  },
});
