import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/purchases` — standing access, and the subscriptions behind it.
 *
 * A purchase is the durable record that someone has (or had) access to
 * something, as distinct from an *order*, which is the transaction event that
 * created it. Purchases are what `purchase-deactivate`, `purchase-reactivate`
 * and `purchase-cancel-subscription` act on, so this is the lookup that feeds
 * every one of them.
 *
 * ## `active` and `deactivated` are separate filters, not one enum
 *
 * Kajabi documents both `filter[active]` ("active purchases (not deactivated)")
 * and `filter[deactivated]`. They are exposed as two booleans exactly as
 * declared rather than collapsed into a single status selector — collapsing
 * them would assert that they partition the set, which the spec never says.
 *
 * ## A documentation inconsistency, transcribed rather than corrected
 *
 * The referrer filter is declared as `filter[referrer]` but its own example
 * reads `?filter[referrer_cont]=…`. The two disagree. This app sends the
 * **declared parameter name** (`filter[referrer]`), because that is the part of
 * an OpenAPI document that is generated from the application; the example
 * string is prose. Flagged here so that a workflow getting unexpected results
 * from this one filter knows where to look.
 */
interface Input {
  siteId?: string;
  customerId?: string;
  active?: boolean;
  deactivated?: boolean;
  couponCode?: string;
  referrer?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const purchaseList: ActionDefinition<Input> = {
  key: "purchase-list",
  type: "search",
  resource: "purchase",
  title: "List Purchases",
  description:
    "List purchases — the standing access records behind memberships and subscriptions. Feeds " +
    "the activate, deactivate and cancel actions.",
  params: [
    siteFilterParam,
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "`customer-list` returns the ids.",
    },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      hint: 'Kajabi: *"active purchases (not deactivated)"*.',
    },
    { key: "deactivated", label: "Deactivated only", type: "boolean" },
    { key: "couponCode", label: "Coupon code", type: "string", advanced: true },
    {
      key: "referrer",
      label: "Referrer",
      type: "string",
      advanced: true,
      hint: "Sent as `filter[referrer]`, the name Kajabi's spec declares. Kajabi's own example " +
        "for this filter reads `filter[referrer_cont]`, which disagrees with the declaration.",
    },
    sortParam("created_at"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("purchases", "created_at"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/purchases", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[customer_id]": unset(input.customerId),
        "filter[active]": input.active,
        "filter[deactivated]": input.deactivated,
        "filter[coupon_code_eq]": unset(input.couponCode),
        "filter[referrer]": unset(input.referrer),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[purchases]": unset(input.fields),
      },
    });
  },
};

export default purchaseList;
