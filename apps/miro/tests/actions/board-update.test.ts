import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-update.ts";

test("board-update: PATCHes only what was set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({ boardId: "b1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

test("board-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
