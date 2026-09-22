import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-delete.ts";

Deno.test("task-delete: deletes by id and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ taskId: 9 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/tasks/9");
  assertEquals(result, { taskId: 9, status: 200 });
});

Deno.test("task-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
