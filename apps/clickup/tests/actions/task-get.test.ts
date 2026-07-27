import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: GETs /task/{id} with subtask/custom-id query flags", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({
    taskId: "t1",
    includeSubtasks: true,
    customTaskIds: true,
    teamId: "42",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/task/t1");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("include_subtasks"), "true");
  assertEquals(url.searchParams.get("custom_task_ids"), "true");
  assertEquals(url.searchParams.get("team_id"), "42");
});

Deno.test("task-get: omits team_id when not using custom IDs", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ taskId: "t1", teamId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("team_id"), false);
  assertEquals(url.searchParams.has("include_subtasks"), false);
});
