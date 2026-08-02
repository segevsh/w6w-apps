import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-appointments.ts";

Deno.test("list-appointments: GETs /calendars/events with the time window", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { events: [] } }], "loc-1");
  await action.execute!({ startTime: 1000, endTime: 2000, calendarId: "cal-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/calendars/events");
  assertEquals(url.searchParams.get("locationId"), "loc-1");
  assertEquals(url.searchParams.get("startTime"), "1000");
  assertEquals(url.searchParams.get("endTime"), "2000");
  assertEquals(url.searchParams.get("calendarId"), "cal-1");
  assertEquals(calls[0].headers["version"], "2021-04-15");
});
