import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pageGroupPageList from "../../actions/page-group-page-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("page-group-page-list: calls GET /page_groups/{id}/pages", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await pageGroupPageList.execute({ pageGroupId: "849893" }, ctx);
  assertEquals(pathOf(calls[0].url), "/page_groups/849893/pages");
});
