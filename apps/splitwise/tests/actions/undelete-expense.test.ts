import { assert, assertEquals, assertRejects } from "@std/assert";
import undeleteExpense from "../../actions/undelete-expense.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("undelete-expense: POSTs to the id path", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  assertEquals(await undeleteExpense.execute({ expenseId: 51023 }, ctx), { success: true });
  assertEquals(pathOf(calls[0].url), "/api/v3.0/undelete_expense/51023");
});

/**
 * This endpoint's 200 schema declares only `success`, with no `errors` — so
 * when it refuses there is frequently nothing to report but the boolean. The
 * message says exactly that instead of inventing a reason.
 */
Deno.test("undelete-expense: a bare success:false is reported honestly", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false } }]);
  const error = await assertRejects(
    async () => await undeleteExpense.execute({ expenseId: 1 }, ctx),
    Error,
    "success=false",
  );
  assert(/no error detail/.test(error.message), error.message);
});

Deno.test("undelete-expense: is idempotent", () => {
  assertEquals(undeleteExpense.idempotent, true);
});
