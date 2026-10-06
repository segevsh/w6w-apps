import { assertEquals } from "@std/assert";
import action from "../../actions/customer-list.ts";
import { LIST_META, mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: sends paging and date range, returns {items, meta}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok([{ id: 1 }], LIST_META) }]);
  const out = await action.execute(
    { perPage: 10, page: 3, from: "2026-01-01", to: "2026-02-01" },
    ctx,
  );
  assertEquals(out, { items: [{ id: 1 }], meta: LIST_META });
  assertEquals(pathOf(calls[0].url), "/customer");
  assertEquals(queryOf(calls[0].url).perPage, "10");
  assertEquals(queryOf(calls[0].url).page, "3");
  assertEquals(queryOf(calls[0].url).from, "2026-01-01");
  assertEquals(queryOf(calls[0].url).to, "2026-02-01");
});
