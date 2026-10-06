import type { ActionDefinition } from "@w6w/types";
import { perPage, SallaClient, toArray } from "../lib/client.ts";

interface Input {
  keyword?: string;
  date_from?: string;
  date_to?: string;
  fields?: string | number | Array<string | number>;
  page?: number;
  per_page?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List the store's customers. Customer endpoints have their own limit of 500 requests per 10 minutes. Needs the `customers.read` scope.",

  params: [
    {
      "key": "keyword",
      "label": "Keyword",
      "type": "string",
      "hint": "Matches e.g. customer name or mobile.",
    },
    {
      "key": "date_from",
      "label": "Created from",
      "type": "string",
    },
    {
      "key": "date_to",
      "label": "Created to",
      "type": "string",
    },
    {
      "key": "fields",
      "label": "Extra fields",
      "type": "string",
      "hint": "Comma-separated extras, e.g. is_blocked, total_points, country_id.",
    },
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in `pagination` of the response.",
    },
    {
      "key": "per_page",
      "label": "Per page",
      "type": "number",
      "hint": "Records per page, 1 to 60 (Salla's documented maximum).",
    },
  ],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "array",
      "label": "Records on this page",
    },
    {
      "key": "pagination",
      "type": "object",
      "label": "count, total, perPage, currentPage, totalPages, links",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get("/customers", {
      keyword: input.keyword,
      date_from: input.date_from,
      date_to: input.date_to,
      fields: toArray(input.fields, "fields"),
      page: input.page,
      per_page: perPage(input.per_page),
    });
  },
};

export default customerList;
