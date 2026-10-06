import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /expenses/{expenseId}` — Delete an expense.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  expenseId: number;
}

const expenseDelete: ActionDefinition<Input> = {
  key: "expense-delete",
  type: "perform",
  resource: "expense",
  title: "Delete Expense",
  description: "Delete an expense.",
  idempotent: true,
  params: [
    {
      key: "expenseId",
      label: "Expense ID",
      type: "number",
      required: true,
      hint: "Numeric expense id (from List Expenses).",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/expenses/${encodeId(input.expenseId)}`, {
      method: "DELETE",
    });
  },
};

export default expenseDelete;
