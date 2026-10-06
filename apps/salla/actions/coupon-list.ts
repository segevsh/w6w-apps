import type { ActionDefinition } from "@w6w/types";
import { perPage, SallaClient } from "../lib/client.ts";

interface Input {
  keyword?: string;
  page?: number;
  per_page?: number;
}

const couponList: ActionDefinition<Input> = {
  key: "coupon-list",
  type: "search",
  resource: "coupon",
  title: "List Coupons",
  description: "List the store's discount coupons. Needs the `marketing.read` scope.",

  params: [
    {
      "key": "keyword",
      "label": "Keyword",
      "type": "string",
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
    return client.get("/coupons", {
      keyword: input.keyword,
      page: input.page,
      per_page: perPage(input.per_page),
    });
  },
};

export default couponList;
