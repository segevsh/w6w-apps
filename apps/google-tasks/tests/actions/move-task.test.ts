import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-task.ts";

Deno.test("move-task: POSTs to /move with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T1" } }]);
  await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/lists/L1/tasks/T1/move");
  assertEquals(calls[0].method, "POST");
  // tasks.move documents an empty request body — everything travels as a query param.
  assertEquals(calls[0].body, null);
});

Deno.test("move-task: forwards parent, previous and destinationTasklist as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    taskList: "L1",
    task: "T1",
    parent: "T0",
    previous: "T5",
    destinationTasklist: "L2",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("parent"), "T0");
  assertEquals(p.get("previous"), "T5");
  assertEquals(p.get("destinationTasklist"), "L2");
});

Deno.test("move-task: omitting parent sends no parent param (moves to top level)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1", previous: "T5" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.has("parent"), false);
  assertEquals(p.get("previous"), "T5");
});
