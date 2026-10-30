import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("account-get: GETs /accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { account: { id: "a1" } } }]);
  const out = await accountGet.execute({ id: "a1" }, ctx) as { account: { id: string } };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/accounts/a1");
  assertEquals(out.account.id, "a1");
});
