import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-attendee-report.ts";

Deno.test("get-attendee-report: GETs report with joined event ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({
    eventIds: ["1", "2"],
    eventStatus: "live",
    groupBy: "ticket",
    dateFacet: "day",
    period: 3,
    timezone: "UTC",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/reports/attendees/");
  assertEquals(url.searchParams.get("event_ids"), "1,2");
  assertEquals(url.searchParams.get("event_status"), "live");
  assertEquals(url.searchParams.get("group_by"), "ticket");
  assertEquals(url.searchParams.get("date_facet"), "day");
  assertEquals(url.searchParams.get("period"), "3");
  assertEquals(url.searchParams.get("timezone"), "UTC");
  assertEquals(calls[0].body, null);
});
