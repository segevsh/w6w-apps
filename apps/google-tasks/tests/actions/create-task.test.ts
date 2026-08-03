import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs only the title when nothing else is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T1" } }]);
  await action.execute!({ taskList: "L1", title: "Buy milk" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/lists/L1/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { title: "Buy milk" });
});

Deno.test("create-task: sends every writable body field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    taskList: "L1",
    title: "Buy milk",
    notes: "semi-skimmed",
    due: "2026-08-10T00:00:00Z",
    status: "completed",
    completed: "2026-08-09T00:00:00Z",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Buy milk",
    notes: "semi-skimmed",
    due: "2026-08-10T00:00:00Z",
    status: "completed",
    completed: "2026-08-09T00:00:00Z",
  });
});

Deno.test("create-task: parent/previous are query params, never body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", title: "Sub", parent: "T0", previous: "T5" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("parent"), "T0");
  assertEquals(p.get("previous"), "T5");
  // `parent` is readOnly on the Task schema — sending it in the body is ignored.
  assertEquals(JSON.parse(calls[0].body!), { title: "Sub" });
});
