import { assertEquals } from "@std/assert";
import eventSearch from "../../actions/event-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-search: maps camelCase params onto the documented snake_case query", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { pagination: { total_items: 0 }, links: {}, events: [] } },
  ]);

  const out = await eventSearch.execute(
    {
      calendarIds: "cal_1,cal_2",
      datetimeMin: "2026-01-01",
      search: "launch",
      page: 2,
      pageSize: 5,
      sortBy: "title",
      sortOrder: "asc",
    },
    ctx,
  ) as { events: unknown[]; pagination: { total_items: number } };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events");
  const q = queryOf(calls[0].url);
  assertEquals(q.calendar_ids, "cal_1,cal_2");
  assertEquals(q.datetime_min, "2026-01-01");
  assertEquals(q.search, "launch");
  assertEquals(q.page, "2");
  assertEquals(q.page_size, "5");
  assertEquals(q.sort_by, "title");
  assertEquals(q.sort_order, "asc");

  assertEquals(out.events, []);
  assertEquals(out.pagination.total_items, 0);
});

Deno.test("event-search: a zero-match result is a plain empty array, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { events: [], pagination: {}, links: {} } }]);
  const out = await eventSearch.execute({}, ctx) as { events: unknown[] };
  assertEquals(out.events.length, 0);
});

Deno.test("event-search: unset optional params are omitted from the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { events: [] } }]);
  await eventSearch.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
