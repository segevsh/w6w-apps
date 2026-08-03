import { assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import deleteTask from "../../actions/delete-task.ts";

Deno.test("delete-task: DELETEs and summarises the empty 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await run<{ deleted: boolean; task_id: string }>(deleteTask, { taskId: "t1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.attio.com/v2/tasks/t1");
  assertEquals(out, { deleted: true, task_id: "t1" });
});
