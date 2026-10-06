import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-category-ids",
  type: "read",
  resource: "categories",
  title: "List Category IDs",
  description:
    "Every coin category as {category_id, name} (GET /coins/categories/list). The category_id " +
    "feeds the Category filter of List Coin Markets.",
  params: [],
  output: [{ key: "categories", type: "array", label: "Categories: category_id, name" }],

  async execute(_input, ctx) {
    const categories = await new CoinGeckoClient(ctx).get("/coins/categories/list");
    return { categories };
  },
};

export default action;
