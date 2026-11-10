import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event-template.ts";
test("new-event-template seeds, emits, retries, and requests templates", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: [{ id: "a" }] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.addevent.com/calevent/v2/events/templates?type=event-landing",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [{ id: "b" }, { id: "a" }] }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [{ id: "b" }, { id: "a" }] }]).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
