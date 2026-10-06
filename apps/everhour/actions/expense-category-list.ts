import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /expenses/categories` — List expense categories.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const expenseCategoryList: ActionDefinition<Input> = {
  key: "expense-category-list",
  type: "search",
  resource: "expense-category",
  title: "List Expense Categories",
  description: "List expense categories.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(_input, ctx) {
    return new EverhourClient(ctx).many(`/expenses/categories`);
  },
};

export default expenseCategoryList;
