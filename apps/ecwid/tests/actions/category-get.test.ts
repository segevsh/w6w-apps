import { assertEquals } from "@std/assert";
import categoryGet from "../../actions/category-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("category-get: calls GET /categories/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9691094, name: "Fruit" } }]);
  const out = await categoryGet.execute({ categoryId: "9691094" }, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/categories/9691094");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.name, "Fruit");
});

Deno.test("category-get: productIds is only sent when asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await categoryGet.execute({ categoryId: "1", productIds: true }, ctx);
  assertEquals(queryOf(calls[0].url), { productIds: "true" });
});

Deno.test("category-get: the id is required", () => {
  assertEquals(categoryGet.params?.find((p) => p.key === "categoryId")?.required, true);
});
