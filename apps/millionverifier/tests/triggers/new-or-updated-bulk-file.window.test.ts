import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-or-updated-bulk-file.ts";

// Brief 9.8 (no stall) and 9.9 (seed floor) for new-or-updated-bulk-file.
const input = { params: {}, subscriptionId: "sub-1" };
const realNow = clock.now;
const setNow = (iso: string) => {
  clock.now = () => Date.parse(iso);
};
const mk = (
  id: string,
  iso: string,
) => ({
  file_id: id,
  file_name: "f",
  status: "finished",
  createdate: iso.slice(0, 19).replace("T", " "),
  updated_at: iso.slice(0, 19).replace("T", " "),
});
const page = (items: unknown[], tok?: string) => ({
  body: { files: items, total: tok ? 1_000_000 : items.length },
});
const fullPage = (n: number, iso: string, more: boolean) =>
  page(Array.from({ length: 50 }, (_, i) => mk(`p${n}-${i}`, iso)), more ? `tok${n}` : undefined);
const idOf = (e: unknown) => String((e as { fileId: string }).fileId);

test("new-or-updated-bulk-file: records that existed at the seed are never emitted, however many pages the window holds", async () => {
  try {
    setNow("2026-11-09T12:00:00Z");
    const seed = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
    assertEquals(seed.events, []);
    setNow("2026-11-09T12:05:00Z");
    const pre = Array.from({ length: 3 }, (_, i) => i + 1);
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
    assertEquals(r3.events.map(idOf), ["fresh"]);
  } finally {
    clock.now = realNow;
  }
});

test("new-or-updated-bulk-file: a window of 3+1 full pages is emitted once across two checks and the cursor advances after the drain", async () => {
  const start = Date.parse("2026-11-09T11:00:00Z");
  const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start };
  const seen: string[] = [];
  try {
    setNow("2026-11-09T11:30:00Z");
    const c1 = mockCtx(
      Array.from({ length: 3 }, (_, i) => fullPage(i + 1, "2026-11-09T11:10:00Z", true)),
    );
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 3);
    seen.push(...r1.events.map(idOf));
    const mid = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(mid.resume?.pos !== undefined, true);
    assertEquals(mid.cursor, start);
    setNow("2026-11-09T11:35:00Z");
    const c2 = mockCtx([
      page(Array.from({ length: 50 }, (_, i) => mk(`z${i}`, "2026-11-09T11:12:00Z"))),
    ]);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(c2.calls.length, 1);
    seen.push(...r2.events.map(idOf));
    const next = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-09T11:30:00Z"));
    assertEquals(next.resume, undefined);
    assertEquals(seen.length, 200);
    assertEquals(new Set(seen).size, 200);
  } finally {
    clock.now = realNow;
  }
});
