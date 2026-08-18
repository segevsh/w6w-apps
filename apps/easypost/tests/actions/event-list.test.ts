import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

const list = (events: unknown[], has_more = false) => ({
  status: 200,
  body: { events, has_more },
});

/** Nothing queues webhook deliveries on your side — this is the recovery path. */
Deno.test("event-list: tallies the event types", async () => {
  const { ctx, calls } = mockCtx([list([
    { description: "tracker.updated" },
    { description: "tracker.updated" },
    { description: "shipment.purchased" },
  ])]);
  const result = await action.execute!({}, ctx) as {
    count: number;
    typeCounts: Record<string, number>;
  };
  assertEquals(calls[0].url.split("?")[0], "https://api.easypost.com/v2/events");
  assertEquals(result.count, 3);
  assertEquals(result.typeCounts, { "tracker.updated": 2, "shipment.purchased": 1 });
});

Deno.test("event-list: the date window reaches the wire", async () => {
  const { ctx, calls } = mockCtx([list([])]);
  await action.execute!({ startDatetime: "2026-08-18T00:00:00Z" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("start_datetime"),
    "2026-08-18T00:00:00Z",
  );
});

Deno.test("event-list: logs a count", async () => {
  const { ctx, logs } = mockCtx([list([{ description: "tracker.updated" }])]);
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 1 });
});

Deno.test("event-list: says what it recovers", () => {
  assert(/while an endpoint was down/.test(action.description!), action.description);
});
