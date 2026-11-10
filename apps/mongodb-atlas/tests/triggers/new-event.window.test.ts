import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-event.ts";

// Brief 9.9 (seed floor) and 9.8 (no stall) for new-event.
const input = { params: { projectId: "5f8d0d55b54eff0f2b2c3d4e" }, subscriptionId: "sub" };
const T0 = Date.parse("2026-11-09T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const ev = (id: string, ms: number) => ({ id, eventTypeName: "CREATED", created: iso(ms) });
const resp = (items: unknown[]) => ({ body: { results: items, totalCount: items.length } });
const fullPage = (n: number, ms: number) =>
  resp(Array.from({ length: 100 }, (_, i) => ev(`p${n}-${i}`, ms)));
const idOf = (e: unknown) => String((e as { id: string }).id);
const realNow = clock.now;

test("new-event: events that existed at the seed are never emitted, however many pages the window holds", async () => {
  try {
    clock.now = () => T0;
    const seed = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    assertEquals(seed.events, []);
    clock.now = () => T0 + 300_000;
    const pre = Array.from({ length: 5 }, (_, i) => fullPage(i + 1, T0 - 60_000));
    const r1 = await trigger.poll!({ ...input, state: seed.nextState }, mockCtx(pre).ctx);
    assertEquals(r1.events, []);
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      mockCtx([resp([ev("tail", T0 - 30_000)])]).ctx,
    );
    assertEquals(r2.events, []);
    clock.now = () => T0 + 600_000;
    const fresh = ev("fresh", T0 + 360_000);
    const r3 = await trigger.poll!({ ...input, state: r2.nextState }, mockCtx([resp([fresh])]).ctx);
    assertEquals(r3.events, [fresh]);
  } finally {
    clock.now = realNow;
  }
});

test("new-event: a window of 5+1 full pages is emitted once across two checks and the cursor advances after the drain", async () => {
  const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: T0 };
  const seen: string[] = [];
  try {
    clock.now = () => T0 + 600_000;
    const c1 = mockCtx(Array.from({ length: 5 }, (_, i) => fullPage(i + 1, T0 + 100_000)));
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 5);
    seen.push(...r1.events.map(idOf));
    const mid = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(mid.resume?.pos, 6);
    assertEquals(mid.cursor, T0);
    clock.now = () => T0 + 900_000;
    const c2 = mockCtx([resp(Array.from({ length: 25 }, (_, i) => ev(`z${i}`, T0 + 120_000)))]);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(c2.calls.length, 1);
    // The continuation asks for the page after the last one read, bounded by the window start.
    const url = new URL(c2.calls[0].url);
    assertEquals(url.searchParams.get("pageNum"), "6");
    assertEquals(url.searchParams.get("maxDate"), iso(T0 + 600_000));
    seen.push(...r2.events.map(idOf));
    const next = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, T0 + 600_000);
    assertEquals(next.resume, undefined);
    assertEquals(seen.length, 525);
    assertEquals(new Set(seen).size, 525);
  } finally {
    clock.now = realNow;
  }
});
