import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-attendee.ts";
import { ATTENDEE_MAX_PAGES, ATTENDEE_PAGE_SIZE, clock } from "../../lib/polls.ts";

// Brief 5 (four cases), 9.2 (an edit is a new event), 9.8 (a window of more than maxPages pages is
// drained across checks, none twice, cursor advances after) and 9.9 (the seed floor).
const API = "https://www.eventbriteapi.com/v3";
const PARAMS = { scope: "organization", scopeId: "org-1" };
const T0 = Date.UTC(2026, 10, 10, 12, 0, 0);
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
// `changed_since` as the request carries it: the colons are percent-encoded.
const since = (ms: number): string => `changed_since=${encodeURIComponent(iso(ms))}`;
const URL0 = (ms: number) => `${API}/organizations/org-1/attendees/?${since(ms)}`;
let seq = 0;
const att = (changedMs: number, id = `att-${++seq}`) => ({ id, changed: iso(changedMs) });
const page = (items: unknown[], next?: string): MockResponse => ({
  body: {
    attendees: items,
    pagination: next ? { has_more_items: true, continuation: next } : { has_more_items: false },
  },
});
const PAGES = (count: number, changedMs: number): MockResponse[] =>
  Array.from(
    { length: count },
    (_, i) =>
      page(
        Array.from({ length: ATTENDEE_PAGE_SIZE }, () => att(changedMs)),
        i < count - 1 ? `c${i + 1}` : undefined,
      ),
  );
const run = async (state: unknown, now: number, responses: MockResponse[], params = PARAMS) => {
  clock.now = () => now;
  const m = mockCtx(responses);
  return {
    ...(await trigger.poll!({ params, state, subscriptionId: "s" }, m.ctx)),
    calls: m.calls,
  };
};

test("new-or-updated-attendee: seed emits nothing, stores the floor, sends the literal request", async () => {
  const seeded = await run({}, T0, [page([att(OLD)])]);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { floor?: number }).floor, T0);
  assertEquals(seeded.calls.length, 1);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(seeded.calls[0].url, URL0(T0 - 120_000));
  assertEquals(
    seeded.calls[0].url,
    `${API}/organizations/org-1/attendees/?changed_since=2026-11-10T11%3A58%3A00Z`,
  );
});

test("new-or-updated-attendee: a new attendee is emitted once; the next window sends cursor - 2 min", async () => {
  const seeded = await run({}, T0, [page([])]);
  const fresh = att(T0 + 60_000, "att-new");
  const second = await run(seeded.nextState, T0 + 300_000, [page([fresh])]);
  assertEquals(second.events, [fresh]);
  assertEquals(second.calls[0].url, URL0(T0 - 120_000));
  const third = await run(second.nextState, T0 + 600_000, [page([fresh])]);
  assertEquals(third.events, []);
  assertEquals(third.calls[0].url, URL0(T0 + 300_000 - 120_000));
});

test("new-or-updated-attendee: the same state and responses give the same result", async () => {
  const seeded = await run({}, T0, [page([])]);
  const r = () => run(seeded.nextState, T0 + 300_000, [page([att(T0 + 60_000, "att-x")])]);
  assertEquals(await r(), await r());
});

test("new-or-updated-attendee: an edited attendee is announced again, an untouched one is not", async () => {
  const seeded = await run({}, T0, [page([])]);
  const first = att(T0 + 60_000, "att-1");
  const r1 = await run(seeded.nextState, T0 + 300_000, [page([first])]);
  assertEquals(r1.events, [first]);
  const edited = { id: "att-1", changed: iso(T0 + 400_000) };
  const r2 = await run(r1.nextState, T0 + 600_000, [page([first, edited])]);
  assertEquals(r2.events, [edited]);
  const r3 = await run(r2.nextState, T0 + 900_000, [page([edited])]);
  assertEquals(r3.events, []);
});

test("new-or-updated-attendee: a watched event uses the event endpoint", async () => {
  const seeded = await run({}, T0, [page([])], { scope: "event", scopeId: "evt-1" });
  assertEquals(
    seeded.calls[0].url,
    `${API}/events/evt-1/attendees/?changed_since=2026-11-10T11%3A58%3A00Z`,
  );
});

test("new-or-updated-attendee: a missing scope id is refused before any request", async () => {
  clock.now = () => T0;
  const m = mockCtx([]);
  await assertRejects(
    async () =>
      await trigger.poll!(
        { params: { scope: "organization" }, state: {}, subscriptionId: "s" },
        m.ctx,
      ),
    Error,
    "Set Scope ID",
  );
  assertEquals(m.calls.length, 0);
});

test("new-or-updated-attendee: attendees changed before the seed never fire, however many pages", async () => {
  const seeded = await run({}, T0, [page([att(OLD)])]);
  const pagesOld = PAGES(ATTENDEE_MAX_PAGES + 1, OLD);
  const r1 = await run(seeded.nextState, T0 + 300_000, pagesOld);
  assertEquals(r1.calls.length, ATTENDEE_MAX_PAGES);
  assertEquals(r1.events, []);
  const r2 = await run(r1.nextState, T0 + 600_000, [pagesOld[ATTENDEE_MAX_PAGES]]);
  assertEquals(r2.events, []);
  const fresh = att(T0 + 700_000, "att-after-seed");
  const r3 = await run(r2.nextState, T0 + 900_000, [page([att(OLD), fresh])]);
  assertEquals(r3.events, [fresh]);
});

test("new-or-updated-attendee: a window of maxPages + 1 pages drains across checks, none twice", async () => {
  const seeded = await run({}, T0, [page([])]);
  const window = PAGES(ATTENDEE_MAX_PAGES + 1, T0 + 100_000);
  const r1 = await run(seeded.nextState, T0 + 300_000, window);
  assertEquals(r1.calls.length, ATTENDEE_MAX_PAGES);
  assertEquals(r1.events.length, ATTENDEE_MAX_PAGES * ATTENDEE_PAGE_SIZE);
  // Not drained: the cursor stays and the resume position is stored.
  assertEquals((r1.nextState as { cursor?: number }).cursor, T0);
  assertEquals((r1.nextState as { resume?: { pos?: string } }).resume?.pos, "c3");
  const r2 = await run(r1.nextState, T0 + 600_000, [window[ATTENDEE_MAX_PAGES]]);
  assertEquals(r2.calls.length, 1);
  // Same window as the first check, now continued from the stored token.
  assertEquals(r2.calls[0].url, `${URL0(T0 - 120_000)}&continuation=c3`);
  assertEquals(r2.events.length, ATTENDEE_PAGE_SIZE);
  assertEquals(
    new Set([...r1.events, ...r2.events].map((e) => (e as { id: string }).id)).size,
    (ATTENDEE_MAX_PAGES + 1) * ATTENDEE_PAGE_SIZE,
  );
  // Drained: the cursor advances to the moment the window started, and nothing is left.
  assertEquals((r2.nextState as { cursor?: number }).cursor, T0 + 300_000);
  assertEquals((r2.nextState as { resume?: unknown }).resume, undefined);
  const r3 = await run(r2.nextState, T0 + 900_000, [page([])]);
  assertEquals(r3.events, []);
  assertEquals(r3.calls[0].url, URL0(T0 + 300_000 - 120_000));
});
