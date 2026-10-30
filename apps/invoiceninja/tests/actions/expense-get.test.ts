import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/expense-get.ts";

test("expense-get: GETs /expenses/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "e1" } }]);
  await action.execute({ expenseId: "e1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/expenses/e1");
});
