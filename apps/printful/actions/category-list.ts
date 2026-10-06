import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /categories` — List the catalog categories. */
const categoryList: ActionDefinition<Input> = {
  key: "category-list",
  type: "search",
  resource: "category",
  title: "List Categories",
  description: "List the catalog categories.",
  params: [],
  output: [
    { key: "categories", type: "array", label: "Categories" },
  ],

  async execute(_input, ctx) {
    const result = await new PrintfulClient(ctx).request<{ categories?: unknown[] }>(
      "GET",
      "/categories",
    );
    return { categories: result.categories ?? [] };
  },
};

export default categoryList;
