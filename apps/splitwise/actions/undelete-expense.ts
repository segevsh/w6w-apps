import type { ActionDefinition } from "@w6w/types";
import { encodeId, SplitwiseClient } from "../lib/client.ts";
import { expenseIdParam } from "../lib/params.ts";

/**
 * `POST /undelete_expense/{id}` — restore a deleted expense.
 *
 * > **Note**: 200 OK does not indicate a successful response. The operation was
 * > successful only if `success` is true.
 *
 * Note the asymmetry with Delete Expense: this endpoint's 200 schema declares
 * only `success`, with **no** `errors` property, so when it refuses there is
 * frequently nothing to report but the boolean itself. `lib/client.ts` says
 * exactly that rather than inventing a reason — `success=false with no error
 * detail` is the honest message.
 *
 * Marked `idempotent: true` — restoring an already-restored expense converges.
 */
interface Input {
  expenseId: number;
}

const undeleteExpense: ActionDefinition<Input> = {
  key: "undelete-expense",
  type: "perform",
  resource: "expense",
  title: "Undelete Expense",
  description: "Restore an expense deleted with Delete Expense.",
  idempotent: true,
  params: [expenseIdParam],
  output: [{ key: "success", type: "boolean", label: "Restored" }],

  async execute(input, ctx) {
    const id = encodeId(input.expenseId, "expenseId");
    await new SplitwiseClient(ctx).request(`/undelete_expense/${id}`, { method: "POST" });
    return { success: true };
  },
};

export default undeleteExpense;
