import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /suppliers` — list suppliers.
 *
 * Pennylane's filter fields here are `id`, `ledger_account_id`, `name`,
 * `external_reference` and `emails`; `sort` accepts only `id`.
 */
const listSuppliers: ActionDefinition<ListInput> = {
  key: "list-suppliers",
  type: "read",
  resource: "supplier",
  title: "List Suppliers",
  description: "List suppliers, one cursor page at a time (GET /suppliers). Filterable on id, " +
    "ledger_account_id, name, external_reference and emails.",
  params: listParams(100),
  output: [
    { key: "items", type: "array", label: "Suppliers" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/suppliers", {
      query: listQuery(input),
    });
  },
};

export default listSuppliers;
