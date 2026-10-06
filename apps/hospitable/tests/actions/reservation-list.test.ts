import { assertEquals } from "@std/assert";
import reservationList from "../../actions/reservation-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("reservation-list: bracketed array params, include joined, sort[desc] key", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await reservationList.execute({
    property_ids: "p1, p2\np3",
    start_date: "2026-11-01",
    end_date: "2026-11-30",
    date_query: "checkin",
    platform_id: "HMABC",
    conversation_id: "c1",
    last_message_at: "2026-10-01 00:00:00",
    booked_at: "2026-09-01 00:00:00",
    sort_by: "booked_at",
    sort_direction: "desc",
    statuses: ["accepted", "cancelled"],
    platforms: "airbnb,direct",
    include: "guest,financials",
    page: 2,
    per_page: 50,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/reservations");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("properties[]"), ["p1", "p2", "p3"]);
  assertEquals(q.getAll("status[]"), ["accepted", "cancelled"]);
  assertEquals(q.getAll("platforms[]"), ["airbnb", "direct"]);
  assertEquals(q.get("sort[desc]"), "booked_at");
  assertEquals(q.get("sort[asc]"), null);
  assertEquals(q.get("include"), "guest,financials");
  assertEquals(q.get("date_query"), "checkin");
  assertEquals(q.get("platform_id"), "HMABC");
  assertEquals(q.get("conversation_id"), "c1");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("per_page"), "50");
  assertEquals(requiredOf(reservationList), ["property_ids"]);
});

Deno.test("reservation-list: ascending is the default direction; unset filters stay out", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await reservationList.execute({ property_ids: "p1", sort_by: "start_date" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("sort[asc]"), "start_date");
  assertEquals([...q.keys()].sort(), ["properties[]", "sort[asc]"]);
});
