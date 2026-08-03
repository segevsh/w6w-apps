import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-get.ts";

Deno.test("order-get: GETs /v2/orders/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { order: { id: "o1" } } }]);
  await action.execute({ orderId: "o1" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/orders/o1");
});
