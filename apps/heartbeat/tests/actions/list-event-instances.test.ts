import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listEventInstances from "../../actions/list-event-instances.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("list-event-instances: GET /events/{id}/instances, wrapped under `instances`", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ startTime: "2026-01-01T00:00:00Z", endTime: "2026-01-01T01:00:00Z" }],
  }]);
  const out = await listEventInstances.execute({ eventID: "e1" }, ctx) as { instances: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/events/e1/instances");
  assertEquals(out.instances.length, 1);
});
