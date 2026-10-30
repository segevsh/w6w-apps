import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-get: GETs /v1/tasks/{taskId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { taskId: "TK1" } } }]);
  await taskGet.execute({ taskId: "TK1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1");
});

test("task-get: is a read action", () => {
  assertEquals(taskGet.type, "read");
});
