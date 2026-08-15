import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {}

/**
 * `GET /products` — list Products. A Product is the sellable wrapper around a
 * Course or a Bundle (`productable_type` on each item is `"Course"` or
 * `"Bundle"`, `productable_id` its underlying Course/Bundle id) — this is
 * also the only way to discover which Bundles exist, since `/bundles` has no
 * list endpoint of its own (see `bundles-get.ts`).
 */
const productsList: ActionDefinition<Input> = {
  key: "products-list",
  type: "read",
  resource: "products",
  title: "List Products",
  description: "Retrieve a paginated list of Products (Courses and Bundles) on this Site.",
  params: paginationParams(),
  output: [
    { key: "items", type: "array", label: "Products" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).list("/products", { query: paginationQuery(input) });
  },
};

export default productsList;
