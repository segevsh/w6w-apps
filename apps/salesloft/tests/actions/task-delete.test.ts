import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-delete.ts";

test("task-delete: DELETEs /tasks/:id and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ id: 6 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks/6");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
