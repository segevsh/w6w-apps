import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: GETs /tasks/{id} and returns the response", async () => {
  const body = { id: "42", content: "Task" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ taskId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/tasks/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
