import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-ticket.ts";
const page = (items: unknown[]) => ({ success: true, data: { items, has_more: false } });
test("new-ticket seeds, emits, retries, and requests tickets since its cursor", async () => {
  const input = { params: { ticketFormId: "tf1" }, subscriptionId: "s" };
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:00:00.000Z");
  try {
    const seed = mockCtx([{ body: page([{ id: "a" }]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(
      seed.calls[0].url,
      "https://api.aidbase.ai/v1/ticket-form/tf1/tickets?created_after=2026-11-09T11%3A58%3A00.000Z&limit=100",
    );
    clock.now = () => Date.parse("2026-11-09T12:01:00.000Z");
    const run = () =>
      trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
      );
    const first = await run();
    const retry = await run();
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(retry, first);
  } finally {
    clock.now = originalNow;
  }
});
