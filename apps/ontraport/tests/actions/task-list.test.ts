import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskList from "../../actions/task-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("task-list: calls GET /1/Tasks", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const out = await taskList.execute({}, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/Tasks");
  assertEquals(out.items.length, 1);
});
