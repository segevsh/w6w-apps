import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";
import { clock, MAX_PAGES } from "../../lib/walk.ts";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
clock.now = () => NOW;
const input = { params: { events: "dsync.user.created" }, subscriptionId: "sub-1" };
const BEFORE = "2026-11-09T11:00:00.000Z";
const AFTER = "2026-11-09T12:30:00.000Z";
const ev = (id: string, created_at = AFTER) => ({ id, created_at });
const page = (items: unknown[]) => ({
  body: { data: items, list_metadata: { after: items.length ? "x" : null } },
});
const full = (prefix: string, created_at: string) =>
  Array.from({ length: 100 }, (_, i) => ev(`${prefix}${i}`, created_at));
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);

test("new-event: first check seeds a floor and reads nothing", async () => {
  const c = mockCtx([]);
  const s = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(s.events, []);
  assertEquals(c.calls.length, 0);
  assertEquals((s.nextState as { floor: number }).floor, NOW);
});

test("new-event: reads oldest-first from range_start=floor, then resumes `after` the last id", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const c1 = mockCtx([page([ev("e1"), ev("e2")])]);
  const r1 = await trigger.poll!({ ...input, state: seeded.nextState }, c1.ctx);
  assertEquals(r1.events, [ev("e1"), ev("e2")]);
  assertEquals(c1.calls[0].method, "GET");
  assertEquals(q(c1.calls[0].url), {
    events: "dsync.user.created",
    limit: "100",
    range_start: "2026-11-09T12:00:00.000Z",
  });
  assertEquals(
    new URL(c1.calls[0].url).origin + new URL(c1.calls[0].url).pathname,
    "https://api.workos.com/events",
  );
  // Retry of the same check from the same state is identical.
  const again = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page([ev("e1"), ev("e2")])]).ctx,
  );
  assertEquals(again, r1);
  const c2 = mockCtx([page([ev("e3")])]);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(r2.events, [ev("e3")]);
  assertEquals(q(c2.calls[0].url), { events: "dsync.user.created", limit: "100", after: "e2" });
});

test("new-event: a window of MAX_PAGES + 1 full pages is drained across checks, none twice", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const pages = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(`p${p}-`, AFTER));
  const c1 = mockCtx(pages.slice(0, MAX_PAGES).map(page));
  const r1 = await trigger.poll!({ ...input, state: seeded.nextState }, c1.ctx);
  assertEquals(r1.events.length, MAX_PAGES * 100);
  assertEquals(
    (r1.nextState as { cursor: number }).cursor,
    NOW,
    "cursor held at the seed while the window is not drained",
  );
  const c2 = mockCtx([page(pages[MAX_PAGES]), page([])]);
  clock.now = () => NOW + 600_000;
  try {
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(r2.events.length, 100);
    assertEquals(q(c2.calls[0].url).after, `p${MAX_PAGES - 1}-99`);
    const ids = [...r1.events, ...r2.events].map((e) => (e as { id: string }).id);
    assertEquals(new Set(ids).size, (MAX_PAGES + 1) * 100);
    assertEquals((r2.nextState as { cursor: number }).cursor, NOW + 600_000);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-event: records created before the seed never flood a later check", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const old = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(`o${p}-`, BEFORE));
  const c1 = mockCtx(old.slice(0, MAX_PAGES).map(page));
  const r1 = await trigger.poll!({ ...input, state: seeded.nextState }, c1.ctx);
  assertEquals(r1.events, []);
  const c2 = mockCtx([page(old[MAX_PAGES]), page([])]);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(r2.events, []);
  const c3 = mockCtx([page([ev("fresh")])]);
  const r3 = await trigger.poll!({ ...input, state: r2.nextState }, c3.ctx);
  assertEquals(r3.events, [ev("fresh")]);
});
