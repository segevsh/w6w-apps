import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  siteId: string;
  limit?: number;
  offset?: number;
}

/**
 * GET /sites/{site_id}/products — list an e-commerce site's products with their
 * SKUs. `limit`/`offset`/`total` count products only, not the nested SKUs. The
 * response is `{ items: [...], pagination: {...} }`.
 */
const listProducts: ActionDefinition<Input> = {
  key: "list-products",
  type: "read",
  resource: "product",
  title: "List Products",
  description: "List products (and their SKUs) for an e-commerce site.",
  params: [
    { key: "siteId", label: "Site ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max 100.",
      validation: { min: 1, max: 100 },
    },
    { key: "offset", label: "Offset", type: "number", hint: "For pagination." },
  ],
  output: [
    { key: "items", type: "array", label: "Products" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(`/sites/${encodeURIComponent(input.siteId)}/products`, {
      query: { limit: input.limit, offset: input.offset },
    });
  },
};

export default listProducts;
