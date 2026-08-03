import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
} from "../lib/params.ts";

/**
 * `GET /v1/transactions` — individual payments.
 *
 * The finest-grained money record in this API: an order is the purchase event,
 * a purchase is the standing access, and a transaction is a single movement of
 * money — which is what a monthly subscription generates twelve of a year.
 * Reconciliation workflows want this one.
 *
 * ## The only collection with a date range, and the only one with no `sort`
 *
 * `filter[start_date]` / `filter[end_date]` (ISO dates, per Kajabi's
 * `2024-12-01` example) appear on this collection and on payouts, nowhere else
 * — which makes this the natural endpoint for "everything that happened last
 * month". Correspondingly, the spec declares **no** `sort` parameter here, so
 * this app declares none: offering a sort field the server never agreed to
 * honour would look like it worked and quietly do nothing.
 */
interface Input {
  siteId?: string;
  customerId?: string;
  nameOrEmail?: string;
  startDate?: string;
  endDate?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description:
    "List individual payments, optionally over a date range — the endpoint for revenue " +
    "reconciliation.",
  params: [
    siteFilterParam,
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "`customer-list` returns the ids.",
    },
    {
      key: "nameOrEmail",
      label: "Name or email",
      type: "string",
      hint: "Sent as `filter[name_or_email]`.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      row: "range",
      placeholder: "2026-01-01",
      hint: "ISO date, per Kajabi's own example format.",
    },
    { key: "endDate", label: "End date", type: "string", row: "range", placeholder: "2026-01-31" },
    pageNumberParam,
    pageSizeParam,
    fieldsParam("transactions", "amount,created_at"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/transactions", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[customer_id]": unset(input.customerId),
        "filter[name_or_email]": unset(input.nameOrEmail),
        "filter[start_date]": unset(input.startDate),
        "filter[end_date]": unset(input.endDate),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[transactions]": unset(input.fields),
      },
    });
  },
};

export default transactionList;
