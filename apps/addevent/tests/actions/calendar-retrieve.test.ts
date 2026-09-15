import { assertEquals, assertRejects } from "@std/assert";
import calendarRetrieve from "../../actions/calendar-retrieve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-retrieve: GETs by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cal-1", title: "Main" } }]);
  const out = await calendarRetrieve.execute({ calendarId: "cal-1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/calendars/cal-1");
  assertEquals(out.id, "cal-1");
});

Deno.test("calendar-retrieve: a 404 on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(calendarRetrieve.execute({ calendarId: "missing" }, ctx)),
    Error,
  );
});
