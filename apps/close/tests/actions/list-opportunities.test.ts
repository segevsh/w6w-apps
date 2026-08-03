import { assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/list-opportunities.ts";

Deno.test("list-opportunities: GETs /opportunity/ mapping filters to Close's names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({
    leadId: "lead_1",
    userId: "user_1",
    statusId: "stat_1",
    statusType: "active",
    dateCreatedGte: "2026-01-01",
    dateCreatedLte: "2026-02-01",
    orderBy: "-date_created",
    limit: 5,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/opportunity/");
  assertEquals(q.get("lead_id"), "lead_1");
  assertEquals(q.get("user_id"), "user_1");
  assertEquals(q.get("status_id"), "stat_1");
  assertEquals(q.get("status_type"), "active");
  assertEquals(q.get("date_created__gte"), "2026-01-01");
  assertEquals(q.get("date_created__lte"), "2026-02-01");
  assertEquals(q.get("_order_by"), "-date_created");
  assertEquals(q.get("_limit"), "5");
});

Deno.test("list-opportunities: offers exactly Close's fixed status_type trichotomy", () => {
  const p = param(action, "statusType");
  assertEquals(p.type, "select");
  assertEquals(optionValues(action, "statusType"), ["active", "won", "lost"]);
});

Deno.test("list-opportunities: sends nothing when no filters are supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
