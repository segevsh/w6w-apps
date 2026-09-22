import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /products` — list the product catalogue.
 *
 * Pennylane's filter fields here are `id`, `label`, `reference` and
 * `external_reference`; `sort` accepts only `id`.
 */
const listProducts: ActionDefinition<ListInput> = {
  key: "list-products",
  type: "read",
  resource: "product",
  title: "List Products",
  description:
    "List products, one cursor page at a time (GET /products). Filterable on id, label, " +
    "reference and external_reference.",
  params: listParams(100),
  output: [
    { key: "items", type: "array", label: "Products" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/products", {
      query: listQuery(input),
    });
  },
};

export default listProducts;
