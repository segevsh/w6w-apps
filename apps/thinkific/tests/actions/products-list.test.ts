import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import productsList from "../../actions/products-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("products-list: fetches GET /products", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: listEnvelope([{ id: 1, productable_type: "Bundle" }]) },
  ]);
  const out = await productsList.execute({ page: 1, limit: 25 }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/public/v1/products");
  assertEquals(out.items, [{ id: 1, productable_type: "Bundle" }]);
});
