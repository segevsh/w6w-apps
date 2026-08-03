import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task.ts";

Deno.test("update-task: PATCHes only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T1" } }]);
  await action.execute!({ taskList: "L1", task: "T1", title: "New title" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/lists/L1/tasks/T1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { title: "New title" });
});

Deno.test("update-task: reopens a task via status needsAction", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1", status: "needsAction" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: "needsAction" });
});

Deno.test("update-task: sends every writable field and keeps deleted=false", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    taskList: "L1",
    task: "T1",
    title: "t",
    notes: "n",
    due: "2026-08-10T00:00:00Z",
    status: "completed",
    completed: "2026-08-09T00:00:00Z",
    deleted: false,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    title: "t",
    notes: "n",
    due: "2026-08-10T00:00:00Z",
    status: "completed",
    completed: "2026-08-09T00:00:00Z",
    deleted: false,
  });
});

Deno.test("update-task: exposes no parent/position — they are readOnly, use move-task", () => {
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys.includes("parent"), false);
  assertEquals(keys.includes("position"), false);
});
