import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/customers` — List customers in a source, with search, sorting and paging. */
interface Input {
  source_id: string;
  search?: string;
  sort?: string;
  order?: string;
  per_page?: number;
  page?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List customers in a source, with search, sorting and paging.",
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "search", label: "Search", type: "string", hint: "Matches oid, email, notes and name." },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      hint: "Vendor default is created.",
      options: [{ value: "created", label: "Created" }, { value: "ltv", label: "Lifetime value" }],
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      hint: "Vendor default is asc.",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      hint: "Objects per page. Vendor default 30, maximum 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number; the vendor's pagination meta starts at 0.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "customers", type: "array", label: "Customers" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("GET", `/${encodeId(input.source_id)}/customers`, {
      query: {
        search: input.search,
        sort: input.sort,
        order: input.order,
        per_page: input.per_page,
        page: input.page,
      },
    });
  },
};

export default customerList;
