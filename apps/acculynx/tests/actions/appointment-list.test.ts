import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/appointment-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("appointment-list: sends GET /calendars/cal1/appointments and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 10, pageStartIndex: 0, items: [{ id: "a1" }] },
  }]);
  const out = await action.execute(
    {
      calendarId: "cal1",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      eventType: "InitialAppointment",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/calendars/cal1/appointments");
  assertEquals(queryOf(calls[0].url), {
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    eventType: "InitialAppointment",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { count: 1, pageSize: 10, pageStartIndex: 0, items: [{ id: "a1" }] });
});

Deno.test("appointment-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        {
          calendarId: "cal1",
          startDate: "2026-10-01",
          endDate: "2026-10-31",
          eventType: "InitialAppointment",
        } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});
