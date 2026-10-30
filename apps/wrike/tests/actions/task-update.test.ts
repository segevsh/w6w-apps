import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskUpdate from "../../actions/task-update.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

test("task-update: PUTs to /tasks/{taskId} with add/remove assignee lists", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "T1", title: "x", status: "Active" }]) },
  ]);
  await taskUpdate.execute(
    { taskId: "T1", addResponsibles: ["U1", "U2"], removeResponsibles: "U3" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/T1");
  assertEquals(queryOf(calls[0].url), {
    addResponsibles: '["U1","U2"]',
    removeResponsibles: '["U3"]',
  });
});

test("task-update: is declared idempotent — add/remove merges rather than replaces", () => {
  assertEquals(taskUpdate.idempotent, true);
});
