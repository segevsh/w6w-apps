import type { ActionDefinition } from "@w6w/types";
import {
  ChargebeeClient,
  type ChargebeeList,
  filterDateRange,
  filterIs,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  SORT_ORDER_PARAM,
  sortBy,
} from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: string;
  customerId?: string;
  subscriptionId?: string;
  status?: string;
  recurring?: boolean;
  dateAfter?: number;
  dateBefore?: number;
  includeDeleted?: boolean;
  sortAttribute?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * `GET /invoices` — offset-cursor list of invoices.
 *
 * `status` is Chargebee's documented invoice enum: `paid`, `posted`,
 * `payment_due`, `not_paid`, `voided`, `pending`.
 *
 * `recurring` is unusual and is modelled as documented rather than as it looks:
 * it is an *enumerated* filter whose only operator is `is` and whose values are
 * the STRINGS `"true"` and `"false"` — not a boolean parameter. A JS boolean
 * serialises to exactly those strings, so a `boolean` param is the honest form
 * here and produces `recurring[is]=true` on the wire.
 *
 * `date` is a timestamp filter, so it takes `after` / `before` / `on` /
 * `between` in Unix epoch SECONDS. A one-sided bound uses `after` or `before`;
 * supplying both uses `between` with its documented `[t1,t2]` literal, because
 * combining `after` and `before` on one filter is not something Chargebee
 * documents. See `filterDateRange` in `lib/client.ts`.
 *
 * `sort_by` here accepts `date` or `updated_at` — NOT `created_at`. That
 * differs from the customers and subscriptions lists and is taken from this
 * endpoint's own parameter rather than assumed to match its siblings.
 */
const listInvoices: ActionDefinition<Input> = {
  key: "list-invoices",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description:
    "List invoices one page at a time, optionally filtered by customer, subscription, status, " +
    "recurring flag or date range.",
  params: [
    ...PAGE_PARAMS,
    { key: "customerId", label: "Customer ID", type: "string", hint: "Exact match." },
    { key: "subscriptionId", label: "Subscription ID", type: "string", hint: "Exact match." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "paid", label: "Paid" },
        { value: "posted", label: "Posted" },
        { value: "payment_due", label: "Payment due" },
        { value: "not_paid", label: "Not paid" },
        { value: "voided", label: "Voided" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      key: "recurring",
      label: "Recurring only",
      type: "boolean",
      hint:
        "True returns only subscription invoices; false returns only one-off charge invoices. " +
        "Leave unset for both.",
    },
    {
      key: "dateAfter",
      label: "Dated after",
      type: "number",
      hint: "Unix epoch seconds. Filters on the invoice date.",
      validation: { integer: true },
    },
    {
      key: "dateBefore",
      label: "Dated before",
      type: "number",
      hint: "Unix epoch seconds.",
      validation: { integer: true },
    },
    { key: "includeDeleted", label: "Include deleted", type: "boolean" },
    {
      key: "sortAttribute",
      label: "Sort by",
      type: "select",
      options: [
        { value: "date", label: "Invoice date" },
        { value: "updated_at", label: "Updated at" },
      ],
      hint: "This list sorts by invoice date or update time — not by creation time.",
    },
    SORT_ORDER_PARAM,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request<ChargebeeList>("/invoices", {
      query: {
        limit: input.limit,
        offset: input.offset,
        include_deleted: input.includeDeleted,
        customer_id: filterIs(input.customerId),
        subscription_id: filterIs(input.subscriptionId),
        status: filterIs(input.status),
        recurring: filterIs(input.recurring),
        date: filterDateRange(input.dateAfter, input.dateBefore),
        sort_by: sortBy(input.sortAttribute, input.sortOrder),
      },
    });
  },
};

export default listInvoices;
