import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/categories`
 */
type Input = Record<string, never>;

const categoryList: ActionDefinition<Input> = {
  key: "category-list",
  type: "read",
  resource: "product",
  title: "List Categories",
  description:
    "The full product category list; use a category's `path` as Category when creating or updating products.",
  params: [],
  output: [{ "key": "categories", "type": "array", "label": "Categories" }],

  async execute(_input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/categories`);
    return { categories: body.categories ?? [] };
  },
};

export default categoryList;
