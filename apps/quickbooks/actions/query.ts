import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";

interface Input {
  query: string;
}

const query: ActionDefinition<Input> = {
  key: "query",
  type: "read",
  resource: "query",
  title: "Run Query",
  description:
    "Run a raw QuickBooks query-language statement against any entity — the escape hatch for resources this app has no dedicated action for (CreditMemo, JournalEntry, TaxCode, Deposit, …).",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: 'SELECT * FROM JournalEntry WHERE TxnDate > \'2026-01-01\' MAXRESULTS 50',
      hint:
        "QuickBooks' SQL-like query syntax (developer.intuit.com's Data Queries docs) — SELECT only.",
    },
  ],
  output: [{ key: "QueryResponse", type: "object", label: "Query response" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/query", { query: { query: input.query } });
  },
};

export default query;
