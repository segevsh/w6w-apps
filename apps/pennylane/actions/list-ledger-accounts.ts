import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /ledger_accounts` — list the chart of accounts.
 *
 * Pennylane's filter fields are `id`, `number` and `enabled`; `sort` accepts
 * only `id`. This endpoint's page ceiling is **1,000** where every other list in
 * this app tops out at 100, because a full chart of accounts is normally read in
 * one or two calls.
 */
const listLedgerAccounts: ActionDefinition<ListInput> = {
  key: "list-ledger-accounts",
  type: "read",
  resource: "ledger-account",
  title: "List Ledger Accounts",
  description:
    "List the chart of accounts, one cursor page at a time (GET /ledger_accounts). Filterable " +
    "on id, number and enabled.",
  params: listParams(1000),
  output: [
    { key: "items", type: "array", label: "Ledger accounts" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/ledger_accounts", {
      query: listQuery(input),
    });
  },
};

export default listLedgerAccounts;
