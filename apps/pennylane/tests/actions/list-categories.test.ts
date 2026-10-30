import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-categories.ts";

const PAGE = {
  items: [{ id: 9, label: "Travel", analytical_code: "TRAVEL" }],
  has_more: true,
  next_cursor: "abc",
};

test("list-categories: GETs /categories", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({ cursor: "abc" }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/external/v2/categories");
  assertEquals(url.searchParams.get("cursor"), "abc");
  assertEquals(res, PAGE);
});

test("list-categories: filters on the owning category group", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute(
    { filter: [{ field: "category_group_id", operator: "eq", value: 42 }] },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    '[{"field":"category_group_id","operator":"eq","value":42}]',
  );
});
