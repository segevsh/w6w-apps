import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-matter.ts";
import { clock } from "../../lib/triggers.ts";
// Brief 9.9 (seed floor) and 9.8 (a window longer than maxPages is resumed, not re-read forever).
const input = { params: {}, subscriptionId: "sub-1" };
const MAX_PAGES = 5;
const TAIL: MockResponse[] = [];
const PAGE = 100;
let seq = 0;
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString();
const rec = (id: string, at: number) => ({
  id: ++seq,
  name: id,
  created_at: iso(at),
  updated_at: iso(at),
});
const pageOf = (items: unknown[], more: boolean, n: number) => ({
  body: {
    data: items,
    ...(more
      ? {
        meta: {
          paging: { next: `https://app.clio.com/api/v4/matters.json?page_token=t${n + 1}` },
        },
      }
      : {}),
  },
});
const realNow = Date.now;
const at = (ms: number): void => {
  clock.now = () => ms;
};
const full = (n: number, ts: number, last = false): MockResponse =>
  pageOf(
    Array.from({ length: last ? 1 : PAGE }, (_, i) => rec(`n${n}-${i}`, ts)),
    !last,
    n,
  );
const run = (state: unknown, responses: MockResponse[]) => {
  const m = mockCtx(responses);
  return trigger.poll!({ ...input, state }, m.ctx).then((r) => ({ ...r, calls: m.calls }));
};
const seed = async () => {
  at(T0);
  const seeded = await run({}, [pageOf([rec("seed-a", OLD)], false, 1)]);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { floor?: number }).floor, T0);
  return seeded.nextState;
};

test("new-or-updated-matter: records that predate the seed never fire, even over more than maxPages full pages", async () => {
  try {
    let state = await seed();
    at(T0 + 300_000);
    const r1 = await run(
      state,
      Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, OLD)),
    );
    assertEquals(r1.calls.length, MAX_PAGES);
    assertEquals(r1.events, []);
    state = r1.nextState;
    at(T0 + 600_000);
    const r2 = await run(state, [full(MAX_PAGES + 1, OLD, true), ...TAIL]);
    assertEquals(r2.events, []);
    state = r2.nextState;
    at(T0 + 900_000);
    const fresh = rec("fresh", T0 + 400_000);
    const r3 = await run(state, [pageOf([rec("old-1", OLD), fresh], false, 1), ...TAIL]);
    assertEquals(r3.events.length, 1);
    assertEquals((r3.events[0] as { id: number }).id > 0, true);
  } finally {
    Date.now = realNow;
  }
});

test("new-or-updated-matter: a window of maxPages + 1 pages is emitted once across checks and the cursor advances after the drain", async () => {
  try {
    let state = await seed();
    at(T0 + 300_000);
    const r1 = await run(
      state,
      Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, T0 + 100_000)),
    );
    assertEquals(r1.calls.length, MAX_PAGES);
    assertEquals(r1.events.length, MAX_PAGES * PAGE);
    const n1 = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(n1.cursor, T0);
    assertEquals(n1.resume?.pos, "t" + (MAX_PAGES + 1));
    state = r1.nextState;
    at(T0 + 600_000);
    const r2 = await run(state, [full(MAX_PAGES + 1, T0 + 100_000, true), ...TAIL]);
    // The resumed check must continue from the persisted position, not read the window from the start again.
    assertEquals(JSON.stringify(r2.calls[0]) === JSON.stringify(r1.calls[0]), false);
    assertEquals(r2.calls.length, 1 + TAIL.length);
    assertEquals(r2.events.length, 1);
    const n2 = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(n2.cursor, T0 + 300_000);
    assertEquals(n2.resume, undefined);
    const all = [...r1.events, ...r2.events].map((e) => JSON.stringify(e));
    assertEquals(all.length, MAX_PAGES * PAGE + 1);
    assertEquals(new Set(all).size, all.length);
  } finally {
    Date.now = realNow;
  }
});
