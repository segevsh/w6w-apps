import { assertEquals } from "@std/assert";
import action from "../../actions/account-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-list: GETs /accounts with cursor and limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "a1" }], pagination: { cursor: "n", has_next_page: true } },
  }]);
  const out = await action.execute!({ cursor: "c", limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.usepylon.com/accounts");
  assertEquals(Object.fromEntries(url.searchParams), { cursor: "c", limit: "5" });
  assertEquals(out, { accounts: [{ id: "a1" }], hasNextPage: true, nextCursor: "n" });
});

Deno.test("account-list: the last page has no nextCursor", async () => {
  const { ctx } = mockCtx([{ body: { data: [], pagination: { has_next_page: false } } }]);
  assertEquals(await action.execute!({}, ctx), { accounts: [], hasNextPage: false });
});
