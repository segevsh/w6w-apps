import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/dispatch-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dispatch-create: POST /api/v3/dispatches with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 9 } }]);
  const out = await action.execute(
    {
      "dispatchType": "immediate_dispatch",
      "formId": 346103,
      "assigneeId": 840365,
      "name": "Repair",
      "responses": [{ "entry_id": 1, "value": "Jane" }],
      "sendNotification": true,
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/dispatches");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "dispatch_type": "immediate_dispatch",
    "form_id": 346103,
    "assignee_id": 840365,
    "name": "Repair",
    "responses": [{ "entry_id": 1, "value": "Jane" }],
    "send_notification": true,
  });
  assertEquals(out, { "id": 9 });

  const sched = mockCtx([{ body: { id: 10 } }]);
  await action.execute({
    dispatchType: "scheduled_dispatch",
    formId: 1,
    scheduledAt: "03/01/2026 09:00:00 AM",
    scheduledEnd: "03/01/2026 10:00:00 AM",
    reminderInterval: 30,
  }, sched.ctx);
  assertEquals(bodyOf(sched.calls[0]).reminder_interval, 30);
  const rec = mockCtx([{ body: { id: 11 } }]);
  await action.execute({
    dispatchType: "recurring_dispatch",
    formId: 1,
    scheduledAt: "03/01/2026 09:00:00 AM",
    scheduledEnd: "03/01/2026 10:00:00 AM",
    repeatInterval: "weekly",
    repeatEndsOption: "ends_after",
    repeatOccurrences: 4,
  }, rec.ctx);
  assertEquals(bodyOf(rec.calls[0]).repeat_occurrences, 4);
  await assertRejects(
    async () =>
      await action.execute({ dispatchType: "scheduled_dispatch", formId: 1 }, mockCtx().ctx),
    Error,
    "scheduledAt",
  );
  await assertRejects(
    async () =>
      await action.execute({
        dispatchType: "scheduled_dispatch",
        formId: 1,
        scheduledAt: "a",
        scheduledEnd: "b",
      }, mockCtx().ctx),
    Error,
    "reminderInterval",
  );
  await assertRejects(
    async () =>
      await action.execute({
        dispatchType: "recurring_dispatch",
        formId: 1,
        scheduledAt: "a",
        scheduledEnd: "b",
      }, mockCtx().ctx),
    Error,
    "repeatInterval",
  );
});
