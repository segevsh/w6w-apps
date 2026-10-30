import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskList from "../../actions/task-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("task-list: calls GET /tasks.json", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await taskList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks.json");
});

/**
 * Clio's own docs: assignee_type "must be passed if filtering by assignee".
 */
test("task-list: assignee_id and assignee_type travel together", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await taskList.execute({ assigneeId: 7, assigneeType: "user" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.assignee_id, "7");
  assertEquals(q.assignee_type, "user");
});

test("task-list: forwards matter, status and priority filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await taskList.execute({ matterId: 9, status: "pending", priority: "high" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.matter_id, "9");
  assertEquals(q.status, "pending");
  assertEquals(q.priority, "high");
});
