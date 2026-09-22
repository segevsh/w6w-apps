import { assertEquals } from "@std/assert";
import loggedExpenseCreate from "../../actions/logged-expense-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The only create route on this API whose body is wrapped: the model nests under
 * its own name, `{ loggedExpense: { … } }`.
 */
Deno.test("logged-expense-create: POSTs the model nested under `loggedExpense`", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 77, itemName: "Concrete mix" } }]);
  const result = await loggedExpenseCreate.execute({
    jobId: 1010,
    jobPhaseId: 3,
    itemName: "Concrete mix",
    quantity: 2,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/logged_expenses");
  assertEquals(bodyOf(calls[0]), {
    loggedExpense: { jobId: 1010, jobPhaseId: 3, itemName: "Concrete mix", quantity: 2 },
  });
  assertEquals(result.id, 77);
});

Deno.test("logged-expense-create: userId, type and the totals are read-only", () => {
  const keys = (loggedExpenseCreate.params ?? []).map((p) => p.key);
  for (
    const readonly of [
      "userId",
      "type",
      "loggedExpenseStatus",
      "currencySymbol",
      "jobCurrencyTotalExTax",
      "externalId",
    ]
  ) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
