import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/product-update.ts";

test("product-update: PUTs /products/{id} with only the set fields", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "prod1" } }]);
  await action.execute({ productId: "prod1", price: 200 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.price, 200);
  assertEquals(body.cost, undefined);
});
