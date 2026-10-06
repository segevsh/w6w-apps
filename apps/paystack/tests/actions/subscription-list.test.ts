import { assertEquals } from "@std/assert";
import action from "../../actions/subscription-list.ts";
import { LIST_META, mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-list: filters by customer and plan", async () => {
  const { ctx, calls } = mockCtx([{ body: ok([{ id: 1 }], LIST_META) }]);
  const out = await action.execute({ customer: "12", plan: "34", perPage: 1 }, ctx);
  assertEquals(out, { items: [{ id: 1 }], meta: LIST_META });
  assertEquals(pathOf(calls[0].url), "/subscription");
  assertEquals(queryOf(calls[0].url).customer, "12");
  assertEquals(queryOf(calls[0].url).plan, "34");
  assertEquals(queryOf(calls[0].url).perPage, "1");
});
