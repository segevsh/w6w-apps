import { assertEquals } from "@std/assert";
import loggedExpensePurchaseOrderGet from "../../actions/logged-expense-purchase-order-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-expense-purchase-order-get: reads the purchase order route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 900, number: "PO-001234" } }]);
  const result = await loggedExpensePurchaseOrderGet.execute(
    { loggedExpenseId: 77 },
    ctx,
  ) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/logged_expenses/77/purchase_order");
  assertEquals(result.number, "PO-001234");
});

/** The vendor documents `null` here as a successful answer, and so does the action. */
Deno.test("logged-expense-purchase-order-get: null is not turned into an error", async () => {
  const { ctx } = mockCtx([{ body: null }]);
  const result = await loggedExpensePurchaseOrderGet.execute({ loggedExpenseId: 77 }, ctx);
  assertEquals(result, null);
  assertEquals(
    /Returns null when the expense is not a purchase order/.test(
      loggedExpensePurchaseOrderGet.description ?? "",
    ),
    true,
  );
});
