import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import orderGet from "../../actions/order-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("order-get: calls GET /1/Order?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await orderGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1/Order");
  assertEquals(queryOf(calls[0].url), { id: "1" });
});
