import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-task.ts";

Deno.test("delete-task: DELETEs the task and returns a success sentinel", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/lists/L1/tasks/T1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});
