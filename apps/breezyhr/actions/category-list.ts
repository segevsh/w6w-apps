import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
}

/** `GET /company/{id}/categories` — built-in plus custom position categories. */
const categoryList: ActionDefinition<Input> = {
  key: "category-list",
  type: "search",
  resource: "company",
  title: "List Position Categories",
  description:
    "List the position categories available to the company (built-in plus custom). Use an `id` as a position's category.",
  params: [companyIdParam],
  output: [{ key: "categories", type: "array", label: "Categories (id, name)" }],

  async execute(input, ctx) {
    return {
      categories: await new BreezyClient(ctx).array(`${company(input.companyId)}/categories`),
    };
  },
};

export default categoryList;
