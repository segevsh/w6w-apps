import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/expense-update.ts";

test("expense-update: PUTs /expenses/{id} with only the set fields", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "e1" } }]);
  await action.execute({ expenseId: "e1", amount: 10 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.amount, 10);
  assertEquals(body.date, undefined);
});
