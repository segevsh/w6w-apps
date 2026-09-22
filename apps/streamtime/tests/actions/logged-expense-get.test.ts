import { assertEquals } from "@std/assert";
import loggedExpenseGet from "../../actions/logged-expense-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-expense-get: reads GET /v2/logged_expenses/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 77, loggedExpenseStatus: "Approved", loggedExpenseStatusId: 2 } },
  ]);
  const result = await loggedExpenseGet.execute({ loggedExpenseId: 77 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/logged_expenses/77");
  // Both the id and the name are on the model — the id is what the update route writes.
  assertEquals(result.loggedExpenseStatusId, 2);
});
