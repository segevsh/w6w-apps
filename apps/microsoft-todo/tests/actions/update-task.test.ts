import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task.ts";

Deno.test("update-task: PATCHes only what was set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T1" } }]);
  await action.execute!({
    taskList: "L1",
    task: "T1",
    dueDateTime: "2026-08-25T04:00:00Z",
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/L1/tasks/T1");
  // The whole point of a PATCH: the untouched fields are absent, not null.
  assertEquals(JSON.parse(calls[0].body!), {
    dueDateTime: { dateTime: "2026-08-25T04:00:00", timeZone: "UTC" },
  });
});

Deno.test("update-task: reopening a task is a status change, not a special endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1", status: "notStarted" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: "notStarted" });
});

Deno.test("update-task: an empty body clears the notes rather than being dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1", body: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { body: { contentType: "text", content: "" } });
});

Deno.test("update-task: title is optional here, unlike on create", () => {
  assertEquals(action.idempotent, true);
  assert(!action.params!.find((p) => p.key === "title")?.required);
});
