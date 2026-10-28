import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

Deno.test("account-list: lists accounts, trashed ones only when asked", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { accounts: [{ name: "accounts/1" }] } },
    { status: 200, body: { accounts: [] } },
  ], { display: {} });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("showDeleted"), null);
  await action.execute!({ showDeleted: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("showDeleted"), "true");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/accounts");
});
