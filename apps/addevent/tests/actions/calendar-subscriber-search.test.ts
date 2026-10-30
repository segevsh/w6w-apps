import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import calendarSubscriberSearch from "../../actions/calendar-subscriber-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("calendar-subscriber-search: comma-joins the multiselect status filter", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { subscribers: [], pagination: {}, links: {} } },
  ]);

  await calendarSubscriberSearch.execute(
    { calendarIds: "cal-1", status: ["active", "inactive"] },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/calevent/v2/subscribers");
  const q = queryOf(calls[0].url);
  assertEquals(q.calendar_ids, "cal-1");
  assertEquals(q.status, "active,inactive");
});

test("calendar-subscriber-search: a zero-match result is a plain empty array, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { subscribers: [] } }]);
  const out = await calendarSubscriberSearch.execute({}, ctx) as { subscribers: unknown[] };
  assertEquals(out.subscribers.length, 0);
});
