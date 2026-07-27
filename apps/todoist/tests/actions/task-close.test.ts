import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-close.ts";

Deno.test("task-close: POSTs /tasks/{id}/close and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute!({ taskId: "9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/tasks/9/close");
  assertEquals(calls[0].method, "POST");
  assertEquals(result, { success: true });
});
