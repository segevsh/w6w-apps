import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-task.ts";

Deno.test("get-task: addresses the task under its list", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T1", title: "Buy milk" } }]);
  const out = await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/lists/L1/tasks/T1");
  assertEquals(calls[0].method, "GET");
  assertEquals((out as { title: string }).title, "Buy milk");
});

Deno.test("get-task: sends no query parameters — tasks.get defines none", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});
