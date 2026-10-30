import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import eventOccurrenceGet from "../../actions/event-occurrence-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("event-occurrence-get: hits the nested event_series/.../events/{id} path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "ev_1", status: "ON_SALE" } }]);
  const result = await eventOccurrenceGet.execute(
    { eventSeriesId: "es_1", eventOccurrenceId: "ev_1" },
    ctx,
  ) as { status: string };
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1/events/ev_1");
  assertEquals(result.status, "ON_SALE");
});
