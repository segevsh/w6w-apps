import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /categories` — list analytic categories.
 *
 * Pennylane's analytic categories are what bank transactions and invoices get
 * tagged with; the list returns both standalone categories and, nested under
 * `category_group`, the group each belongs to. Filter fields are `id`, `label`,
 * `category_group_id` and `analytical_code`; `sort` accepts only `id`.
 */
const listCategories: ActionDefinition<ListInput> = {
  key: "list-categories",
  type: "read",
  resource: "category",
  title: "List Categories",
  description:
    "List analytic categories, one cursor page at a time (GET /categories). Filterable on id, " +
    "label, category_group_id and analytical_code.",
  params: listParams(100),
  output: [
    { key: "items", type: "array", label: "Categories" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/categories", {
      query: listQuery(input),
    });
  },
};

export default listCategories;
