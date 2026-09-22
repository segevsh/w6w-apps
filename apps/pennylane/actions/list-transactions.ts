import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /transactions` — list bank transactions.
 *
 * Pennylane's filter fields are `id`, `bank_account_id`, `journal_id` and
 * `date`; `sort` accepts only `id`. Each item carries the raw movement plus
 * whatever has been attached to it — `customer`, `supplier`, `categories` and
 * `matched_invoices` — which is what makes this the reconciliation view rather
 * than a statement export.
 */
const listTransactions: ActionDefinition<ListInput> = {
  key: "list-transactions",
  type: "read",
  resource: "transaction",
  title: "List Transactions",
  description:
    "List bank transactions, one cursor page at a time (GET /transactions). Filterable on id, " +
    "bank_account_id, journal_id and date.",
  params: listParams(100),
  output: [
    { key: "items", type: "array", label: "Transactions" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/transactions", {
      query: listQuery(input),
    });
  },
};

export default listTransactions;
