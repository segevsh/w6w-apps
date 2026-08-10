import type { ActionDefinition } from "@w6w/types";
import { definedQuery, extraFilters, KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  extraFiltersParam,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/customers` — the people who have bought.
 *
 * The revenue-side counterpart to `contact-list`. The two collections carry
 * near-identical filter sets, but they are not aliases: `customer_id` is the
 * key `/v1/orders`, `/v1/purchases` and `/v1/transactions` all filter by, and
 * no endpoint in this API filters those by contact. So any workflow that starts
 * from a person and needs their money — orders, subscriptions, payments —
 * starts here rather than at `contact-list`.
 *
 * `sort` is the tell: this collection can sort by `net_revenue` and
 * `last_request_at`, which the contact collection cannot.
 *
 * Like the contact collection, it declares 75+ filters; the common ones are
 * real params and the rest pass through `Additional filters`.
 */
interface Input {
  siteId?: string;
  search?: string;
  nameContains?: string;
  emailContains?: string;
  createdInLast?: number;
  hasOfferId?: string;
  hasProductId?: string;
  hasActiveProductId?: string;
  usedCouponCode?: string;
  netRevenueGreaterThan?: number;
  filters?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "Search and page through customers — the purchasing identity that orders, purchases and " +
    "transactions are keyed by.",
  params: [
    siteFilterParam,
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Fuzzy search across name and email (`filter[search]`).",
    },
    { key: "nameContains", label: "Name contains", type: "string", advanced: true },
    { key: "emailContains", label: "Email contains", type: "string", advanced: true },
    {
      key: "createdInLast",
      label: "Created in last (days)",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "hasOfferId",
      label: "Has offer ID",
      type: "string",
      hint: "`offer-list` returns the ids.",
    },
    { key: "hasProductId", label: "Owns product ID", type: "string", advanced: true },
    {
      key: "hasActiveProductId",
      label: "Has active membership to product ID",
      type: "string",
      advanced: true,
      hint: "Narrower than *Owns product ID* — excludes lapsed and revoked access.",
    },
    { key: "usedCouponCode", label: "Used coupon code", type: "string", advanced: true },
    {
      key: "netRevenueGreaterThan",
      label: "Net revenue greater than",
      type: "number",
      advanced: true,
    },
    extraFiltersParam(
      "Kajabi documents 75+ filters on this endpoint, e.g. `net_revenue_less_than`, " +
        "`previously_owned_product_id`, `registered_event_id`, `is_hard_bouncing`.",
    ),
    sortParam("name, email, created_at, net_revenue, last_request_at"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("customers", "name,email"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/customers", {
      query: {
        ...extraFilters(input.filters, "Additional filters"),
        ...definedQuery({
          "filter[site_id]": unset(input.siteId),
          "filter[search]": unset(input.search),
          "filter[name_contains]": unset(input.nameContains),
          "filter[email_contains]": unset(input.emailContains),
          "filter[created_in_last]": input.createdInLast,
          "filter[has_offer_id]": unset(input.hasOfferId),
          "filter[has_product_id]": unset(input.hasProductId),
          "filter[has_active_product_id]": unset(input.hasActiveProductId),
          "filter[used_coupon_code]": unset(input.usedCouponCode),
          "filter[net_revenue_greater_than]": input.netRevenueGreaterThan,
          sort: unset(input.sort),
          "page[number]": input.pageNumber,
          "page[size]": input.pageSize,
          "fields[customers]": unset(input.fields),
        }),
      },
    });
  },
};

export default customerList;
