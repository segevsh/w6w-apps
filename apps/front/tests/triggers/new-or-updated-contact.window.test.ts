import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

// Brief 9.9 (seed floor) and 9.8 (a window of several pages is read whole in one check, never cut).
const input = { params: {}, subscriptionId: "sub-1" };
const PAGE = 100;
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
let seq = 0;
const rec = (ms: number) => ({ id: `crd_${++seq}`, name: "Ada", updated_at: ms / 1000 });
const pageOf = (items: unknown[], more: boolean, n: number): MockResponse => ({
  body: {
    _results: items,
    _pagination: more
      ? { next: `https://api2.frontapp.com/contacts?limit=100&page_token=t${n}` }
      : {},
  },
});
const pages = (count: number, ms: number): MockResponse[] =>
  Array.from(
    { length: count },
    (_, i) => pageOf(Array.from({ length: PAGE }, () => rec(ms)), i < count - 1, i + 1),
  );
const realNow = Date.now;
const run = async (state: unknown, now: number, responses: MockResponse[]) => {
  Date.now = () => now;
  const m = mockCtx(responses);
  return { ...(await trigger.poll!({ ...input, state }, m.ctx)), calls: m.calls };
};

test("new-or-updated-contact: contacts that predate the seed never fire, even over several pages", async () => {
  try {
    const seeded = await run({}, T0, [pageOf([rec(OLD)], false, 1)]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { floor?: number }).floor, T0);
    const flood = await run(seeded.nextState, T0 + 300_000, pages(6, OLD));
    assertEquals(flood.calls.length, 6);
    assertEquals(flood.events, []);
    const fresh = rec(T0 + 400_000);
    const next = await run(flood.nextState, T0 + 600_000, [pageOf([rec(OLD), fresh], false, 1)]);
    assertEquals(next.events, [fresh]);
  } finally {
    Date.now = realNow;
  }
});

test("new-or-updated-contact: a window of 6 pages is read whole, emitted once, and the cursor advances", async () => {
  try {
    const seeded = await run({}, T0, [pageOf([rec(OLD)], false, 1)]);
    const window = pages(6, T0 + 100_000);
    const r1 = await run(seeded.nextState, T0 + 300_000, window);
    assertEquals(r1.calls.length, 6);
    assertEquals(r1.events.length, 6 * PAGE);
    assertEquals((r1.nextState as { cursor?: number }).cursor, T0 + 300_000);
    assertEquals((r1.nextState as { resume?: unknown }).resume, undefined);
    const r2 = await run(r1.nextState, T0 + 600_000, window);
    assertEquals(r2.events, []);
    assertEquals(new Set(r1.events.map((e) => JSON.stringify(e))).size, 6 * PAGE);
  } finally {
    Date.now = realNow;
  }
});
