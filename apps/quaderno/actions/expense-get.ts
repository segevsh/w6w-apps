import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const expenseGet: ActionDefinition<Input> = {
  key: "expense-get",
  type: "read",
  resource: "expense",
  title: "Get Expense",
  description: "Fetch a single expense by ID.",
  params: [
    { key: "id", label: "Expense ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_cents", type: "number", label: "Total (cents)" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request(`/expenses/${input.id}`);
  },
};

export default expenseGet;
