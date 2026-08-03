import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/category-topic-list.ts";

Deno.test("category-topic-list: GETs /c/{slug}/{id}.json — both segments required", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { topic_list: { topics: [] } } }]);
  await action.execute({ slug: "support", categoryId: 7 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/c/support/7.json`);
});

Deno.test("category-topic-list: encodes a slug rather than concatenating it", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ slug: "a b/c", categoryId: 1 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/c/a%20b%2Fc/1.json`);
});

Deno.test("category-topic-list: both path parts are required params", () => {
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["slug", "categoryId"]);
});
