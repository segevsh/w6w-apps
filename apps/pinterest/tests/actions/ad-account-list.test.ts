import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import adAccountList from "../../actions/ad-account-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("ad-account-list: calls GET /ad_accounts", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "1" }], bookmark: null } }]);
  const out = await adAccountList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v5/ad_accounts");
  assertEquals(out.items.length, 1);
});

test("ad-account-list: forwards include_shared_accounts and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await adAccountList.execute({ includeSharedAccounts: false, pageSize: 10 }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.include_shared_accounts, "false");
  assertEquals(q.page_size, "10");
});
