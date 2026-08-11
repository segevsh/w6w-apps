import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, toList } from "../lib/client.ts";
import { customerIncludeOptions, customerSortOptions, paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/customers` — the store's customers.
 *
 * The v3 form, deliberately: `/v2/customers` is on BigCommerce's Deprecations
 * and Sunsets list with Customers V3 named as its replacement — and two of its
 * collection deletes have already been *sunset*, not merely deprecated.
 *
 * ## Two pagination systems on one endpoint
 *
 * This endpoint accepts `page`/`limit` **and** cursor `after`/`before`, and the
 * vendor documents that the response's `meta` block changes shape depending on
 * which you used: both `pagination` and `cursor_pagination` on the first page,
 * only `pagination` when `page > 1`, only `cursor_pagination` when `before` or
 * `after` was supplied. Code that reads `meta.pagination.total_pages` after
 * paging by cursor gets `undefined`, which is why this action returns the cursor
 * block alongside the page block rather than flattening them into one.
 *
 * Only page-number paging is exposed as an input: mixing the two in a single
 * form invites sending both, and the vendor does not document what happens then.
 * The cursor is still returned, for a workflow that wants to follow it.
 */
interface Input {
  emails?: string;
  names?: string;
  nameLike?: string;
  ids?: string;
  companies?: string;
  customerGroupIds?: string;
  dateModifiedMin?: string;
  include?: string[];
  sort?: string;
  limit?: number;
  page?: number;
}

const customerList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "Search customers with the v3 Customers filters. Every filter here is a list form.",
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "string",
      placeholder: "jane@example.com,john@example.com",
      hint: "Comma-separated. Sent as `email:in` — there is no single-email filter.",
    },
    { key: "names", label: "Names", type: "string", hint: "Comma-separated. Sent as `name:in`." },
    { key: "nameLike", label: "Name contains", type: "string", hint: "Sent as `name:like`." },
    {
      key: "ids",
      label: "Customer IDs",
      type: "string",
      hint: "Comma-separated. Sent as `id:in`.",
    },
    { key: "companies", label: "Companies", type: "string", advanced: true },
    {
      key: "customerGroupIds",
      label: "Customer group IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Sent as `customer_group_id:in`.",
    },
    { key: "dateModifiedMin", label: "Modified since", type: "string", advanced: true },
    {
      key: "include",
      label: "Include sub-resources",
      type: "multiselect",
      options: customerIncludeOptions,
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: customerSortOptions,
      hint: "Field and direction are one token here, unlike the Orders endpoint.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Customers" },
    { key: "pagination", type: "object", label: "Page pagination" },
    { key: "cursor", type: "object", label: "Cursor pagination (first page only)" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/customers", {
      query: {
        "email:in": toList(input.emails),
        "name:in": toList(input.names),
        "name:like": input.nameLike,
        "id:in": toList(input.ids),
        "company:in": toList(input.companies),
        "customer_group_id:in": toList(input.customerGroupIds),
        "date_modified:min": input.dateModifiedMin,
        include: toList(input.include),
        sort: input.sort,
        limit: input.limit,
        page: input.page,
      },
    });
  },
};

export default customerList;
