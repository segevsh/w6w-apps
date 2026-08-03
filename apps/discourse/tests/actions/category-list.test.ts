import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/category-list.ts";

Deno.test("category-list: GETs /categories.json and keeps the envelope", async () => {
  const body = { category_list: { can_create_category: true, categories: [{ id: 1, name: "A" }] } };
  const { ctx, calls } = mockDiscourseCtx([{ body }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/categories.json`);
  // Returned whole: `category_list` also carries `can_create_category` and the
  // paging flags a caller may want.
  assertEquals(out, body);
});

Deno.test("category-list: include_subcategories is sent by presence, never as false", async () => {
  // The endpoint's enum for this flag is `[true]` — only its presence means
  // anything, and `false` might well be read as truthy.
  const on = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ includeSubcategories: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("include_subcategories"), "true");

  const off = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ includeSubcategories: false }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.has("include_subcategories"), false);
});
