import { assertEquals } from "@std/assert";
import action from "../../actions/category-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("category-list: GET /categories maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({ categoryIds: "c1,c2", limit: 250 }, ctx) as {
    categories: unknown[];
    cursor?: string;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/categories");
  assertEquals(queryOf(calls[0].url), { categories_ids: "c1,c2", limit: "250" });
  assertEquals(out.categories.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("category-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
