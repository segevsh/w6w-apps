import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/calendar-get.ts";

test("calendar-get: GETs /calendars/<uid> and unwraps the single entry", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [{ uid: "abc", name: "Work" }] } }]);
  const out = await action.execute({ calendarUid: "abc" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/calendars/abc");
  assertEquals(out, { uid: "abc", name: "Work" });
});

test('calendar-get: accepts the "primary" alias verbatim', async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [{ uid: "abc" }] } }]);
  await action.execute({ calendarUid: "primary" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/calendars/primary");
});
