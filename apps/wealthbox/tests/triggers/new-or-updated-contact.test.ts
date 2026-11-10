import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";
import { clock, MAX_PAGES } from "../../lib/walk.ts";

const NOW = Date.parse("2026-11-09T17:00:00.000Z");
clock.now = () => NOW;
const input = { params: {}, subscriptionId: "sub-1" };
// Wealthbox prints "YYYY-MM-DD hh:mm AM -0500"; the seed instant is 12:00 PM -0500.
const AFTER = "2026-11-09 12:30 PM -0500";
const BEFORE = "2026-11-09 11:00 AM -0500";
const row = (id: number, stamp = AFTER, edited = stamp) => ({
  id,
  created_at: stamp,
  updated_at: edited,
});
const body = (contacts: unknown[]) => ({ body: { contacts } });
const full = (from: number, stamp: string) =>
  Array.from({ length: 100 }, (_, i) => row(from + i, stamp));
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);
const seed = () => trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);

test("new-or-updated-contact: the first check seeds a floor and reads nothing", async () => {
  const c = mockCtx([]);
  const s = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(s.events, []);
  assertEquals(c.calls.length, 0);
  assertEquals((s.nextState as { floor: number }).floor, NOW);
});

test("new-or-updated-contact: asks updated_since the last check minus the overlap, emits new rows, retries idempotently", async () => {
  const s = await seed();
  const c1 = mockCtx([body([row(1), row(2)])]);
  const r1 = await trigger.poll!({ ...input, state: s.nextState }, c1.ctx);
  assertEquals(r1.events, [row(1), row(2)]);
  assertEquals(c1.calls[0].method, "GET");
  assertEquals(new URL(c1.calls[0].url).pathname, "/v1/contacts");
  // seed 17:00 UTC - 120 s, floored to the minute, printed in the API's own format.
  assertEquals(q(c1.calls[0].url), {
    updated_since: "2026-11-09 04:58 PM +0000",
    order: "updated",
    page: "1",
    per_page: "100",
  });
  const again = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx([body([row(1), row(2)])]).ctx,
  );
  assertEquals(again, r1);
  const r2 = await trigger.poll!(
    { ...input, state: r1.nextState },
    mockCtx([body([row(2), row(3)])]).ctx,
  );
  assertEquals(r2.events, [row(3)]);
});

test("new-or-updated-contact: a window of MAX_PAGES + 1 full pages is drained across checks, none twice", async () => {
  const s = await seed();
  const pages = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(1 + p * 100, AFTER));
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(pages.slice(0, MAX_PAGES).map(body)).ctx,
  );
  assertEquals(r1.events.length, MAX_PAGES * 100);
  assertEquals((r1.nextState as { cursor: number }).cursor, NOW);
  const c2 = mockCtx([body(pages[MAX_PAGES]), body([])]);
  clock.now = () => NOW + 600_000;
  try {
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(r2.events.length, 100);
    assertEquals(q(c2.calls[0].url).page, String(MAX_PAGES + 1));
    const ids = [...r1.events, ...r2.events].map((e) => (e as { id: number }).id);
    assertEquals(new Set(ids).size, (MAX_PAGES + 1) * 100);
    assertEquals((r2.nextState as { cursor: number }).cursor, NOW);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-or-updated-contact: rows from before the seed never flood a later check", async () => {
  const s = await seed();
  const old = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(1 + p * 100, BEFORE));
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(old.slice(0, MAX_PAGES).map(body)).ctx,
  );
  assertEquals(r1.events, []);
  const r2 = await trigger.poll!(
    { ...input, state: r1.nextState },
    mockCtx([body(old[MAX_PAGES]), body([])]).ctx,
  );
  assertEquals(r2.events, []);
  const r3 = await trigger.poll!(
    { ...input, state: r2.nextState },
    mockCtx([body([row(9999)])]).ctx,
  );
  assertEquals(r3.events, [row(9999)]);
});

test("new-or-updated-contact: an edited known contact is a new event; an old contact edited after the seed too", async () => {
  const s = await seed();
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx([body([row(1)])]).ctx,
  );
  const edited = row(1, AFTER, "2026-11-09 01:15 PM -0500");
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, mockCtx([body([edited])]).ctx);
  assertEquals(r2.events, [edited]);
  // Created long before the seed but edited after it: updated_at is the stamp, so it is emitted.
  const old = row(7, BEFORE, "2026-11-09 01:20 PM -0500");
  const r3 = await trigger.poll!({ ...input, state: r2.nextState }, mockCtx([body([old])]).ctx);
  assertEquals(r3.events, [old]);
});

test("new-or-updated-contact: a contact written while a drain spans checks is read by a later check", async () => {
  const s = await seed();
  const pages = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(1 + p * 100, AFTER));
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(pages.slice(0, MAX_PAGES).map(body)).ctx,
  );
  // Persisted state is JSON: round-trip it between checks.
  const persisted = (st: unknown) => JSON.parse(JSON.stringify(st));
  // Written 5 minutes after the drain began, before the completing check.
  const mid = row(9001, "2026-11-09 12:05 PM -0500");
  clock.now = () => NOW + 600_000;
  try {
    const r2 = await trigger.poll!(
      { ...input, state: persisted(r1.nextState) },
      mockCtx([body(pages[MAX_PAGES]), body([])]).ctx,
    );
    assertEquals((r2.nextState as { cursor: number }).cursor, NOW);
    clock.now = () => NOW + 1_200_000;
    const c3 = mockCtx([body([mid])]);
    const r3 = await trigger.poll!({ ...input, state: persisted(r2.nextState) }, c3.ctx);
    assertEquals(q(c3.calls[0].url).updated_since, "2026-11-09 04:58 PM +0000");
    assertEquals(r3.events, [mid]);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-or-updated-contact: a row written seconds after a mid-minute seed is emitted, the previous minute's is not", async () => {
  const SEED = Date.parse("2026-11-09T17:00:30.000Z");
  clock.now = () => SEED;
  try {
    const s = await seed();
    // Printed at minute precision: 12:00 PM -0500 is the seed's own minute (17:00 UTC).
    const r = await trigger.poll!(
      { ...input, state: s.nextState },
      mockCtx([body([row(1, "2026-11-09 12:00 PM -0500"), row(2, "2026-11-09 11:59 AM -0500")])])
        .ctx,
    );
    assertEquals(r.events, [row(1, "2026-11-09 12:00 PM -0500")]);
  } finally {
    clock.now = () => NOW;
  }
});
