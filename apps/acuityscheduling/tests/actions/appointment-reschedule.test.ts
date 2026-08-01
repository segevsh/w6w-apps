import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-reschedule.ts";

Deno.test("appointment-reschedule: PUTs /appointments/{id}/reschedule with the new datetime", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await action.execute({ id: 42, datetime: "2026-08-20T10:00:00-0400" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/appointments/42/reschedule");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { datetime: "2026-08-20T10:00:00-0400" });
});

Deno.test("appointment-reschedule: includes calendarID only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await action.execute({ id: 42, datetime: "2026-08-20T10:00:00-0400", calendarID: 9 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.calendarID, 9);
});
