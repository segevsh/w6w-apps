import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/list-list.ts";

test("list-list: GETs /lists and flattens the results", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: [{ id: "1", type: "lists", attributes: { name: "Volunteers" } }] },
  }]);
  const out = await action.execute({ pageSize: 5 }, ctx) as { items: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/lists");
  assertEquals(url.searchParams.get("page[size]"), "5");
  assertEquals(out.items, [{ id: "1", type: "lists", name: "Volunteers" }]);
});
