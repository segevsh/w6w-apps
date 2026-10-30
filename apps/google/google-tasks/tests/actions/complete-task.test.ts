import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/complete-task.ts";

test("complete-task: PATCHes status=completed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T1", status: "completed" } }]);
  await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/lists/L1/tasks/T1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "completed" });
});

test("complete-task: forwards an explicit completion timestamp", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { taskList: "L1", task: "T1", completed: "2026-08-09T12:00:00Z" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    status: "completed",
    completed: "2026-08-09T12:00:00Z",
  });
});

test("complete-task: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
