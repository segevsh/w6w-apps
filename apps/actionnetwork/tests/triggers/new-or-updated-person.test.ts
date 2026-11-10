import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock, newOrUpdatedPerson as trigger } from "../../triggers/new-person.ts";

const page = (id: string, modifiedDate: string) => ({
  _embedded: {
    "osdi:people": [{ identifiers: [`action_network:${id}`], modified_date: modifiedDate }],
  },
  _links: {},
});

test("new-or-updated-person seeds, emits, retries, and requests a moving modified_date filter", async () => {
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:00:00.000Z");
  try {
    const input = { params: {}, subscriptionId: "s" };
    const seed = mockCtx([{ body: page("a", "2026-11-09T11:00:00.000Z") }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(
      seed.calls[0].url,
      "https://actionnetwork.org/api/v2/people?page=1&per_page=25&filter=modified_date+gt+%272026-11-09T11%3A58%3A00.000Z%27",
    );
    clock.now = () => Date.parse("2026-11-09T12:05:00.000Z");
    const second = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page("a", "2026-11-09T12:04:00.000Z") }]).ctx,
    );
    assertEquals(second.events.map((item) => (item as { id: string }).id), ["a"]);
    clock.now = () => Date.parse("2026-11-09T12:10:00.000Z");
    const next = mockCtx([{ body: page("b", "2026-11-09T12:09:00.000Z") }]);
    const emitted = await trigger.poll!({ ...input, state: second.nextState }, next.ctx);
    assertEquals(emitted.events.map((item) => (item as { id: string }).id), ["b"]);
    assertEquals(
      next.calls[0].url,
      "https://actionnetwork.org/api/v2/people?page=1&per_page=25&filter=modified_date+gt+%272026-11-09T12%3A03%3A00.000Z%27",
    );
    const run = () =>
      trigger.poll!(
        { ...input, state: second.nextState },
        mockCtx([{ body: page("b", "2026-11-09T12:09:00.000Z") }]).ctx,
      );
    assertEquals(await run(), await run());
  } finally {
    clock.now = originalNow;
  }
});
