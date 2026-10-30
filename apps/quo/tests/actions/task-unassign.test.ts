import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskUnassign from "../../actions/task-unassign.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-unassign: POSTs /v1/tasks/{taskId}/unassign with userId", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "3" } },
  }]);
  await taskUnassign.execute({ taskId: "TK1", userId: "US1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/unassign");
  assertEquals(JSON.parse(calls[0].body!), { userId: "US1" });
});

test("task-unassign: is an idempotent perform action", () => {
  assertEquals(taskUnassign.type, "perform");
  assertEquals(taskUnassign.idempotent, true);
});
