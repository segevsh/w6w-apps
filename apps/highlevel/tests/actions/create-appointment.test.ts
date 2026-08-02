import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/create-appointment.ts";

Deno.test("create-appointment: POSTs /calendars/events/appointments with locationId", async () => {
  const { ctx, calls } = mockHighLevelCtx([
    { status: 201, body: { appointment: { id: "e1" } } },
  ], "loc-1");
  await action.execute!({
    calendarId: "cal-1",
    contactId: "c1",
    startTime: "2026-08-10T15:00:00-05:00",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/calendars/events/appointments");
  assertEquals(calls[0].headers["version"], "2021-04-15");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.locationId, "loc-1");
  assertEquals(body.calendarId, "cal-1");
  assertEquals(body.appointmentStatus, "confirmed");
});
