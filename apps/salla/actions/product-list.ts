import type { ActionDefinition } from "@w6w/types";
import { perPage, SallaClient } from "../lib/client.ts";

interface Input {
  keyword?: string;
  status?: "hidden" | "sale" | "out";
  category?: string;
  format?: "light";
  page?: number;
  per_page?: number;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description:
    "List the store's products, filtered by keyword (name or SKU), status or category. Needs the `products.read` scope.",

  params: [
    {
      "key": "keyword",
      "label": "Keyword",
      "type": "string",
      "hint": "Matches product name or SKU.",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "hidden",
          "label": "hidden",
        },
        {
          "value": "sale",
          "label": "sale",
        },
        {
          "value": "out",
          "label": "out",
        },
      ],
    },
    {
      "key": "category",
      "label": "Category ID",
      "type": "string",
    },
    {
      "key": "format",
      "label": "Format",
      "type": "select",
      "hint": "`light` returns simplified product data.",
      "options": [
        {
          "value": "light",
          "label": "light",
        },
      ],
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
    return client.get("/products", {
      keyword: input.keyword,
      status: input.status,
      category: input.category,
      format: input.format,
      page: input.page,
      per_page: perPage(input.per_page),
    });
  },
};

export default productList;
