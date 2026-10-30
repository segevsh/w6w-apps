import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import accountCreate from "../../actions/account-create.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("account-create posts account_name and defaults create_profile to false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: 1 } }]);
  const out = await accountCreate.execute({ accountName: "Acme" }, ctx);
  assertEquals(out, { account_id: 1 });
  assertEquals(calls[0].url, `${API_ROOT}/accounts`);
  assertEquals(JSON.parse(calls[0].body!), { account_name: "Acme", create_profile: "false" });
});

test("account-create honors an explicit create_profile", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await accountCreate.execute({ accountName: "Acme", createProfile: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { account_name: "Acme", create_profile: "true" });
});
