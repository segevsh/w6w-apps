import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import complete from "../../actions/task-complete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-complete: POSTs /v1/tasks/{id}/complete with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { toDosUpdated: 1 } }]);
  const out = await complete.execute({ taskId: 77 }, ctx) as { toDosUpdated: number };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/77/complete");
  assertEquals(calls[0].body, null);
  assertEquals(out.toDosUpdated, 1);
});

test("task-complete: requires a task id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() => Promise.resolve(complete.execute({ taskId: "" }, ctx)));
});
