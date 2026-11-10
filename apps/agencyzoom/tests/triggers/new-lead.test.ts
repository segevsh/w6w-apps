import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-lead.ts";

test("new-lead seeds, emits, retries, and posts the rolling creation-date filter", async () => {
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:00:00.000Z");
  try {
    const input = { params: {}, subscriptionId: "s" };
    const seed = mockCtx([{ body: { leads: [{ id: 1 }], totalCount: 1 } }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(JSON.parse(seed.calls[0].body!), {
      startDate: "2026-11-08",
      page: 1,
      pageSize: 100,
    });
    clock.now = () => Date.parse("2026-11-09T12:01:00.000Z");
    const run = async () => {
      const result = await trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: { leads: [{ id: 2 }, { id: 1 }], totalCount: 2 } }]).ctx,
      );
      return result;
    };
    assertEquals((await run()).events, [{ id: 2 }]);
    assertEquals(await run(), await run());
  } finally {
    clock.now = originalNow;
  }
});
