import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /customers` — list company and individual customers.
 *
 * One endpoint covers both kinds of third party; every item carries a
 * `customer_type` telling them apart (`company` vs `individual`), and the
 * filter language can select on it. Pennylane's own filter fields are `id`,
 * `customer_type`, `ledger_account_id`, `name`, `external_reference`, `reg_no`
 * and `emails`; `sort` accepts only `id`.
 */
const listCustomers: ActionDefinition<ListInput> = {
  key: "list-customers",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description:
    "List company and individual customers, one cursor page at a time (GET /customers). " +
    "Filterable on id, customer_type, ledger_account_id, name, external_reference, reg_no " +
    "and emails.",
  params: listParams(100),
  output: [
    { key: "items", type: "array", label: "Customers" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/customers", {
      query: listQuery(input),
    });
  },
};

export default listCustomers;
