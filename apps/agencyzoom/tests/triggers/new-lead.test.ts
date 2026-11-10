import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-lead.ts";

test("new-lead seeds, emits, retries, and posts the rolling creation-date filter", async () => {
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:00:00.000Z");
  try {
    const input = { params: {}, subscriptionId: "s" };
    const existing = Array.from({ length: 100 }, (_value, index) => ({ id: index + 1 }));
    const seed = mockCtx([{ body: { leads: existing, totalCount: 100 } }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(JSON.parse(seed.calls[0].body!), {
      startDate: "2026-11-08",
      page: 1,
      pageSize: 100,
    });
    clock.now = () => Date.parse("2026-11-10T12:01:00.000Z");
    const next = mockCtx([
      { body: { leads: existing, totalCount: 101 } },
      { body: { leads: [{ id: 101 }], totalCount: 101 } },
    ]);
    const run = async () => {
      const result = await trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([
          { body: { leads: existing, totalCount: 101 } },
          { body: { leads: [{ id: 101 }], totalCount: 101 } },
        ]).ctx,
      );
      return result;
    };
    const emitted = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
    assertEquals(emitted.events, [{ id: 101 }]);
    assertEquals(JSON.parse(next.calls[0].body!), {
      startDate: "2026-11-08",
      page: 1,
      pageSize: 100,
    });
    clock.now = () => Date.parse("2026-11-11T12:01:00.000Z");
    const moved = mockCtx([{ body: { leads: [{ id: 102 }], totalCount: 1 } }]);
    await trigger.poll!({ ...input, state: emitted.nextState }, moved.ctx);
    assertEquals(JSON.parse(moved.calls[0].body!), {
      startDate: "2026-11-09",
      page: 1,
      pageSize: 100,
    });
    assertEquals(await run(), await run());
  } finally {
    clock.now = originalNow;
  }
});
