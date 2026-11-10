import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import created from "../../triggers/new-employee.ts";
import updated from "../../triggers/new-or-updated-employee.ts";
import { clock } from "../../lib/triggers.ts";

// Brief 9.8 (no stall) and 9.9 (seed floor) for both employee triggers.
const T0 = Date.UTC(2026, 10, 10, 12, 0, 0);
const input = { params: {}, subscriptionId: "sub-1" };
const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const iso = (ms: number) => new Date(ms).toISOString().replace("Z", "+00:00");
const emp = (id: number | string, ms: number) => ({
  attributes: {
    id: { value: id },
    created_at: { value: iso(ms) },
    last_modified_at: { value: iso(ms) },
  },
});
const reply = (...employees: unknown[]) => mockCtx([{ body: { data: employees } }]);
const idOf = (e: unknown) => String((e as { id: unknown }).id);

for (
  const [name, trigger] of [["new-employee", created], [
    "new-or-updated-employee",
    updated,
  ]] as const
) {
  test(`${name}: employees that existed at the seed are never emitted, however many the window holds`, async () => {
    clock.now = () => T0;
    const seed = await trigger.poll!({ ...input, state: {} }, reply().ctx);
    assertEquals(seed.events, []);
    clock.now = () => T0 + 300_000;
    const old = Array.from({ length: 250 }, (_, i) => emp(1000 + i, T0 - 60_000 - i * 1000));
    const r1 = await trigger.poll!({ ...input, state: seed.nextState }, reply(...old).ctx);
    assertEquals(r1.events, []);
    clock.now = () => T0 + 600_000;
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      reply(...old, emp(1, T0 + 400_000)).ctx,
    );
    assertEquals(r2.events.map(idOf), ["1"]);
  });

  test(`${name}: a window of more than 500 employees is emitted once across checks, cursor advances after the drain`, async () => {
    const total = 600;
    const all = Array.from({ length: total }, (_, i) => emp(i + 1, T0 + 1000 + i * 1000));
    const seen: string[] = [];
    clock.now = () => T0;
    const seed = await trigger.poll!({ ...input, state: {} }, reply().ctx);
    clock.now = () => T0 + 1_000_000;
    const r1 = await trigger.poll!({ ...input, state: seed.nextState }, reply(...all).ctx);
    seen.push(...r1.events.map(idOf));
    assertEquals(r1.events.length, 500);
    assertEquals((r1.nextState as { cursor: number }).cursor, T0 + 1000 + 499 * 1000);
    clock.now = () => T0 + 1_300_000;
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, reply(...all).ctx);
    seen.push(...r2.events.map(idOf));
    assertEquals(seen.length, total);
    assertEquals(new Set(seen).size, total);
    assertEquals((r2.nextState as { cursor: number }).cursor, T0 + 1_300_000);
  });
}
