import { assertEquals } from "@std/assert";
import productGet from "../../actions/product-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-get: calls GET /products/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 692730761, name: "Widget" } }]);
  const out = await productGet.execute({ productId: "692730761" }, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products/692730761");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.name, "Widget");
});

Deno.test("product-get: the language switch is sent when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await productGet.execute({ productId: "1", lang: "nl" }, ctx);
  assertEquals(queryOf(calls[0].url), { lang: "nl" });
});

Deno.test("product-get: an id with a path separator cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await productGet.execute({ productId: "1/../profile" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products/1%2F..%2Fprofile");
});
