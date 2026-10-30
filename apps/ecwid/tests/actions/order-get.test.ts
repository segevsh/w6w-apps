import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import orderGet from "../../actions/order-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("order-get: calls GET /orders/{id} with the public order id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "EBJFT", email: "buyer@example.com" } }]);
  const out = await orderGet.execute({ orderId: "EBJFT" }, ctx) as { email: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/orders/EBJFT");
  assertEquals(out.email, "buyer@example.com");
});

test("order-get: an order id with a prefix and suffix survives the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await orderGet.execute({ orderId: "EG4H2,J77J8" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/orders/EG4H2%2CJ77J8");
});

test("order-get: the id is a string, because Ecwid order ids are not always numeric", () => {
  assertEquals(orderGet.params?.find((p) => p.key === "orderId")?.type, "string");
  assertEquals(orderGet.params?.find((p) => p.key === "orderId")?.required, true);
});
