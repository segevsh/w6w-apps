import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-payout.ts";
import { clock } from "../../lib/payouts.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";

// GET /v2/payouts?after=YYYY-MM-DD (gumroad.com/api, read 2026-11-10): "Only return payouts after
// this date", paged by page_key, no documented order -> since-filter window (brief 9.8, 9.9).
const input = { params: {}, subscriptionId: "sub" };
const MAX_PAGES = 5;
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString();
let seq = 0;
const payout = (at: number) => ({
  id: `pay-${++seq}`,
  amount: "10.00",
  currency: "USD",
  status: "completed",
  created_at: iso(at),
});
const page = (items: unknown[], next?: string): MockResponse => ({
  body: { success: true, payouts: items, ...(next ? { next_page_key: next } : {}) },
});
const full = (n: number, at: number, last = false): MockResponse =>
  page([payout(at), payout(at), payout(at)], last ? undefined : `k${n}`);
const at = (ms: number): void => {
  clock.now = () => ms;
};
const realNow = clock.now;
const run = async (state: unknown, responses: MockResponse[]) => {
  const m = mockCtx(responses);
  const r = await trigger.poll!({ ...input, state }, m.ctx);
  return { ...r, calls: m.calls };
};
const where = (c: { method: string; url: string }) => [
  c.method,
  new URL(c.url).pathname,
  new URL(c.url).search,
];
const seed = async () => {
  at(T0);
  const seeded = await run({}, [page([payout(OLD)])]);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { floor?: number }).floor, T0);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  return { seeded, state: seeded.nextState };
};

test("new-payout: the seed reads one page with the literal day-granular request and emits nothing", async () => {
  try {
    const { seeded } = await seed();
    assertEquals(seeded.calls.map(where), [
      ["GET", "/v2/payouts", "?after=2026-11-07&include_upcoming=false"],
    ]);
  } finally {
    clock.now = realNow;
  }
});

test("new-payout: after the seed one new payout is emitted, a retry is identical, the upcoming (null id) payout is dropped", async () => {
  try {
    const { state } = await seed();
    at(T0 + 300_000);
    const fresh = payout(T0 + 100_000);
    const upcoming = { id: null, amount: "75.00", status: "payable", created_at: iso(T0) };
    const responses = [page([upcoming, fresh, payout(OLD)])];
    const a = await run(state, responses);
    const b = await run(state, responses);
    assertEquals(a.events, [fresh]);
    assertEquals(JSON.stringify(a.events), JSON.stringify(b.events));
    assertEquals(JSON.stringify(a.nextState), JSON.stringify(b.nextState));
    assertEquals(a.calls.map(where), [
      ["GET", "/v2/payouts", "?after=2026-11-07&include_upcoming=false"],
    ]);
  } finally {
    clock.now = realNow;
  }
});

test("new-payout: payouts that predate the seed never fire, even over more than maxPages full pages", async () => {
  try {
    let { state } = await seed();
    at(T0 + 300_000);
    const r1 = await run(state, Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, OLD)));
    assertEquals(r1.calls.length, MAX_PAGES);
    assertEquals(r1.events, []);
    state = r1.nextState;
    at(T0 + 600_000);
    const r2 = await run(state, [full(MAX_PAGES + 1, OLD, true)]);
    assertEquals(r2.events, []);
    state = r2.nextState;
    at(T0 + 900_000);
    const created = payout(T0 + 400_000);
    const r3 = await run(state, [page([payout(OLD), created])]);
    assertEquals(r3.events, [created]);
  } finally {
    clock.now = realNow;
  }
});

test("new-payout: a window of maxPages + 1 pages is emitted once across checks and the cursor advances after the drain", async () => {
  try {
    const { state } = await seed();
    at(T0 + 300_000);
    const r1 = await run(
      state,
      Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, T0 + 100_000)),
    );
    assertEquals(r1.calls.length, MAX_PAGES);
    assertEquals(r1.calls.map((c) => new URL(c.url).search), [
      "?after=2026-11-07&include_upcoming=false",
      "?after=2026-11-07&include_upcoming=false&page_key=k1",
      "?after=2026-11-07&include_upcoming=false&page_key=k2",
      "?after=2026-11-07&include_upcoming=false&page_key=k3",
      "?after=2026-11-07&include_upcoming=false&page_key=k4",
    ]);
    assertEquals(r1.events.length, MAX_PAGES * 3);
    const n1 = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(n1.cursor, T0);
    assertEquals(n1.resume?.pos, "k5");
    at(T0 + 600_000);
    const r2 = await run(r1.nextState, [full(MAX_PAGES + 1, T0 + 100_000, true)]);
    assertEquals(r2.calls.map(where), [
      ["GET", "/v2/payouts", "?after=2026-11-07&include_upcoming=false&page_key=k5"],
    ]);
    assertEquals(r2.events.length, 3);
    const n2 = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(n2.cursor, T0 + 300_000);
    assertEquals(n2.resume, undefined);
    const all = [...r1.events, ...r2.events].map((e) => (e as { id: string }).id);
    assertEquals(all.length, MAX_PAGES * 3 + 3);
    assertEquals(new Set(all).size, all.length);
  } finally {
    clock.now = realNow;
  }
});

test("new-payout: declares output and a sample, and is a poll trigger", () => {
  assertEquals(trigger.output!.length > 0, true);
  assertEquals(trigger.sample !== undefined, true);
  assertEquals(typeof trigger.poll, "function");
  assertEquals(trigger.onSubscribe, undefined);
});
