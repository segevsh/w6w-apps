import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-order.ts";

Deno.test("get-order: GETs /v2/sites/{id}/orders/{orderId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { orderId: "o1" } }]);
  await action.execute!({ siteId: "s1", orderId: "o1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/sites/s1/orders/o1");
  assertEquals(calls[0].method, "GET");
});
