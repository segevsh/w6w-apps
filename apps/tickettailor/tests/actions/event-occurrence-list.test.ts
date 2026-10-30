import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import eventOccurrenceList from "../../actions/event-occurrence-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("event-occurrence-list: scoped to the event series' /events path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "ev_1" }]) }]);
  const result = await eventOccurrenceList.execute({ eventSeriesId: "es_1", limit: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1/events");
  assertEquals((result as { data: unknown[] }).data.length, 1);
});
