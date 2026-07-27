import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-create.ts";

Deno.test("activity-create: POSTs /activities and coerces done to 0/1", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  await action.execute!(
    { subject: "Call Ada", type: "call", dealId: 7, done: true, dueDate: "2026-08-01" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/activities");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Call Ada");
  assertEquals(body.type, "call");
  assertEquals(body.deal_id, 7);
  assertEquals(body.done, 1);
  assertEquals(body.due_date, "2026-08-01");
});

Deno.test("activity-create: done:false serializes as 0, not omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  await action.execute!({ subject: "Task", type: "task", done: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).done, 0);
});
