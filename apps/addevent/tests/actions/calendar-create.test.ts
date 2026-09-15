import { assertEquals, assertRejects } from "@std/assert";
import calendarCreate from "../../actions/calendar-create.ts";
import { mockCtx, pathOf, validationErrorBody } from "../_helpers.ts";

Deno.test("calendar-create: POSTs the mapped body and returns the created calendar", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "cal-1", title: "Product launches", timezone: "UTC" } },
  ]);

  const out = await calendarCreate.execute(
    { title: "Product launches", timezone: "UTC", weekdayBegin: "monday" },
    ctx,
  ) as { id: string; title: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/calendars");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.title, "Product launches");
  assertEquals(sent.timezone, "UTC");
  assertEquals(sent.weekday_begin, "monday");
  assertEquals(out.id, "cal-1");
});

Deno.test("calendar-create: a 400 validation error surfaces the field-level reasons", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: validationErrorBody([{ name: "title", reason: "Cannot have blank value" }]),
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(calendarCreate.execute({ title: "" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("title: Cannot have blank value"), true, err.message);
});
