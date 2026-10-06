import { assertEquals } from "@std/assert";
import smartCategoryList from "../../actions/smart-category-list.ts";
import { mockCtx, pageBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("smart-category-list: GET /v1/smart_categories/ with ordering", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([{ uuid: "c1", name: "Pricing" }]) }]);
  const out = await smartCategoryList.execute({ order: "-name" }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/smart_categories/");
  assertEquals(queryOf(calls[0].url), { o: "-name" });
  assertEquals(out.results.length, 1);
});

Deno.test("smart-category-list: with no filters the URL has no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([]) }]);
  await smartCategoryList.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.avoma.com/v1/smart_categories/");
});
