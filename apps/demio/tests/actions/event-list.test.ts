import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("event-list: wraps the array and passes the type filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 62, name: "First Webinar", date_id: 1218 }] }]);
  const out = await eventList.execute({ type: "upcoming" }, ctx) as { events: unknown[] };
  assertEquals(out.events.length, 1);
  assertEquals(calls[0].url, `${API_ROOT}/events?type=upcoming`);
});

Deno.test("event-list: no filter sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  assertEquals(((await eventList.execute({}, ctx)) as { events: unknown[] }).events, []);
  assertEquals(calls[0].url, `${API_ROOT}/events`);
});
