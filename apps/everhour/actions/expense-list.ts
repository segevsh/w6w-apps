import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /expenses` — List all expenses.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const expenseList: ActionDefinition<Input> = {
  key: "expense-list",
  type: "search",
  resource: "expense",
  title: "List Expenses",
  description: "List all expenses.",
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
    return new EverhourClient(ctx).many(`/expenses`);
  },
};

export default expenseList;
