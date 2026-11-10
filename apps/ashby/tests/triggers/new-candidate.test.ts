import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-candidate.ts";

const page = (id: string) => ({ success: true, results: [{ id }], moreDataAvailable: false });

test("new-candidate seeds, emits, retries, and sends the rolling createdAfter filter", async () => {
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:00:00.000Z");
  try {
    const input = { params: {}, subscriptionId: "s" };
    const seed = mockCtx([{ body: page("a") }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(seed.calls[0].url, "https://api.ashbyhq.com/candidate.list");
    assertEquals(
      JSON.parse(seed.calls[0].body!).createdAfter,
      Date.parse("2026-11-09T11:58:00.000Z"),
    );
    clock.now = () => Date.parse("2026-11-09T12:05:00.000Z");
    const second = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page("b") }]).ctx,
    );
    assertEquals(second.events, [{ id: "b" }]);
    clock.now = () => Date.parse("2026-11-09T12:10:00.000Z");
    const next = mockCtx([{ body: page("c") }]);
    const emitted = await trigger.poll!({ ...input, state: second.nextState }, next.ctx);
    assertEquals(emitted.events, [{ id: "c" }]);
    assertEquals(
      JSON.parse(next.calls[0].body!).createdAfter,
      Date.parse("2026-11-09T12:03:00.000Z"),
    );
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page("b") }]).ctx);
    assertEquals(await run(), await run());
  } finally {
    clock.now = originalNow;
  }
});
