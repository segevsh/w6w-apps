import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/list-accounts.ts";

test("list-accounts: GETs /v2/accounts, not the account-scoped path", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { accounts: [{ id: "1234567" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/accounts");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { accounts: [{ id: "1234567" }] });
});

test("list-accounts: defaults to an empty array", async () => {
  const { ctx } = mockDripCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { accounts: [] });
});
