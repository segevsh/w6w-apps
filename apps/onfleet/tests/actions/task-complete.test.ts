import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-complete.ts";

test("task-complete: defaults to a successful completion", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ taskId: "task_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/tasks/task_1/complete");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { completionDetails: { success: true } });
  assertEquals(result, { completed: true });
});

test("task-complete: a failed completion and notes are included", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  await action.execute!({ taskId: "task_1", success: false, notes: "recipient not home" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    completionDetails: { success: false, notes: "recipient not home" },
  });
});

test("task-complete: taskId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "taskId");
  assertEquals(calls.length, 0);
});
