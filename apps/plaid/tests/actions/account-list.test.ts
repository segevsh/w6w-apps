import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("account-list: posts the access token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/accounts/get");
  assertEquals(JSON.parse(calls[0].body!), { access_token: "tok" });
});

Deno.test("account-list: account ids go inside options", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ accessToken: "tok", accountIds: "a1, a2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).options, { account_ids: ["a1", "a2"] });
});

/** Cached, and possibly hours stale. */
Deno.test("account-list: says the balances are cached", () => {
  assert(/CACHED|cache/i.test(action.description!), action.description);
});

Deno.test("account-list: a missing token is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "accessToken");
});
