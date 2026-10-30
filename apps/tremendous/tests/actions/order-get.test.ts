import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import orderGet from "../../actions/order-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("order-get: fetches by id and unwraps the order", async () => {
  const order = { id: "PWU1IKBP333U", status: "EXECUTED" };
  const { ctx, calls } = mockCtx([{ status: 200, body: { order } }]);
  const result = await orderGet.execute({ id: "PWU1IKBP333U" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/orders/PWU1IKBP333U");
  assertEquals(result, order);
});

test("order-get: accepts an external_id in place of the Tremendous id", async () => {
  const order = { id: "PWU1IKBP333U", external_id: "my-ref-123" };
  const { ctx, calls } = mockCtx([{ status: 200, body: { order } }]);
  await orderGet.execute({ id: "my-ref-123" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/orders/my-ref-123");
});
