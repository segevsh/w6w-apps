import { assertEquals, assertRejects } from "@std/assert";
import eventCreate from "../../actions/event-create.ts";
import { errorBody, mockCtx, pathOf, validationErrorBody } from "../_helpers.ts";

Deno.test("event-create: POSTs the mapped body and returns the created event", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: {
        id: "evt-1",
        title: "Demo event",
        calendar_id: "cal_123",
        datetime_start: "2026-06-01 10:00:00",
        link_long: "https://www.addevent.com/event/abc123",
      },
    },
  ]);

  const out = await eventCreate.execute(
    {
      title: "Demo event",
      calendarId: "cal_123",
      datetimeStart: "2026-06-01 10:00",
      allDayEvent: false,
      rsvpEnabled: true,
    },
    ctx,
  ) as { id: string; link_long: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.title, "Demo event");
  assertEquals(sent.calendar_id, "cal_123");
  assertEquals(sent.datetime_start, "2026-06-01 10:00");
  assertEquals(sent.all_day_event, false);
  assertEquals(sent.rsvp_enabled, true);
  // Fields left unset by the caller are absent from the body, not sent as null/undefined.
  assertEquals("description" in sent, false);

  assertEquals(out.id, "evt-1");
  assertEquals(out.link_long, "https://www.addevent.com/event/abc123");
});

Deno.test("event-create: a 400 validation error surfaces the field-level reasons", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: validationErrorBody([{ name: "title", reason: "Cannot have blank value" }]),
    },
  ]);

  const err = await assertRejects(
    () => Promise.resolve(eventCreate.execute({ title: "", datetimeStart: "2026-06-01" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("title: Cannot have blank value"), true, err.message);
});

Deno.test("event-create: a 403 reports the plan/permission reason, not a bare status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("", 910) }]);
  const err = await assertRejects(
    () => Promise.resolve(eventCreate.execute({ title: "x", datetimeStart: "2026-06-01" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("permission"), true, err.message);
});

Deno.test("event-create: is declared perform, not idempotent", () => {
  assertEquals(eventCreate.type, "perform");
  assertEquals(eventCreate.idempotent, false);
});
