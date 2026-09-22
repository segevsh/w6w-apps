import { assertEquals } from "@std/assert";
import loggedExpenseUpdate from "../../actions/logged-expense-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** The update route takes the BARE model, unlike the create route. */
Deno.test("logged-expense-update: PUTs the bare model, status id included", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 77 } }]);
  await loggedExpenseUpdate.execute({
    loggedExpenseId: 77,
    loggedExpenseStatusId: 3,
    sellRate: 150,
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/logged_expenses/77");
  assertEquals(bodyOf(calls[0]), { loggedExpenseStatusId: 3, sellRate: 150 });
  assertEquals("loggedExpense" in bodyOf(calls[0]), false);
});

Deno.test("logged-expense-update: purchaseOrderId is read-only", () => {
  assertEquals((loggedExpenseUpdate.params ?? []).some((p) => p.key === "purchaseOrderId"), false);
});
