import { assertEquals } from "@std/assert";
import categorySearch from "../../actions/category-search.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("category-search: calls GET /categories and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ id: 9691094, name: "Fruit" }]) }]);
  const out = await categorySearch.execute({ limit: 50 }, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/categories");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.items, [{ id: 9691094, name: "Fruit" }]);
});

Deno.test("category-search: the tree walkers are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await categorySearch.execute(
    {
      keyword: "fruit",
      parent: 0,
      parentIds: "9691094,9691095",
      withSubcategories: true,
      hidden_categories: false,
      lang: "en",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    keyword: "fruit",
    parent: "0",
    parentIds: "9691094,9691095",
    withSubcategories: "true",
    // Disabled categories are excluded by default, so `false` is a real filter.
    hidden_categories: "false",
    lang: "en",
  });
});

Deno.test("category-search: disabled categories are excluded unless asked for", () => {
  const param = categorySearch.params?.find((p) => p.key === "hidden_categories");
  assertEquals(param?.default, undefined);
});
