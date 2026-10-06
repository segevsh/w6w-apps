import type { ActionDefinition } from "@w6w/types";
import { DubClient } from "../lib/client.ts";

interface Input {
  email?: string;
  externalId?: string;
  search?: string;
  country?: string;
  linkId?: string;
  includeExpandedFields?: boolean;
  sortBy?: string;
  sortOrder?: string;
  pageSize?: number;
  startingAfter?: string;
  endingBefore?: string;
}

/** `GET /customers` — cursor pagination (`page` is deprecated and not exposed). */
const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customers recorded by conversion tracking, one cursor page at a time. Pass `nextCursor` as `startingAfter` for the next page.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Exact, case-sensitive match." },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Exact, case-sensitive match.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches email, name or customer ID. Ignored when email or external ID is set.",
    },
    { key: "country", label: "Country", type: "string" },
    { key: "linkId", label: "Referral link ID", type: "string" },
    { key: "includeExpandedFields", label: "Include link, partner and discount", type: "boolean" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "createdAt", label: "Created at" },
        { value: "saleAmount", label: "Sale amount" },
        { value: "firstSaleAt", label: "First sale at" },
        { value: "subscriptionCanceledAt", label: "Subscription canceled at" },
      ],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Defaults to 100, the maximum.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "startingAfter",
      label: "Starting after (cursor)",
      type: "string",
      hint: "A customer ID.",
    },
    {
      key: "endingBefore",
      label: "Ending before (cursor)",
      type: "string",
      hint: "A customer ID. Exclusive with `startingAfter`.",
    },
  ],
  output: [
    { key: "customers", type: "array", label: "Customers on this page" },
    {
      key: "nextCursor",
      type: "string",
      label: "ID to pass as startingAfter; absent when the page was not full",
    },
  ],

  async execute(input, ctx) {
    const customers = await new DubClient(ctx).request<Array<{ id?: string }>>(
      "GET",
      "/customers",
      {
        query: {
          email: input.email,
          externalId: input.externalId,
          search: input.search,
          country: input.country,
          linkId: input.linkId,
          includeExpandedFields: input.includeExpandedFields,
          sortBy: input.sortBy,
          sortOrder: input.sortOrder,
          pageSize: input.pageSize,
          startingAfter: input.startingAfter,
          endingBefore: input.endingBefore,
        },
      },
    );
    const size = input.pageSize ?? 100;
    const last = customers.at(-1)?.id;
    return { customers, ...(customers.length >= size && last ? { nextCursor: last } : {}) };
  },
};

export default customerList;
