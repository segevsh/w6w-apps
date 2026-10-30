import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/scheduled-event-get.ts";

test("scheduled-event-get: addresses /scheduled_events/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  await action.execute({ event: "https://api.calendly.com/scheduled_events/DDDD" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/scheduled_events/DDDD");
  assertEquals(calls[0].method, "GET");
});
