import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-delete: DELETEs /tasks/{taskId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "deleted" } }]);
  await taskDelete.execute({ taskId: 3 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/api/tasks/3");
});

test("task-delete: is declared idempotent", () => {
  assertEquals(taskDelete.idempotent, true);
});
