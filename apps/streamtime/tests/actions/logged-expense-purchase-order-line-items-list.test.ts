import { assertEquals } from "@std/assert";
import loggedExpensePurchaseOrderLineItemsList from "../../actions/logged-expense-purchase-order-line-items-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-expense-purchase-order-line-items-list: reads the lines", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Cement", quantity: "10" }] }]);
  const result = await loggedExpensePurchaseOrderLineItemsList.execute(
    { loggedExpenseId: 77 },
    ctx,
  ) as { purchaseOrderLineItems: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/logged_expenses/77/purchase_order_line_items");
  assertEquals(result.purchaseOrderLineItems.length, 1);
});

/** The sibling route answers `null`; this one answers an empty list. */
Deno.test("logged-expense-purchase-order-line-items-list: an empty list is a real answer", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(
    await loggedExpensePurchaseOrderLineItemsList.execute({ loggedExpenseId: 77 }, ctx),
    { purchaseOrderLineItems: [] },
  );
});
