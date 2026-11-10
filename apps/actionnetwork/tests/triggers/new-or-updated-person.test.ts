import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock, newOrUpdatedPerson as trigger } from "../../triggers/new-person.ts";

const page = (id: string) => ({
  _embedded: { "osdi:people": [{ identifiers: [`action_network:${id}`] }] },
  _links: {},
});

test("new-or-updated-person seeds, emits, retries, and requests a moving modified_date filter", async () => {
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:00:00.000Z");
  try {
    const input = { params: {}, subscriptionId: "s" };
    const seed = mockCtx([{ body: page("a") }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(
      seed.calls[0].url,
      "https://actionnetwork.org/api/v2/people?page=1&per_page=25&filter=modified_date+gt+%272026-11-09T11%3A58%3A00.000Z%27",
    );
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page("b") }]).ctx);
    assertEquals((await run()).events.length, 1);
    assertEquals(await run(), await run());
  } finally {
    clock.now = originalNow;
  }
});
