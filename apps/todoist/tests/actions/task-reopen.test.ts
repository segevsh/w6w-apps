import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-reopen.ts";

Deno.test("task-reopen: POSTs /tasks/{id}/reopen and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute!({ taskId: "9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/tasks/9/reopen");
  assertEquals(calls[0].method, "POST");
  assertEquals(result, { success: true });
});
