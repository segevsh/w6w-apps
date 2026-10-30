import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCalendarCtx } from "../_helpers.ts";
import action from "../../actions/event-search.ts";

test("event-search: GETs .../search with searchtext/calendaruid/start/end", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { events: [{ uid: "e1" }] } }]);
  await action.execute(
    {
      calendarUid: "l9WWZCf_SJWcr3uIuBOq5g==",
      searchText: "Standup",
      start: "20170717T000000Z",
      end: "20170723T000000Z",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(
    decodeURIComponent(url.pathname),
    "/api/v1/calendars/l9WWZCf_SJWcr3uIuBOq5g==/search",
  );
  assertEquals(url.searchParams.get("searchtext"), "Standup");
  assertEquals(url.searchParams.get("calendaruid"), "l9WWZCf_SJWcr3uIuBOq5g==");
  assertEquals(url.searchParams.get("start"), "20170717T000000Z");
  assertEquals(url.searchParams.get("end"), "20170723T000000Z");
});
