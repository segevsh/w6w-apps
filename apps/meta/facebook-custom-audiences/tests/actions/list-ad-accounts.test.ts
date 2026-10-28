import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-ad-accounts.ts";

Deno.test("list-ad-accounts: GET /me/adaccounts with fields, limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "act_1" }], paging: {} } }]);
  const out = await action.execute({ limit: 10, cursor: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v25.0/me/adaccounts");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("after"), "abc");
  assert(url.searchParams.get("fields")!.includes("account_status"));
  assertEquals(out.data[0].id, "act_1");
});
