import { assert, assertEquals } from "@std/assert";
import categoryList from "../../actions/category-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("category-list: uses the Category TREES path, not the deprecated flat one", async () => {
  // /v3/catalog/categories carries no `deprecated: true` in the OpenAPI document
  // but IS deprecated on the vendor's Deprecations page. This is the difference.
  const { ctx, calls } = mockCtx([{ body: v3Page([{ category_id: 5 }]) }]);
  const out = await categoryList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/trees/categories");
  assert(!pathOf(calls[0].url).endsWith("/v3/catalog/categories"));
  assertEquals(out.data, [{ category_id: 5 }]);
});

Deno.test("category-list: list filters are :in forms and booleans are true/false", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await categoryList.execute({ treeIds: "1,2", parentIds: "0", isVisible: false }, ctx);
  assertEquals(queryOf(calls[0].url), {
    "tree_id:in": "1,2",
    "parent_id:in": "0",
    is_visible: "false",
  });
});
