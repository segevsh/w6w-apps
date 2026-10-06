import type { ActionDefinition } from "@w6w/types";
import { LushaClient } from "../lib/client.ts";

type Input = Record<string, never>;

const action: ActionDefinition<Input> = {
  key: "company-filter-list",
  type: "read",
  resource: "company",
  title: "List Company Filter Types",
  description:
    "The filter types Prospect Companies accepts, and whether each needs a search query.",
  params: [],
  output: [
    { key: "availableFilters", type: "array", label: "Filter types" },
  ],

  execute(_input, ctx) {
    return new LushaClient(ctx).request("GET", `/v3/companies/prospecting/filters`, {});
  },
};

export default action;
