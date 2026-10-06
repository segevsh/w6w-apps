import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/calendar-event-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("calendar-event-list: sends every filter as the documented query name and returns the next cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      next: "https://us-west-2.recall.ai/api/v2/calendar-events/?cursor=CUR2",
      previous: null,
      results: [{ id: "i1" }],
    },
  }]);
  const out = await action.execute!({
    calendarId: "x1",
    startTimeGte: "2026-01-01T00:00:00Z",
    startTimeLte: "2026-01-01T00:00:00Z",
    updatedAtGte: "2026-01-01T00:00:00Z",
    icalUid: "x1",
    isDeleted: true,
    cursor: "CUR1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://us-west-2.recall.ai/api/v2/calendar-events/");
  assertEquals(
    url.search.slice(1).split("&").sort(),
    "calendar_id=x1&start_time__gte=2026-01-01T00%3A00%3A00Z&start_time__lte=2026-01-01T00%3A00%3A00Z&updated_at__gte=2026-01-01T00%3A00%3A00Z&ical_uid=x1&is_deleted=true&cursor=CUR1"
      .split("&").sort(),
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(out, { events: [{ id: "i1" }], nextCursor: "CUR2" });
});

Deno.test("calendar-event-list: the last page has no nextCursor and unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { next: null, previous: null, results: [] } }]);
  const out = await action.execute!({ calendarId: "x1" }, ctx);
  assertEquals(out, { events: [] });
  const q = new URL(calls[0].url).searchParams;
  assertEquals([...q.keys()], ["calendar_id"]);
});

Deno.test("calendar-event-list: an authentication failure is reported by code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "authentication_failed", detail: "Invalid API token." },
  }]);
  await assertRejects(
    async () => await action.execute!({ calendarId: "x1" }, ctx),
    Error,
    "(authentication_failed)",
  );
});
