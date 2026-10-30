import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-task.ts";

test("delete-task: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

test("delete-task: DELETEs /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ taskId: 7 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/tasks/7");
  assertEquals(result, {});
});
