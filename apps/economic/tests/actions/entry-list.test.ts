import { assertEquals } from "@std/assert";
import action from "../../actions/entry-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("entry-list: GETs the year's entries with paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: { collection: [{ entryNumber: 1 }], pagination: { results: 1 } },
  }]);
  const out = await action.execute!({ accountingYear: "2022", pageSize: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/accounting-years/2022/entries");
  assertEquals(url.searchParams.get("pagesize"), "10");
  assertEquals(out, { items: [{ entryNumber: 1 }], count: 1, total: 1, hasMore: false });
});

Deno.test("entry-list: encodes the year segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [] } }]);
  await action.execute!({ accountingYear: "2021/22" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/accounting-years/2021%2F22/entries");
});
