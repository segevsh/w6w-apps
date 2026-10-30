import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import categoryTreeList from "../../actions/category-tree-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

test("category-tree-list: GETs /v3/catalog/trees", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 1, name: "Default" }]) }]);
  const out = await categoryTreeList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/trees");
  assertEquals(out.data, [{ id: 1, name: "Default" }]);
});

test("category-tree-list: filters by tree and channel as :in lists", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await categoryTreeList.execute({ ids: "1", channelIds: "1,2" }, ctx);
  assertEquals(queryOf(calls[0].url), { "id:in": "1", "channel_id:in": "1,2" });
});
