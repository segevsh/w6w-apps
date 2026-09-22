/**
 * `GET /api/v2/invoices` — the business's invoices.
 *
 * An invoice here is a billing document: a membership charge, a store order, a
 * credit note. The two source filters are the joins a workflow needs —
 * `customer_membership` (everything billed for one customer's plan) and
 * `store_order` — and `status` spans the whole lifecycle TeamUp documents, from
 * `draft` and `upcoming` through `open`/`pending`/`paid` to
 * `failed`/`retrying`/`retry_failed`, `voided` and `skipped`.
 *
 * A dunning workflow is therefore a filter, not a calculation: `status:
 * retry_failed` is exactly the set that needs a human. `sort` is passed
 * through, and the envelope is returned verbatim.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  status?: string;
  customer_membership?: number;
  store_order?: number;
  sort?: string;
}

const action: ActionDefinition<Input> = {
  key: "invoices-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description:
    "List invoices by status and billing source — a customer membership or a store order (GET " +
    "/api/v2/invoices).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The invoice's status, e.g. paid, open or retry_failed.",
    },
    {
      key: "customer_membership",
      label: "Customer membership ID",
      type: "number",
      validation: { integer: true },
      hint: "Everything billed for one customer's membership.",
    },
    {
      key: "store_order",
      label: "Store order ID",
      type: "number",
      validation: { integer: true },
      hint: "Everything billed for one store order.",
    },
    { key: "sort", label: "Sort", type: "string", hint: "The server-side sort order." },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/invoices", {
      query: {
        ...paginationQuery(input),
        status: input.status,
        customer_membership: input.customer_membership,
        store_order: input.store_order,
        sort: input.sort,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
