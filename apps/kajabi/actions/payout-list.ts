import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { collectionOutput, pageNumberParam } from "../lib/params.ts";

/**
 * `GET /v1/kajabi_payments_payouts` — money paid out to the creator.
 *
 * The other side of `transaction-list`: transactions are money coming in from
 * customers, payouts are money going out to the site owner's bank. Only
 * meaningful for sites using **Kajabi Payments** — the endpoint is named for it,
 * and a site taking payment through its own Stripe or PayPal account settles
 * there instead, where this endpoint cannot see it.
 *
 * ## `site_id` really is required here
 *
 * Unlike every other collection in this API, Kajabi marks it so explicitly:
 * *"Site ID to fetch payouts for (required)"*. So this action makes it a
 * required param, and it is the only one that does — the difference is the
 * vendor's, and it is worth honouring rather than smoothing over into the
 * optional `siteFilterParam` every other list uses.
 *
 * ## No page size, no sort
 *
 * The spec declares `page[number]` but neither `page[size]` nor `sort` on this
 * operation. Both are therefore absent here rather than sent hopefully.
 */
interface Input {
  siteId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  pageNumber?: number;
}

const payoutList: ActionDefinition<Input> = {
  key: "payout-list",
  type: "search",
  resource: "payout",
  title: "List Payouts",
  description:
    "List Kajabi Payments payouts for a site — money settled to the creator. Only applies to " +
    "sites using Kajabi Payments.",
  params: [
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      required: true,
      hint: "Kajabi marks this one *required* on the payouts endpoint, unlike elsewhere. " +
        "`site-list` returns the ids.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "paid", label: "Paid" },
        { value: "failed", label: "Failed" },
        { value: "canceled", label: "Canceled" },
      ],
      hint: "The four values Kajabi documents for this filter.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      row: "range",
      placeholder: "2026-01-01",
      hint: "ISO 8601, per Kajabi's example.",
    },
    { key: "endDate", label: "End date", type: "string", row: "range", placeholder: "2026-01-31" },
    pageNumberParam,
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/kajabi_payments_payouts", {
      query: {
        "filter[site_id]": input.siteId,
        "filter[status]": unset(input.status),
        "filter[start_date]": unset(input.startDate),
        "filter[end_date]": unset(input.endDate),
        "page[number]": input.pageNumber,
      },
    });
  },
};

export default payoutList;
