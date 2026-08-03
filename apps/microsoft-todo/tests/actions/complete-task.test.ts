import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/complete-task.ts";

Deno.test("complete-task: PATCHes status=completed and lets Graph stamp the time", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "T1", status: "completed" } }]);
  await action.execute!({ taskList: "L1", task: "T1" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/L1/tasks/T1");
  assertEquals(JSON.parse(calls[0].body!), { status: "completed" });
});

Deno.test("complete-task: an explicit completion time is nested as a dateTimeTimeZone", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    taskList: "L1",
    task: "T1",
    completedDateTime: "2026-08-03T12:00:00Z",
    timeZone: "Eastern Standard Time",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    status: "completed",
    completedDateTime: { dateTime: "2026-08-03T12:00:00", timeZone: "Eastern Standard Time" },
  });
});

Deno.test("complete-task: is idempotent — completing a done task leaves it done", () => {
  assertEquals(action.idempotent, true);
});
