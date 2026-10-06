import { assertEquals } from "@std/assert";
import action from "../../actions/issue-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-search: POSTs a parsed filter, text and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "i1" }], pagination: { cursor: "n", has_next_page: true } },
  }]);
  const filter = { field: "state", operator: "in", values: ["new", "on_hold"] };
  const out = await action.execute!({
    filter: JSON.stringify(filter),
    searchText: "refund",
    cursor: "c",
    limit: 10,
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    filter,
    search_text: "refund",
    cursor: "c",
    limit: 10,
  });
  assertEquals(out, { issues: [{ id: "i1" }], hasNextPage: true, nextCursor: "n" });
});

Deno.test("issue-search: no input sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { issues: [], hasNextPage: false });
});
