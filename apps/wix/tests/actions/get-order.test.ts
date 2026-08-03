import { assertEquals } from "@std/assert";
import action from "../../actions/get-order.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-order: GETs /ecom/v1/orders/{id}", async () => {
  const body = { order: { id: "o1", number: "10001" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ orderId: "o1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/ecom/v1/orders/o1");
  assertEquals(out, body);
});

Deno.test("get-order: percent-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ orderId: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/ecom/v1/orders/a%2Fb");
});

Deno.test("get-order: is a read action", () => {
  assertEquals(action.type, "read");
});
