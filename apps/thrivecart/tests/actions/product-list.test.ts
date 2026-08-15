import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-list: calls GET /products and wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ product_id: "1" }, { product_id: "2" }] }]);
  const out = await productList.execute({}, ctx) as { items: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/products");
  assertEquals(out.items.length, 2);
});

Deno.test("product-list: an empty body is returned as an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await productList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
