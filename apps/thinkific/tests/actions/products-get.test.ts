import { assertEquals } from "@std/assert";
import productsGet from "../../actions/products-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("products-get: fetches GET /products/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: 6, productable_id: 6, productable_type: "Course" } },
  ]);
  const out = await productsGet.execute({ id: "6" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/products/6");
  assertEquals(out, { id: 6, productable_id: 6, productable_type: "Course" });
});
