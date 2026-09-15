import { assertEquals } from "@std/assert";
import calendarSearch from "../../actions/calendar-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("calendar-search: maps camelCase params onto the documented snake_case query", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { calendars: [], pagination: {}, links: {} },
  }]);

  await calendarSearch.execute(
    { calendarIds: "cal_1", page: 3, pageSize: 20, sortBy: "title", sortOrder: "asc" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/calevent/v2/calendars");
  const q = queryOf(calls[0].url);
  assertEquals(q.calendar_ids, "cal_1");
  assertEquals(q.page, "3");
  assertEquals(q.page_size, "20");
  assertEquals(q.sort_by, "title");
  assertEquals(q.sort_order, "asc");
});

Deno.test("calendar-search: a zero-match result is a plain empty array, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { calendars: [] } }]);
  const out = await calendarSearch.execute({}, ctx) as { calendars: unknown[] };
  assertEquals(out.calendars.length, 0);
});
