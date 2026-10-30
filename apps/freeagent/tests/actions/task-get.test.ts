import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

test("task-get: GETs /tasks/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { task: { url: "x" } } }]);
  await action.execute({ taskId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks/1");
});
