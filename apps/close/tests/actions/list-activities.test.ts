import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/list-activities.ts";

Deno.test("list-activities: GETs the unified /activity/ feed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/activity/");
});

Deno.test("list-activities: maps every filter to Close's parameter names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({
    leadId: "lead_1",
    contactId: "cont_1",
    userId: "user_1",
    type: "Call",
    dateCreatedGte: "2026-01-01",
    dateCreatedLte: "2026-02-01",
    orderBy: "-date_created",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("lead_id"), "lead_1");
  assertEquals(q.get("contact_id"), "cont_1");
  assertEquals(q.get("user_id"), "user_1");
  assertEquals(q.get("_type"), "Call");
  assertEquals(q.get("date_created__gte"), "2026-01-01");
  assertEquals(q.get("date_created__lte"), "2026-02-01");
  assertEquals(q.get("_order_by"), "-date_created");
});

Deno.test("list-activities: warns when _type is used without lead_id, as Close ignores it", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ type: "Call" }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/lead_id/.test(logs[0].message));
});

Deno.test("list-activities: does not warn when lead_id accompanies the type", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ type: "Call", leadId: "lead_1" }, ctx);
  assertEquals(logs.length, 0);
});

Deno.test("list-activities: leaves _type free text, since custom activity type ids are valid", () => {
  const p = param(action, "type");
  assertEquals(p.type, "string");
  assert(/actitype_/.test(p.hint!));
});
