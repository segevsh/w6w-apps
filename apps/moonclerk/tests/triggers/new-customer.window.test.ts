import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-customer.ts";

// Brief 9.8 (no stall) and 9.9 (seed floor) for new-customer.
const input = { params: {}, subscriptionId: "sub-1" };
const realNow = clock.now;
const setNow = (iso: string) => {
  clock.now = () => Date.parse(iso);
};
const mk = (id: string, iso: string) => ({ id, checkout: { date: iso } });
const page = (items: unknown[], _tok?: string) => ({ body: { customers: items } });
const fullPage = (n: number, iso: string, more: boolean) =>
  page(Array.from({ length: 100 }, (_, i) => mk(`p${n}-${i}`, iso)), more ? `tok${n}` : undefined);
const idOf = (e: unknown) => String((e as { id: string }).id);

test("new-customer: records that existed at the seed are never emitted, however many pages the window holds", async () => {
  try {
    setNow("2026-11-09T12:00:00Z");
    const seed = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    assertEquals(seed.events, []);
    setNow("2026-11-09T12:05:00Z");
    const pre = Array.from({ length: 5 }, (_, i) => i + 1);
    const r1 = await trigger.poll!(
      { ...input, state: seed.nextState },
      mockCtx(pre.map((k) => fullPage(k, "2026-11-09T11:59:00Z", true))).ctx,
    );
    assertEquals(r1.events, []);
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      mockCtx([page([mk("tail", "2026-11-09T11:59:30Z")])]).ctx,
    );
    assertEquals(r2.events, []);
    setNow("2026-11-09T12:10:00Z");
    const fresh = mk("fresh", "2026-11-09T12:06:00Z");
    const r3 = await trigger.poll!(
      { ...input, state: r2.nextState },
      mockCtx([page([fresh])]).ctx,
    );
    assertEquals(r3.events, [fresh]);
  } finally {
    clock.now = realNow;
  }
});

test("new-customer: a window of 5+1 full pages is emitted once across two checks and the cursor advances after the drain", async () => {
  const start = Date.parse("2026-11-09T11:00:00Z");
  const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start };
  const seen: string[] = [];
  try {
    setNow("2026-11-09T11:30:00Z");
    const c1 = mockCtx(
      Array.from({ length: 5 }, (_, i) => fullPage(i + 1, "2026-11-09T11:10:00Z", true)),
    );
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 5);
    seen.push(...r1.events.map(idOf));
    const mid = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(mid.resume?.pos !== undefined, true);
    assertEquals(mid.cursor, start);
    setNow("2026-11-09T11:35:00Z");
    const c2 = mockCtx([
      page(Array.from({ length: 50 }, (_, i) => mk(`z${i}`, "2026-11-09T11:12:00Z"))),
    ]);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    // The continuation asks for the position the previous check returned, not page 1.
    const resumePos = mid.resume?.pos;
    assertEquals(resumePos !== undefined, true);
    assertEquals(new URL(c2.calls[0].url).searchParams.get("offset"), String(resumePos));
    assertEquals(c2.calls.length, 1);
    seen.push(...r2.events.map(idOf));
    const next = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-09T11:30:00Z"));
    assertEquals(next.resume, undefined);
    assertEquals(seen.length, 550);
    assertEquals(new Set(seen).size, 550);
  } finally {
    clock.now = realNow;
  }
});
