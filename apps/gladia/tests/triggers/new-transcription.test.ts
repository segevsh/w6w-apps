import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transcription.ts";

const params = {};
const input = { params, subscriptionId: "sub-1" };
const item = (
  id: number,
  updated = "2026-11-09T10:00:00Z",
) => ({ id: `job-${id}`, status: "queued", kind: "pre-recorded", created_at: updated });
const body = (items: unknown[]) => ({ first: "", current: "", next: null, items });
const ctx = (items: unknown[]) => mockCtx([{ body: body(items) }]);
const CURSOR = Date.parse("2026-11-09T10:00:00Z");
const seeded = { v: 1, kind: "ids", seeded: true, ids: ["job-1"], cursor: CURSOR };
const realNow = Date.now;

test("new-transcription: seed check emits nothing and records the cursor/ids", async () => {
  Date.now = () => Date.parse("2026-11-09T12:00:00Z");
  try {
    const c = ctx([item(1)]);
    const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals((r.nextState as { cursor?: number }).cursor, Date.parse("2026-11-09T12:00:00Z"));
  } finally {
    Date.now = realNow;
  }
});

test("new-transcription: emits only the record that is new", async () => {
  const state = seeded;
  const r = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
  assertEquals(r.events, [item(2)]);
});

test("new-transcription: the same state and responses give the same result", async () => {
  const state = seeded;
  Date.now = () => Date.parse("2026-11-09T12:00:00Z");
  try {
    const a = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
    const b = await trigger.poll!({ ...input, state }, ctx([item(2), item(1)]).ctx);
    assertEquals(a, b);
  } finally {
    Date.now = realNow;
  }
});

test("new-transcription: requests exactly the endpoint the list action calls", async () => {
  const state = seeded;
  const c = ctx([item(1)]);
  await trigger.poll!({ ...input, state }, c.ctx);
  assertEquals(c.calls.length, 1);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api.gladia.io/v2/pre-recorded?offset=0&limit=100&after_date=2026-11-09T09%3A58%3A00.000Z",
  );
});

const at = (iso: string) => {
  Date.now = () => Date.parse(iso);
};
const page = (n: number, from: string, more: boolean) => ({
  body: {
    items: Array.from({ length: 100 }, (_, i) => item(n * 1000 + i, from)),
    next: more ? "https://api.gladia.io/v2/pre-recorded?next" : null,
  },
});

test("new-transcription: records that existed at the seed are never emitted, however many pages the window holds", async () => {
  try {
    at("2026-11-09T12:00:00Z");
    const seed = await trigger.poll!({ ...input, state: {} }, ctx([]).ctx);
    assertEquals(seed.events, []);
    at("2026-11-09T12:05:00Z");
    const flood = mockCtx([1, 2, 3, 4, 5].map((n) => page(n, "2026-11-09T11:59:00Z", true)));
    const r1 = await trigger.poll!({ ...input, state: seed.nextState }, flood.ctx);
    assertEquals(r1.events, []);
    const r2 = await trigger.poll!(
      { ...input, state: r1.nextState },
      mockCtx([{ body: { items: [item(9001, "2026-11-09T11:59:30Z")], next: null } }]).ctx,
    );
    assertEquals(r2.events, []);
    at("2026-11-09T12:10:00Z");
    const fresh = item(9002, "2026-11-09T12:06:00Z");
    const r3 = await trigger.poll!(
      { ...input, state: r2.nextState },
      mockCtx([{ body: { items: [fresh], next: null } }]).ctx,
    );
    assertEquals(r3.events, [fresh]);
  } finally {
    Date.now = realNow;
  }
});

test("new-transcription: a window of six full pages is emitted once across two checks and the cursor advances after the drain", async () => {
  const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: CURSOR };
  const seen: string[] = [];
  try {
    at("2026-11-09T10:30:00Z");
    const c1 = mockCtx([1, 2, 3, 4, 5].map((n) => page(n, "2026-11-09T10:10:00Z", true)));
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 5);
    seen.push(...r1.events.map((e) => String((e as { id: string }).id)));
    const mid = r1.nextState as { cursor?: number; resume?: { pos?: number } };
    assertEquals(mid.resume?.pos, 500);
    assertEquals(mid.cursor, CURSOR);
    at("2026-11-09T10:35:00Z");
    const c2 = mockCtx([page(6, "2026-11-09T10:12:00Z", false)]);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    const url = new URL(c2.calls[0].url);
    assertEquals(url.searchParams.get("offset"), "500");
    assertEquals(url.searchParams.get("before_date"), "2026-11-09T10:30:00.000Z");
    seen.push(...r2.events.map((e) => String((e as { id: string }).id)));
    const next = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-09T10:30:00Z"));
    assertEquals(next.resume, undefined);
    assertEquals(seen.length, 600);
    assertEquals(new Set(seen).size, 600);
  } finally {
    Date.now = realNow;
  }
});
