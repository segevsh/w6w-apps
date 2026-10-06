import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  filter?: string;
  sortBy?: string;
  articleNumber?: string;
  description?: string;
  ean?: string;
  supplierNumber?: string;
  manufacturer?: string;
  lastModified?: string;
}

const articleList: ActionDefinition<Input> = {
  key: "article-list",
  type: "search",
  resource: "article",
  title: "List Articles",
  description: "List articles sorted by article number.",
  params: [
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in MetaInformation of the response.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Records per page: 1 to 500 (Fortnox default 100).",
    },
    {
      "key": "filter",
      "label": "Status filter",
      "type": "select",
      "options": [
        {
          "value": "active",
          "label": "active",
        },
        {
          "value": "inactive",
          "label": "inactive",
        },
      ],
    },
    {
      "key": "sortBy",
      "label": "Sort by",
      "type": "select",
      "options": [
        {
          "value": "articlenumber",
          "label": "articlenumber",
        },
        {
          "value": "quantityinstock",
          "label": "quantityinstock",
        },
        {
          "value": "reservedquantity",
          "label": "reservedquantity",
        },
        {
          "value": "stockvalue",
          "label": "stockvalue",
        },
      ],
    },
    {
      "key": "articleNumber",
      "label": "Article number",
      "type": "string",
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "ean",
      "label": "EAN",
      "type": "string",
    },
    {
      "key": "supplierNumber",
      "label": "Supplier number",
      "type": "string",
    },
    {
      "key": "manufacturer",
      "label": "Manufacturer",
      "type": "string",
    },
    {
      "key": "lastModified",
      "label": "Last modified since",
      "type": "string",
      "hint": "Only records changed since this timestamp, e.g. 2026-10-01 or 2026-10-01 08:00.",
    },
  ],
  output: [
    {
      "key": "Articles",
      "type": "array",
      "label": "Articles",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/articles", {
      page: input.page,
      limit: input.limit,
      filter: input.filter,
      sortby: input.sortBy,
      articlenumber: input.articleNumber,
      description: input.description,
      ean: input.ean,
      suppliernumber: input.supplierNumber,
      manufacturer: input.manufacturer,
      lastmodified: input.lastModified,
    });
  },
};

export default articleList;
