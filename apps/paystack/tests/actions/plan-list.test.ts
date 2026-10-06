import { assertEquals } from "@std/assert";
import action from "../../actions/plan-list.ts";
import { LIST_META, mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

Deno.test("plan-list: filters by interval and amount", async () => {
  const { ctx, calls } = mockCtx([{ body: ok([], LIST_META) }]);
  assertEquals(await action.execute({ interval: "weekly", amount: 100 }, ctx), {
    items: [],
    meta: LIST_META,
  });
  assertEquals(pathOf(calls[0].url), "/plan");
  assertEquals(queryOf(calls[0].url).interval, "weekly");
  assertEquals(queryOf(calls[0].url).amount, "100");
});
