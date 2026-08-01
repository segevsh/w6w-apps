import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-capture.ts";

Deno.test("order-capture: posts to /capture with Prefer: return=representation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ORD-1", status: "COMPLETED" } }]);
  const result = await action.execute!({ orderId: "ORD-1" }, ctx);

  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/checkout/orders/ORD-1/capture");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["prefer"], "return=representation");
  assertEquals(calls[0].body, "{}");
  assertEquals(result, { id: "ORD-1", status: "COMPLETED" });
});

Deno.test("order-capture: stamps PayPal-Request-Id from the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  (ctx as { invocation?: unknown }).invocation = { invocationId: "inv-42" };
  await action.execute!({ orderId: "ORD-1" }, ctx);
  assertEquals(calls[0].headers["paypal-request-id"], "inv-42");
});

Deno.test("order-capture: orderId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ orderId: "" }, ctx)),
    Error,
    "`orderId`",
  );
  assertEquals(calls.length, 0);
});
