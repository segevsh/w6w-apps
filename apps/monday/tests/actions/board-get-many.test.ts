import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-get-many.ts";

test("board-get-many: defaults to page 1, limit 50", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { boards: [] } } }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { page: 1, limit: 50 });
});

test("board-get-many: passes through page and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { boards: [] } } }]);
  await action.execute({ page: 3, limit: 25 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { page: 3, limit: 25 });
});
