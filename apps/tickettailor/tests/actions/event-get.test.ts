import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("event-get: hits GET /events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "ev_1", event_series_id: "es_1" } }]);
  const result = await eventGet.execute({ eventId: "ev_1" }, ctx) as { event_series_id: string };
  assertEquals(pathOf(calls[0].url), "/v1/events/ev_1");
  assertEquals(result.event_series_id, "es_1");
});
