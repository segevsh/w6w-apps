import type { ActionDefinition } from "@w6w/types";
import { encodeId, SplitwiseClient } from "../lib/client.ts";
import { expenseIdParam } from "../lib/params.ts";

/**
 * `POST /delete_expense/{id}` — delete an expense.
 *
 * > **Note**: 200 OK does not indicate a successful response. The operation was
 * > successful only if `success` is true.
 *
 * The 200 body is `{"success": boolean, "errors": object}` and `success` is the
 * schema's only `required` property. `lib/client.ts` treats a present-but-false
 * `success` as a failure, so this action returns only when the expense really
 * went away.
 *
 * The delete is a soft one: the expense stays readable through Get Expense with
 * `deleted_at` and `deleted_by` populated, keeps appearing in List Expenses,
 * and comes back with Undelete Expense.
 *
 * Marked `idempotent: true` — deleting an already-deleted expense converges.
 */
interface Input {
  expenseId: number;
}

const deleteExpense: ActionDefinition<Input> = {
  key: "delete-expense",
  type: "perform",
  resource: "expense",
  title: "Delete Expense",
  description:
    "Delete an expense. Soft: it stays readable with a `deleted_at` and can be restored with " +
    "Undelete Expense.",
  idempotent: true,
  params: [expenseIdParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const id = encodeId(input.expenseId, "expenseId");
    await new SplitwiseClient(ctx).request(`/delete_expense/${id}`, { method: "POST" });
    return { success: true };
  },
};

export default deleteExpense;
