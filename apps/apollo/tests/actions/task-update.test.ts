import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskUpdate from "../../actions/task-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-update: PATCHes /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { task: { id: "t1", note: "Left a voicemail" } } }]);
  const out = await taskUpdate.execute({ id: "t1", note: "Left a voicemail" }, ctx) as {
    task: { note: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/t1");
  assertEquals(out.task.note, "Left a voicemail");
});

test("task-update: idempotent", () => {
  assertEquals(taskUpdate.idempotent, true);
});
