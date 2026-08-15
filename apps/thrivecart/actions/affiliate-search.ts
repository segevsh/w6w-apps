import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam, paginationParams } from "../lib/params.ts";

/** `GET /affiliates` — search affiliates by product, name, email or ID. */
interface Input {
  productId?: string;
  query?: string;
  page?: number;
  perPage?: number;
  mode?: string;
}

const affiliateSearch: ActionDefinition<Input> = {
  key: "affiliate-search",
  type: "search",
  resource: "affiliate",
  title: "Search Affiliates",
  description: "Search for affiliates by the product they're approved for, or by name/email/ID.",
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      hint: "Optional. Restrict to affiliates approved for this product.",
    },
    { key: "query", label: "Search query", type: "string" },
    ...paginationParams(5),
    modeParam,
  ],
  output: [
    { key: "affiliates", type: "array", label: "Affiliates" },
    { key: "meta", type: "object", label: "Result count (total, results)" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get("/affiliates", {
      query: {
        product_id: input.productId,
        query: input.query,
        page: input.page,
        perPage: input.perPage,
      },
      mode: input.mode,
    });
  },
};

export default affiliateSearch;
