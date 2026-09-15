import { assertEquals, assertRejects } from "@std/assert";
import calendarDelete from "../../actions/calendar-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-delete: DELETEs and reports the 204 with no body to parse", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await calendarDelete.execute({ calendarId: "cal-1" }, ctx) as {
    calendarId: string;
    status: number;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/calendars/cal-1");
  assertEquals(out, { calendarId: "cal-1", status: 204 });
});

Deno.test("calendar-delete: a repeat delete on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(calendarDelete.execute({ calendarId: "cal-1" }, ctx)),
    Error,
  );
});

Deno.test("calendar-delete: is declared idempotent", () => {
  assertEquals(calendarDelete.idempotent, true);
});
