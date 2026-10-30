import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task.ts";

test("update-task: PUTs /task/{id}/ to mark work complete", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "task_1" } }]);
  await action.execute({ taskId: "task_1", isComplete: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/task/task_1/");
  assertEquals(JSON.parse(calls[0].body!), { is_complete: true });
});

test("update-task: sends is_complete=false rather than dropping the false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ taskId: "task_1", isComplete: false }, ctx);
  // Reopening a task must be expressible.
  assertEquals(JSON.parse(calls[0].body!), { is_complete: false });
});

test("update-task: reassigns and reschedules using `date`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ taskId: "task_1", assignedTo: "user_2", date: "2026-03-01" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.assigned_to, "user_2");
  assertEquals(sent.date, "2026-03-01");
  assertEquals(sent.due_date, undefined);
});

test("update-task: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
