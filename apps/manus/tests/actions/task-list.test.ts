import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskList from "../../actions/task-list.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

test("task-list: maps has_more/next_cursor onto { items, nextCursor }", async () => {
  const task = { id: "t1", status: "running" as const, created_at: 1, updated_at: 1 };
  const { ctx } = mockCtx([{
    body: okBody({ data: [task], has_more: true, next_cursor: "c2" }),
  }]);
  const out = await taskList.execute({}, ctx);
  assertEquals(out, { items: [task], nextCursor: "c2" });
});

test("task-list: omits unset filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [] }) }]);
  await taskList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/task.list");
  assertEquals(queryOf(calls[0].url), {});
});

test("task-list: sends camelCase filters as Manus's snake_case query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [] }) }]);
  await taskList.execute({
    cursor: "c1",
    limit: 50,
    order: "asc",
    scope: "agent_subtask",
    agentId: "agent-1",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    cursor: "c1",
    limit: "50",
    order: "asc",
    scope: "agent_subtask",
    agent_id: "agent-1",
  });
});

test("task-list: is a search action", () => {
  assertEquals(taskList.type, "search");
});
