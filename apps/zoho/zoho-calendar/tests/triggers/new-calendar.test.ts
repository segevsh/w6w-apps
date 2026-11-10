import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCalendarCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-calendar.ts";

test("new-calendar seeds, emits additions, retries, and calls the literal list endpoint", async () => {
  const seedCtx = mockCalendarCtx([{ body: { calendars: [{ uid: "a" }] } }]);
  const seeded = await trigger.poll!({ params: {}, subscriptionId: "sub", state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(new URL(seedCtx.calls[0].url).pathname, "/api/v1/calendars");
  const first = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockCalendarCtx([{ body: { calendars: [{ uid: "b" }, { uid: "a" }] } }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockCalendarCtx([{ body: { calendars: [{ uid: "b" }, { uid: "a" }] } }]).ctx,
  );
  assertEquals(first.events, [{ uid: "b" }]);
  assertEquals(retry, first);
});
