import { assertEquals } from "@std/assert";
import action from "../../actions/refund-list.ts";
import { LIST_META, mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

Deno.test("refund-list: GETs /refund with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: ok([{ id: 9 }], LIST_META) }]);
  assertEquals(await action.execute({ perPage: 2, page: 1 }, ctx), {
    items: [{ id: 9 }],
    meta: LIST_META,
  });
  assertEquals(pathOf(calls[0].url), "/refund");
  assertEquals(queryOf(calls[0].url).perPage, "2");
});
