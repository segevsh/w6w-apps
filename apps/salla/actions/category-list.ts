import type { ActionDefinition } from "@w6w/types";
import { perPage, SallaClient, toArray } from "../lib/client.ts";

interface Input {
  keyword?: string;
  status?: "active" | "hidden";
  with?: string | number | Array<string | number>;
  page?: number;
  per_page?: number;
}

const categoryList: ActionDefinition<Input> = {
  key: "category-list",
  type: "search",
  resource: "category",
  title: "List Categories",
  description: "List the store's categories. Needs the `categories.read` scope.",

  params: [
    {
      "key": "keyword",
      "label": "Keyword",
      "type": "string",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "active",
          "label": "active",
        },
        {
          "value": "hidden",
          "label": "hidden",
        },
      ],
    },
    {
      "key": "with",
      "label": "Include",
      "type": "string",
      "hint": "Comma-separated: translations, items.",
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
    return client.get("/categories", {
      keyword: input.keyword,
      status: input.status,
      with: toArray(input.with, "with"),
      page: input.page,
      per_page: perPage(input.per_page),
    });
  },
};

export default categoryList;
