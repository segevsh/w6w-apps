import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/common.ts";

interface Input {
  q?: string;
  limit?: number;
  createdBefore?: number;
}

const itemList: ActionDefinition<Input> = {
  key: "item-list",
  type: "search",
  resource: "item",
  title: "List Items",
  description: "List products (items) in the catalog, newest first.",
  params: [
    { key: "q", label: "Search", type: "string", hint: "Matches name or code." },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new QuadernoClient(ctx).list("/items", {
      q: input.q,
      limit: input.limit,
      created_before: input.createdBefore,
    });
  },
};

export default itemList;
