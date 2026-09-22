import type { ActionDefinition } from "@w6w/types";
import { GoCardlessClient, type ListPage } from "../lib/client.ts";
import {
  dateFilterParams,
  dateFilterQuery,
  enumishParam,
  idFilterParam,
  listOutput,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /subscriptions` — one page of this merchant's subscriptions.
 *
 * A subscription is a standing instruction to collect a fixed amount on a fixed
 * cadence against one mandate, so it is the object to inspect when reconciling
 * recurring revenue: `status` says whether GoCardless is still collecting, and
 * `mandate` / `customer` attribute it.
 *
 * The filters here are the four this app's API reference pins down for this
 * endpoint; the subscription's own `amount`, `interval_unit` and `name` are not
 * server-side filters, so a workflow that needs them narrows the page itself
 * (or keys on the `reference` it set on the mandate).
 */
interface Input {
  limit?: number;
  after?: string;
  before?: string;
  mandate?: string;
  customer?: string;
  status?: string;
  createdAtGt?: string;
  createdAtGte?: string;
  createdAtLt?: string;
  createdAtLte?: string;
}

const listSubscriptions: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "list-subscriptions",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "Search standing-order style subscriptions by mandate, customer, status or creation date.",
  params: [
    ...paginationParams(),
    idFilterParam("mandate", "Mandate ID", "Only subscriptions collecting against this mandate."),
    idFilterParam("customer", "Customer ID", "Only subscriptions belonging to this customer."),
    enumishParam(
      "status",
      "Status",
      "GoCardless's own subscription `status` values (e.g. `active`, `paused`, `cancelled`, " +
        "`finished`).",
    ),
    ...dateFilterParams({ prefix: "createdAt", label: "Created", field: "created_at" }),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new GoCardlessClient(ctx).list("subscriptions", "/subscriptions", {
      limit: input.limit,
      after: input.after,
      before: input.before,
      mandate: input.mandate,
      customer: input.customer,
      status: input.status,
      ...dateFilterQuery("created_at", {
        gt: input.createdAtGt,
        gte: input.createdAtGte,
        lt: input.createdAtLt,
        lte: input.createdAtLte,
      }),
    });
  },
};

export default listSubscriptions;
