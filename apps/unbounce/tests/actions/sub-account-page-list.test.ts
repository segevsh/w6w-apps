import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import subAccountPageList from "../../actions/sub-account-page-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("sub-account-page-list: calls GET /sub_accounts/{id}/pages", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await subAccountPageList.execute({ subAccountId: "1552433" }, ctx);
  assertEquals(pathOf(calls[0].url), "/sub_accounts/1552433/pages");
});
