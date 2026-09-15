import { assertEquals } from "@std/assert";
import calendarUpdate from "../../actions/calendar-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-update: PATCHes only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cal-1", title: "Renamed" } }]);
  const out = await calendarUpdate.execute({ calendarId: "cal-1", title: "Renamed" }, ctx) as {
    title: string;
  };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/calendars/cal-1");
  assertEquals(JSON.parse(calls[0].body!), { title: "Renamed" });
  assertEquals(out.title, "Renamed");
});

Deno.test("calendar-update: is declared idempotent", () => {
  assertEquals(calendarUpdate.idempotent, true);
});
