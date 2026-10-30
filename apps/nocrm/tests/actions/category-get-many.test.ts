import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/category-get-many.ts";

test("category-get-many: sends include_tags only when the caller sets it", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [{ id: 12, name: "Origin" }] }]);
  const page = await action.execute({ includeTags: true }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/categories?include_tags=true");
  assertEquals(page.items, [{ id: 12, name: "Origin" }]);
});

test("category-get-many: an explicit false is kept, an unset value is not sent", async () => {
  const withFalse = mockNocrmCtx([{ body: [] }]);
  await action.execute({ includeTags: false }, withFalse.ctx);
  assertEquals(
    withFalse.calls[0].url,
    "https://acme.nocrm.io/api/v2/categories?include_tags=false",
  );

  const unset = mockNocrmCtx([{ body: [] }]);
  await action.execute({}, unset.ctx);
  assertEquals(unset.calls[0].url, "https://acme.nocrm.io/api/v2/categories");
});
