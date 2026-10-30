import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import eventSeriesGet from "../../actions/event-series-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("event-series-get: hits GET /event_series/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "es_123", name: "Test" } }]);
  const result = await eventSeriesGet.execute({ eventSeriesId: "es_123" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_123");
  assertEquals((result as { name: string }).name, "Test");
});

test("event-series-get: URL-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await eventSeriesGet.execute({ eventSeriesId: "es 123/x" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es%20123%2Fx");
});
