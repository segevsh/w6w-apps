import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/calendar-events.ts";

const events = ok([
  {
    summary: "Dentist",
    start: { dateTime: "2026-08-20T09:00:00+01:00" },
    end: { dateTime: "2026-08-20T09:30:00+01:00" },
  },
  {
    summary: "Holiday",
    start: { date: "2026-08-22" },
    end: { date: "2026-08-25" },
  },
]);

/**
 * An all-day event has `start.date` and no `start.dateTime`, so code reading
 * `dateTime` silently drops every one of them.
 */
Deno.test("calendar-events: normalises both shapes and flags which is which", async () => {
  const { ctx, calls } = mockCtx([events], { display });
  const result = await action.execute!({
    entityId: "calendar.family",
    start: "2026-08-18T00:00:00Z",
    end: "2026-08-26T00:00:00Z",
  }, ctx) as {
    events: Array<{ start: string; allDay: boolean }>;
    allDayCount: number;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/calendars/calendar.family");
  assertEquals(url.searchParams.get("start"), "2026-08-18T00:00:00Z");
  assertEquals(result.events[0].start, "2026-08-20T09:00:00+01:00");
  assertEquals(result.events[0].allDay, false);
  assertEquals(result.events[1].start, "2026-08-22");
  assertEquals(result.events[1].allDay, true);
  assertEquals(result.allDayCount, 1);
});

/** The originals are kept, because the normalised strings lose the distinction. */
Deno.test("calendar-events: the raw start and end objects survive", async () => {
  const { ctx } = mockCtx([events], { display });
  const result = await action.execute!({
    entityId: "calendar.family",
    start: "2026-08-18T00:00:00Z",
    end: "2026-08-26T00:00:00Z",
  }, ctx) as { events: Array<{ rawStart: { date?: string; dateTime?: string } }> };
  assertEquals(result.events[1].rawStart, { date: "2026-08-22" });
});

Deno.test("calendar-events: both bounds are required — the window is the query", async () => {
  const noEnd = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ entityId: "calendar.family", start: "2026-08-18" }, noEnd.ctx),
    Error,
    "both required",
  );
  assertEquals(noEnd.calls.length, 0);
});

Deno.test("calendar-events: a friendly name is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "Family", start: "a", end: "b" }, ctx),
    Error,
    "friendly name",
  );
});

Deno.test("calendar-events: an empty window is a count of zero", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({
    entityId: "calendar.family",
    start: "a",
    end: "b",
  }, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("calendar-events: logs counts, never the summaries", async () => {
  const { ctx, logs } = mockCtx([events], { display });
  await action.execute!({ entityId: "calendar.family", start: "a", end: "b" }, ctx);
  assert(!JSON.stringify(logs).includes("Dentist"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 2, allDay: 1 });
});

Deno.test("calendar-events: says the two shapes never both appear", () => {
  assert(/never both/.test(action.description!), action.description);
});
