import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-deployment.ts";
import { clock, MAX_PAGES } from "../../lib/walk.ts";

const NOW = 1_794_700_000_000;
clock.now = () => NOW;
const input = { params: {}, subscriptionId: "sub-1" };
const AFTER = NOW + 60_000;
const BEFORE = NOW - 3_600_000;
const dep = (uid: string, created = AFTER) => ({ uid, created });
const body = (deployments: unknown[], next: number | null = null) => ({
  body: { deployments, pagination: { count: deployments.length, next } },
});
// Newest first, as Vercel returns them: created strictly decreasing across pages.
const full = (prefix: string, startCreated: number) =>
  Array.from({ length: 100 }, (_, i) => dep(`${prefix}${i}`, startCreated - i));
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);
const seed = () => trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);

test("new-deployment: the first check seeds a floor and reads nothing", async () => {
  const c = mockCtx([]);
  const s = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(s.events, []);
  assertEquals(c.calls.length, 0);
  assertEquals((s.nextState as { floor: number }).floor, NOW);
});

test("new-deployment: lists with since = last check - overlap, emits new ones, retries idempotently", async () => {
  const s = await seed();
  const c1 = mockCtx([body([dep("b"), dep("a")])]);
  const r1 = await trigger.poll!({ ...input, state: s.nextState }, c1.ctx);
  assertEquals(r1.events, [dep("b"), dep("a")]);
  assertEquals(c1.calls[0].method, "GET");
  assertEquals(new URL(c1.calls[0].url).pathname, "/v7/deployments");
  assertEquals(q(c1.calls[0].url), { since: String(NOW - 120_000), limit: "100" });
  const again = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx([body([dep("b"), dep("a")])]).ctx,
  );
  assertEquals(again, r1);
  const r2 = await trigger.poll!(
    { ...input, state: r1.nextState },
    mockCtx([body([dep("c"), dep("b")])]).ctx,
  );
  assertEquals(r2.events, [dep("c")]);
});

test("new-deployment: a window of MAX_PAGES + 1 full pages is drained across checks, none twice", async () => {
  const s = await seed();
  const pages = Array.from(
    { length: MAX_PAGES + 1 },
    (_, p) => full(`p${p}-`, AFTER + 1_000_000 - p * 100),
  );
  const next = (p: number) => pages[p][99].created;
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(pages.slice(0, MAX_PAGES).map((pg, p) => body(pg, next(p)))).ctx,
  );
  assertEquals(r1.events.length, MAX_PAGES * 100);
  assertEquals((r1.nextState as { cursor: number }).cursor, NOW);
  const c2 = mockCtx([body(pages[MAX_PAGES], next(MAX_PAGES)), body([])]);
  clock.now = () => NOW + 600_000;
  try {
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(r2.events.length, 100);
    assertEquals(q(c2.calls[0].url).until, String(pages[MAX_PAGES - 1][99].created));
    const ids = [...r1.events, ...r2.events].map((e) => (e as { uid: string }).uid);
    assertEquals(new Set(ids).size, (MAX_PAGES + 1) * 100);
    assertEquals((r2.nextState as { cursor: number }).cursor, NOW);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-deployment: deployments from before the seed never flood a later check", async () => {
  const s = await seed();
  const old = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(`o${p}-`, BEFORE - p * 100));
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(old.slice(0, MAX_PAGES).map((pg, p) => body(pg, old[p][99].created))).ctx,
  );
  assertEquals(r1.events, []);
  const r2 = await trigger.poll!(
    { ...input, state: r1.nextState },
    mockCtx([body(old[MAX_PAGES], old[MAX_PAGES][99].created), body([])]).ctx,
  );
  assertEquals(r2.events, []);
  const r3 = await trigger.poll!(
    { ...input, state: r2.nextState },
    mockCtx([body([dep("fresh")])]).ctx,
  );
  assertEquals(r3.events, [dep("fresh")]);
});

test("new-deployment: a deployment created while a drain spans checks is read by a later check", async () => {
  const s = await seed();
  const pages = Array.from(
    { length: MAX_PAGES + 1 },
    (_, p) => full(`p${p}-`, AFTER + 1_000_000 - p * 100),
  );
  const next = (p: number) => pages[p][99].created;
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(pages.slice(0, MAX_PAGES).map((pg, p) => body(pg, next(p)))).ctx,
  );
  // Persisted state is JSON: round-trip it between checks.
  const persisted = (st: unknown) => JSON.parse(JSON.stringify(st));
  // Created 5 minutes after the drain began, before the completing check; the drain's pages never held it.
  const mid = dep("mid", NOW + 300_000);
  clock.now = () => NOW + 600_000;
  try {
    const r2 = await trigger.poll!(
      { ...input, state: persisted(r1.nextState) },
      mockCtx([body(pages[MAX_PAGES], next(MAX_PAGES)), body([])]).ctx,
    );
    assertEquals((r2.nextState as { cursor: number }).cursor, NOW);
    clock.now = () => NOW + 1_200_000;
    const c3 = mockCtx([body([mid])]);
    const r3 = await trigger.poll!({ ...input, state: persisted(r2.nextState) }, c3.ctx);
    assertEquals(q(c3.calls[0].url).since, String(NOW - 120_000));
    assertEquals(r3.events, [mid]);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-deployment: a drain longer than SEEN_WINDOW emits none twice and loses none, with a mid-drain insert", async () => {
  type R = { id: number; created: number };
  const T0 = Date.parse("2026-11-09T17:00:30.000Z");
  const db: R[] = [];
  const vendor = (u: URL) => {
    let rows = [...db].sort((a, b) => b.created - a.created || b.id - a.id);
    const since = u.searchParams.get("since"), until = u.searchParams.get("until");
    if (since) rows = rows.filter((r) => r.created > Number(since));
    if (until) rows = rows.filter((r) => r.created < Number(until));
    const lim = Number(u.searchParams.get("limit") ?? 20);
    const pg = rows.slice(0, lim);
    return new Response(
      JSON.stringify({
        deployments: pg.map((r) => ({ uid: "d" + r.id, created: r.created })),
        pagination: {
          count: pg.length,
          next: rows.length > lim ? pg[pg.length - 1].created : null,
        },
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
      events: r.events as { uid: string }[],
      state: JSON.parse(JSON.stringify(r.nextState)),
    };
  };
  try {
    let s = (await run(T0, {})).state;
    const OUTAGE = 5 * 3600_000;
    const N = 2600;
    for (let i = 1; i <= N; i++) {
      db.push({ id: i, created: T0 + 1000 + Math.floor(i * (OUTAGE - 31_000) / N) });
    }
    const seen = new Map<string, number>();
    let t = T0 + OUTAGE;
    for (let k = 0; k < 14; k++) {
      if (k === 2) db.push({ id: 9999, created: t - 150_000 }); // lands between two drain checks
      const r = await run(t, s);
      s = r.state;
      for (const e of r.events) seen.set(e.uid, (seen.get(e.uid) ?? 0) + 1);
      t += 300_000;
    }
    const dups = [...seen].filter(([, n]) => n > 1);
    assertEquals(dups, []);
    assertEquals(seen.size, N + 1);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-deployment: a 2000-deployment import just before the first check emits each once (burst inside the overlap)", async () => {
  type R = { id: number; created: number };
  const T0 = Date.parse("2026-11-09T17:00:30.000Z");
  const db: R[] = [];
  const vendor = (u: URL) => {
    let rows = [...db].sort((a, b) => b.created - a.created || b.id - a.id);
    const since = u.searchParams.get("since"), until = u.searchParams.get("until");
    if (since) rows = rows.filter((r) => r.created > Number(since));
    if (until) rows = rows.filter((r) => r.created < Number(until));
    const lim = Number(u.searchParams.get("limit") ?? 20);
    const pg = rows.slice(0, lim);
    return new Response(
      JSON.stringify({
        deployments: pg.map((r) => ({ uid: "d" + r.id, created: r.created })),
        pagination: {
          count: pg.length,
          next: rows.length > lim ? pg[pg.length - 1].created : null,
        },
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
      events: r.events as { uid: string }[],
      state: JSON.parse(JSON.stringify(r.nextState)),
    };
  };
  try {
    let s = (await run(T0, {})).state;
    // 2000 records created within 20 s, the first check 40 s after the last of them: the whole
    // import lies inside the two-minute overlap of the check that follows the drain.
    const N = 2000;
    for (let i = 1; i <= N; i++) db.push({ id: i, created: T0 + 1000 + i * 10 });
    const seen = new Map<string, number>();
    let t = T0 + 1000 + N * 10 + 40_000;
    for (let k = 0; k < 14; k++) {
      const r = await run(t, s);
      s = r.state;
      for (const e of r.events) seen.set(e.uid, (seen.get(e.uid) ?? 0) + 1);
      t += 300_000;
    }
    assertEquals([...seen].filter(([, n]) => n > 1), []);
    assertEquals(seen.size, N);
  } finally {
    clock.now = () => NOW;
  }
});
