import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

const task = { id: 9, leadId: 1, content: "Call back", finishFlag: false, overdueFlag: true };

Deno.test("task-get: fetches one task", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { task } }]);
  const result = await action.execute!({ taskId: 9 }, ctx);
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/tasks/9");
  assertEquals(result, task);
});

Deno.test("task-get: a flat body is returned unchanged", async () => {
  const { ctx } = mockCtx([{ status: 200, body: task }]);
  assertEquals(await action.execute!({ taskId: 9 }, ctx), task);
});
