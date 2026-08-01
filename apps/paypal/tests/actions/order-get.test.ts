import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-get.ts";

Deno.test("order-get: fetches the order by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ORD-1", status: "COMPLETED" } }]);
  const result = await action.execute!({ orderId: "ORD-1" }, ctx);
  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/checkout/orders/ORD-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "ORD-1", status: "COMPLETED" });
});

Deno.test("order-get: orderId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ orderId: "" }, ctx)),
    Error,
    "`orderId`",
  );
  assertEquals(calls.length, 0);
});
