import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import accountList from "../../actions/account-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("account-list: calls GET /accounts with only sort_order", async () => {
  const { ctx, calls } = mockCtx([{ body: { accounts: [], metadata: { count: 0 } } }]);
  await accountList.execute({ sortOrder: "desc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/accounts");
  assertEquals(queryOf(calls[0].url), { sort_order: "desc" });
});

test("account-list: no query params when none are supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { accounts: [] } }]);
  await accountList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
