import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import deleteExpense from "../../actions/delete-expense.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("delete-expense: POSTs to the id path", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, errors: {} } }]);
  assertEquals(await deleteExpense.execute({ expenseId: 51023 }, ctx), { success: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/delete_expense/51023");
});

/** "The operation was successful only if `success` is true." */
test("delete-expense: a 200 with success:false throws", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false, errors: {} } }]);
  await assertRejects(
    async () => await deleteExpense.execute({ expenseId: 1 }, ctx),
    Error,
    "success=false",
  );
});

test("delete-expense: an errors payload is preferred over the bare flag", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { success: false, errors: { base: ["You cannot delete that expense"] } },
  }]);
  await assertRejects(
    async () => await deleteExpense.execute({ expenseId: 1 }, ctx),
    Error,
    "You cannot delete that expense",
  );
});

test("delete-expense: is idempotent", () => {
  assertEquals(deleteExpense.idempotent, true);
});
