import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import newMonitor from "../../triggers/new-monitor.ts";
import newExclusionList from "../../triggers/new-exclusion-list.ts";
import newListContact from "../../triggers/new-list-contact.ts";
import newSignal from "../../triggers/new-signal.ts";
import { clock } from "../../lib/since.ts";

const H = "https://app.findymail.com";
const rec = (id: number) => ({ id, name: `n${id}` });

const cases = [
  {
    name: "new-monitor",
    t: newMonitor,
    params: {},
    url: `${H}/api/signals/monitors`,
    body: (ids: number[]) => ids.map(rec),
  },
  {
    name: "new-monitor (ownership=team)",
    t: newMonitor,
    params: { ownership: "team" },
    url: `${H}/api/signals/monitors?ownership=team`,
    body: (ids: number[]) => ids.map(rec),
  },
  {
    name: "new-exclusion-list",
    t: newExclusionList,
    params: {},
    url: `${H}/api/intellimatch/exclusion-lists`,
    body: (ids: number[]) => ({ lists: ids.map(rec) }),
  },
  {
    name: "new-list-contact",
    t: newListContact,
    params: { id: 16 },
    url: `${H}/api/contacts/get/16`,
    body: (ids: number[]) => ({
      draw: 1,
      recordsTotal: ids.length,
      recordsFiltered: ids.length,
      data: ids.map(rec),
    }),
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ params: c.params, subscriptionId: "sub-1", state });
    const poll = c.t.poll!;
    const ctx = (ids: number[]) => mockCtx([{ body: c.body(ids) }]);

    test("seeds without emitting; sends the literal request", async () => {
      const m = ctx([2, 1]);
      const out = await poll(input({}), m.ctx);
      assertEquals(out.events, []);
      assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(m.calls.length, 1);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, c.url);
    });

    test("emits exactly the new record and is idempotent on retry", async () => {
      const seeded = await poll(input({}), ctx([2, 1]).ctx);
      const run = () => poll(input(seeded.nextState), ctx([3, 2, 1]).ctx);
      const first = await run();
      assertEquals(first.events, [rec(3)]);
      assertEquals(await run(), first);
    });
  });
}

describe("new-list-contact", () => {
  test("a list larger than one response fails loudly instead of missing contacts", async () => {
    const m = mockCtx([{ body: { recordsTotal: 12, recordsFiltered: 12, data: [rec(1)] } }]);
    await assertRejects(
      () => newListContact.poll!({ params: { id: 16 }, subscriptionId: "s", state: {} }, m.ctx),
      Error,
      "12 contacts",
    );
  });
});

// --- new-signal: since-filter (brief 9.8 stall + 9.9 flood) -----------------------------------
describe("new-signal", () => {
  const input = (state: unknown, params = {}) => ({ params, subscriptionId: "s", state });
  const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
  const OLD = T0 - 3_600_000;
  const MAX_PAGES = 10;
  const PAGE = 100;
  const iso = (ms: number) => new Date(ms).toISOString();
  const sig = (id: string, at: number) => ({ id, type: "new_hire", detected_at: iso(at) });
  const pageOf = (items: unknown[], page: number, last: number): MockResponse => ({
    body: { data: items, meta: { current_page: page, last_page: last, per_page: PAGE } },
  });
  const full = (n: number, ts: number, last: number): MockResponse =>
    pageOf(Array.from({ length: PAGE }, (_, i) => sig(`n${n}-${i}`, ts)), n, last);
  const at = (ms: number) => {
    clock.now = () => ms;
  };
  const run = async (state: unknown, responses: MockResponse[], params = {}) => {
    const m = mockCtx(responses);
    const r = await newSignal.poll!(input(state, params), m.ctx);
    return { ...r, calls: m.calls };
  };
  const realNow = clock.now;

  test("seeds; literal request with date_from, page and per_page; one new signal; idempotent", async () => {
    try {
      at(T0);
      const seed = await run({}, [pageOf([sig("a", OLD)], 1, 1)], {
        signal_type: "new_hire",
        monitor_id: 7,
      });
      assertEquals(seed.events, []);
      assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(
        seed.calls[0].url,
        `${H}/api/signals?signal_type=new_hire&monitor_id=7&date_from=2026-11-10&page=1&per_page=100`,
      );
      at(T0 + 300_000);
      const rows = [sig("b", T0 + 100_000), sig("a", OLD)];
      const first = await run(seed.nextState, [pageOf(rows, 1, 1)]);
      const retry = await run(seed.nextState, [pageOf(rows, 1, 1)]);
      assertEquals(first.events.map((e) => (e as { id: string }).id), ["b"]);
      assertEquals(first.calls[0].url, `${H}/api/signals?date_from=2026-11-10&page=1&per_page=100`);
      assertEquals(retry.events, first.events);
      assertEquals(retry.nextState, first.nextState);
    } finally {
      clock.now = realNow;
    }
  });

  test("9.9: records that predate the seed never fire, even over more than maxPages full pages", async () => {
    try {
      at(T0);
      const seed = await run({}, [pageOf([sig("a", OLD)], 1, 1)]);
      let state = seed.nextState;
      at(T0 + 300_000);
      const r1 = await run(
        state,
        Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, OLD, MAX_PAGES + 1)),
      );
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events, []);
      state = r1.nextState;
      at(T0 + 600_000);
      const r2 = await run(state, [pageOf([sig("last-old", OLD)], MAX_PAGES + 1, MAX_PAGES + 1)]);
      assertEquals(r2.events, []);
      state = r2.nextState;
      at(T0 + 900_000);
      const fresh = sig("fresh", T0 + 400_000);
      const r3 = await run(state, [pageOf([sig("old-1", OLD), fresh], 1, 1)]);
      assertEquals(r3.events.map((e) => (e as { id: string }).id), ["fresh"]);
    } finally {
      clock.now = realNow;
    }
  });

  test("9.8: a window of maxPages + 1 pages is emitted once across checks; cursor advances after the drain", async () => {
    try {
      at(T0);
      const seed = await run({}, [pageOf([sig("a", OLD)], 1, 1)]);
      at(T0 + 300_000);
      const r1 = await run(
        seed.nextState,
        Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, T0 + 100_000, MAX_PAGES + 1)),
      );
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events.length, MAX_PAGES * PAGE);
      const n1 = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
      assertEquals(n1.cursor, T0);
      assertEquals(n1.resume?.pos, MAX_PAGES + 1);
      at(T0 + 600_000);
      const r2 = await run(r1.nextState, [
        pageOf([sig("tail", T0 + 100_000)], MAX_PAGES + 1, MAX_PAGES + 1),
      ]);
      // resumed from the persisted page, not page 1 again
      assertEquals(
        r2.calls[0].url,
        `${H}/api/signals?date_from=2026-11-10&page=11&per_page=100`,
      );
      assertEquals(r2.events.length, 1);
      const n2 = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(n2.cursor, T0 + 300_000);
      assertEquals(n2.resume, undefined);
      const all = [...r1.events, ...r2.events].map((e) => (e as { id: string }).id);
      assertEquals(all.length, MAX_PAGES * PAGE + 1);
      assertEquals(new Set(all).size, all.length);
    } finally {
      clock.now = realNow;
    }
  });
});
