import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-event.ts";

test("update-event: POSTs only provided fields under event", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ eventId: "42", name: "New", listed: false, venueId: "9" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/42/");
  assertEquals(JSON.parse(calls[0].body!), {
    event: { name: { html: "New" }, listed: false, venue_id: "9" },
  });
});

test("update-event: start builds nested timezone/utc", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { eventId: "42", startUtc: "2026-12-01T18:00:00Z", timezone: "UTC" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).event.start, {
    timezone: "UTC",
    utc: "2026-12-01T18:00:00Z",
  });
});
