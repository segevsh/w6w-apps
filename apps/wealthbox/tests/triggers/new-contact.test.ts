import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";
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

test("new-contact: the first check seeds a floor and reads nothing", async () => {
  const c = mockCtx([]);
  const s = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(s.events, []);
  assertEquals(c.calls.length, 0);
  assertEquals((s.nextState as { floor: number }).floor, NOW);
});

test("new-contact: asks updated_since the last check minus the overlap, emits new rows, retries idempotently", async () => {
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

test("new-contact: a window of MAX_PAGES + 1 full pages is drained across checks, none twice", async () => {
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

test("new-contact: rows from before the seed never flood a later check", async () => {
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

test("new-contact: an edit of a known contact is not a new event", async () => {
  const s = await seed();
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx([body([row(1)])]).ctx,
  );
  const edited = row(1, AFTER, "2026-11-09 01:15 PM -0500");
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, mockCtx([body([edited])]).ctx);
  assertEquals(r2.events, []);
});

test("new-contact: a contact written while a drain spans checks is read by a later check", async () => {
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

test("new-contact: a row written seconds after a mid-minute seed is emitted, the previous minute's is not", async () => {
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

test("new-contact: a 2000-contact import (one minute stamp) just before the first check emits each once", async () => {
  type R = { id: number; created: number };
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (ms: number) => { // printed as the API does: minute precision, UTC-5
    const d = new Date(ms - 300 * 60_000);
    const h = d.getUTCHours();
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
      `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(d.getUTCMinutes())} ${h < 12 ? "AM" : "PM"} -0500`;
  };
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) ([AP]M) ([+-])(\d{2})(\d{2})$/.exec(s)!;
    const hour = (Number(m[4]) % 12) + (m[6] === "PM" ? 12 : 0);
    const off = (m[7] === "-" ? -1 : 1) * (Number(m[8]) * 60 + Number(m[9]));
    return Date.UTC(+m[1], +m[2] - 1, +m[3], hour, +m[5]) - off * 60_000;
  };
  const T0 = Date.parse("2026-11-09T17:00:30.000Z");
  const db: R[] = [];
  const vendor = (u: URL) => {
    let rows = [...db].sort((a, b) => a.created - b.created || a.id - b.id);
    const us = u.searchParams.get("updated_since");
    if (us) {
      const since = parse(us);
      rows = rows.filter((r) => Math.floor(r.created / 60_000) * 60_000 >= since);
    }
    const pp = Number(u.searchParams.get("per_page") ?? 25);
    const pg = Number(u.searchParams.get("page") ?? 1);
    return new Response(
      JSON.stringify({
        contacts: rows.slice((pg - 1) * pp, pg * pp).map((r) => ({
          id: r.id,
          created_at: fmt(r.created),
          updated_at: fmt(r.created),
        })),
      }),
      { headers: { "content-type": "application/json" } },
    );
  };
  const run = async (tick: number, state: unknown) => {
    clock.now = () => tick;
    const m = mockCtx([]);
    // deno-lint-ignore no-explicit-any
    (m.ctx as any).fetch = (inp: any) =>
      Promise.resolve(vendor(new URL(typeof inp === "string" ? inp : inp.url ?? String(inp))));
    const r = await trigger.poll!({ ...input, state }, m.ctx);
    return {
      events: r.events as { id: number }[],
      state: JSON.parse(JSON.stringify(r.nextState)),
    };
  };
  try {
    let s = (await run(T0, {})).state;
    // 2000 contacts created within 20 s (one printed minute), first check 40 s after the last.
    const N = 2000;
    for (let i = 1; i <= N; i++) db.push({ id: i, created: T0 + 1000 + i * 10 });
    const seen = new Map<number, number>();
    let t = T0 + 1000 + N * 10 + 40_000;
    for (let k = 0; k < 14; k++) {
      const r = await run(t, s);
      s = r.state;
      for (const e of r.events) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
      t += 300_000;
    }
    assertEquals([...seen].filter(([, n]) => n > 1), []);
    assertEquals(seen.size, N);
  } finally {
    clock.now = () => NOW;
  }
});
