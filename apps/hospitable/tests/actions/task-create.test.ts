import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("task-create: POST /v2/tasks, payment folded, unset fields omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "k1" }, meta: {} } }]);
  await taskCreate.execute({
    property_id: "p1",
    task_type: 1,
    start_date: "2026-11-02T11:00:00",
    end_date: "2026-11-02T14:00:00",
    teammate_uuid: "t1",
    reservation_uuid: "r1",
    note: "deep clean",
    send_task_reminder: true,
    payment_amount: 7500,
    payment_currency: "USD",
    checklist: '{"items":[]}',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    property_id: "p1",
    task_type: 1,
    start_date: "2026-11-02T11:00:00",
    end_date: "2026-11-02T14:00:00",
    teammate_uuid: "t1",
    reservation_uuid: "r1",
    note: "deep clean",
    send_task_reminder: true,
    payment: { amount: 7500, currency: "USD" },
    checklist: { items: [] },
  });
  const bare = mockCtx([{ body: { data: {} } }]);
  await taskCreate.execute({
    property_id: "p1",
    task_type: 2,
    start_date: "2026-11-02T11:00:00Z",
    end_date: "2026-11-02T12:00:00Z",
  }, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), {
    property_id: "p1",
    task_type: 2,
    start_date: "2026-11-02T11:00:00Z",
    end_date: "2026-11-02T12:00:00Z",
  });
  assertEquals(taskCreate.idempotent, false);
  assertEquals(requiredOf(taskCreate), ["end_date", "property_id", "start_date", "task_type"]);
});
