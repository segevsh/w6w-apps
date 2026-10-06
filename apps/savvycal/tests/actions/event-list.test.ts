import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-list: GET /v1/events with filters, passes the page through", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "event_1" }], "cur") }]);
  const out = await eventList.execute({
    limit: 5,
    state: "all",
    period: "fixed",
    from: "2026-10-01",
    until: "2026-10-31",
    direction: "desc",
    attendance: "any",
    link: "link_1",
  }, ctx) as { entries: unknown[]; metadata: { after: string } };
  assertEquals(pathOf(calls[0].url), "/v1/events");
  assertEquals(queryOf(calls[0].url), {
    limit: "5",
    state: "all",
    period: "fixed",
    from: "2026-10-01",
    until: "2026-10-31",
    direction: "desc",
    attendance: "any",
    link: "link_1",
  });
  assertEquals(out.entries.length, 1);
  assertEquals(out.metadata.after, "cur");
});

Deno.test("event-list: sends no query when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await eventList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
