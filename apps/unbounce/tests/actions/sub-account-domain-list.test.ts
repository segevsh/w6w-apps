import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import subAccountDomainList from "../../actions/sub-account-domain-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("sub-account-domain-list: calls GET /sub_accounts/{id}/domains", async () => {
  const { ctx, calls } = mockCtx([{ body: { domains: [] } }]);
  await subAccountDomainList.execute({ subAccountId: "1552433" }, ctx);
  assertEquals(pathOf(calls[0].url), "/sub_accounts/1552433/domains");
});
