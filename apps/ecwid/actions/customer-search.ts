import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, type EcwidListPage } from "../lib/client.ts";
import { customerSortByOptions, paginationParams, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /customers` — search customers.
 *
 * `keyword` searches name and email together; `email` searches email alone and
 * pairs with `useExactEmailMatch` — which the docs are explicit about requiring,
 * since a partial email match with a short string is easy to get wrong.
 *
 * Customers are created implicitly when an order arrives from a guest checkout,
 * so this list is usually larger than "people who registered".
 */
interface Input {
  keyword?: string;
  name?: string;
  email?: string;
  useExactEmailMatch?: boolean;
  phone?: string;
  customerGroupIds?: string;
  taxExempt?: boolean;
  acceptMarketing?: boolean;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
  responseFields?: string;
}

const customerSearch: ActionDefinition<Input> = {
  key: "customer-search",
  type: "search",
  resource: "customer",
  title: "Search Customers",
  description: "Search customer records by name, email, phone, group or registration date.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      hint: "Searches both the customer's name and email.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Matches the billing person's `name` field.",
    },
    { key: "email", label: "Email", type: "string" },
    {
      key: "useExactEmailMatch",
      label: "Exact email match",
      type: "boolean",
      hint: "Only meaningful together with Email, which the API requires for this switch to apply.",
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: "Searches the phone number, or part of it, in both the shipping address and contacts.",
    },
    {
      key: "customerGroupIds",
      label: "Customer group IDs",
      type: "string",
      placeholder: "123456,234567",
      hint: "Comma-separated customer group IDs — the `id` of a Search Customer Groups result.",
    },
    {
      key: "taxExempt",
      label: "Tax exempt",
      type: "boolean",
      hint: "On finds only tax-exempt customers, off only customers without a valid tax id.",
    },
    {
      key: "acceptMarketing",
      label: "Accepted marketing",
      type: "boolean",
      hint: "On finds only customers who accepted marketing email, off only those who did not.",
    },
    {
      key: "createdFrom",
      label: "Created from",
      type: "string",
      placeholder: "2026-01-15 00:00:00",
      hint: "When the customer registered, or placed their first order without registering. UNIX " +
        "timestamp or `YYYY-MM-DD HH:mm:ss`.",
    },
    {
      key: "createdTo",
      label: "Created until",
      type: "string",
      advanced: true,
      hint: "Upper bound on the same field, same two formats.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: customerSortByOptions,
      advanced: true,
    },
    ...paginationParams(),
    responseFieldsParam,
  ],
  output: [
    { key: "items", type: "array", label: "Customers" },
    { key: "total", type: "number", label: "Total matching customers" },
    { key: "count", type: "number", label: "Customers in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size Ecwid used" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json<EcwidListPage<unknown>>("/customers", {
      query: {
        keyword: input.keyword,
        name: input.name,
        email: input.email,
        useExactEmailMatch: input.useExactEmailMatch,
        phone: input.phone,
        customerGroupIds: input.customerGroupIds,
        taxExempt: input.taxExempt,
        acceptMarketing: input.acceptMarketing,
        createdFrom: input.createdFrom,
        createdTo: input.createdTo,
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
        responseFields: input.responseFields,
      },
    });
  },
};

export default customerSearch;
