import { assertEquals, assertRejects } from "@std/assert";
import transactionRefund from "../../actions/transaction-refund.ts";
import { errorBody, formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-refund: calls POST /refund with order_id and reference", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, message: "This refund has been issued successfully." } },
  ]);
  const out = await transactionRefund.execute(
    { orderId: "851362", reference: "product-299" },
    ctx,
  ) as { success: boolean };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/refund");
  assertEquals(formOf(calls[0]), { order_id: "851362", reference: "product-299" });
  assertEquals(out.success, true);
});

Deno.test("transaction-refund: is not idempotent", () => {
  assertEquals(transactionRefund.idempotent, false);
});

Deno.test("transaction-refund: a 404 surfaces the vendor's error text", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("The requested charge could not be identified.") },
  ]);
  const err = await assertRejects(() =>
    Promise.resolve(transactionRefund.execute({ orderId: "x", reference: "y" }, ctx))
  );
  assertEquals(
    (err as Error).message.includes("The requested charge could not be identified."),
    true,
  );
});
