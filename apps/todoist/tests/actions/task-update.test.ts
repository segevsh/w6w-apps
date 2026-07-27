import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: POSTs /tasks/{id} with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "7" } }]);
  await action.execute!({ taskId: "7", content: "New", priority: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/tasks/7");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { content: "New", priority: 2 });
});
