import { assertEquals } from "@std/assert";
import action from "../../actions/account-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-search: POSTs the filter and fuzzy text", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "a1" }], pagination: { cursor: "n", has_next_page: true } },
  }]);
  const filter = { field: "domains", operator: "contains", value: "acme.com" };
  const out = await action.execute!({ filter, searchText: "acme", limit: 3 }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/accounts/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { filter, search_text: "acme", limit: 3 });
  assertEquals(out, { accounts: [{ id: "a1" }], hasNextPage: true, nextCursor: "n" });
});
