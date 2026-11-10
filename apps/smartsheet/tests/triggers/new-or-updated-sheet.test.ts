import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-sheet.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const SINCE_OLD = "2026-11-09T11:00:00.000Z"; // before the window start (T0 - 120 s)
const SINCE_NEW = "2026-11-09T12:03:00.000Z"; // inside the window
const rec = (id: string, created: string, modified: string) => ({
  id,
  createdAt: created,
  modifiedAt: modified,
});
const wrap = (data: unknown[]) => ({ data, pageNumber: 1, totalPages: 1 });
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const cursor = (r: unknown) => (next(r) as { cursor: number }).cursor;
const seed = async () => {
  clock.now = () => T0;
  const c = mockCtx([]);
  const r = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  return { r, calls: c.calls };
};

test("new-or-updated-sheet: first check seeds the cursor without a request or events", async () => {
  const { r, calls } = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
  assertEquals(cursor(r), T0);
  assertEquals(calls.length, 0);
});

test("new-or-updated-sheet: emits the new and the edited record; a retry is identical", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const body = wrap([rec("fresh", SINCE_NEW, SINCE_NEW), rec("old", SINCE_OLD, SINCE_NEW)]);
  const first = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body }]).ctx,
  );
  assertEquals(events(first), [
    rec("old", SINCE_OLD, SINCE_NEW),
    rec("fresh", SINCE_NEW, SINCE_NEW),
  ]);
  assertEquals(retry, first);
  assertEquals(cursor(first), T1);
});

test("new-or-updated-sheet: requests the since window with the vendor's filter", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const c = mockCtx([{ body: wrap([]) }]);
  await trigger.poll!({ ...input, state: next(seeded) } as never, c.ctx);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api.smartsheet.com/2.0/sheets?modifiedSince=2026-11-09T11%3A58%3A00.000Z&page=1&pageSize=100",
  );
});

test("new-or-updated-sheet: an edit (same id, new update stamp) is a new event", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const v1 = rec("rec-1", SINCE_OLD, SINCE_OLD);
  const v2 = rec("rec-1", SINCE_OLD, SINCE_NEW);
  const a = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body: wrap([v1]) }]).ctx,
  );
  assertEquals(events(a), [v1]);
  clock.now = () => T1 + 300_000;
  const b = await trigger.poll!(
    { ...input, state: next(a) } as never,
    mockCtx([{ body: wrap([v2, v1]) }]).ctx,
  );
  assertEquals(events(b), [v2]);
});

test("new-or-updated-sheet: a window longer than maxPages is resumed, every record emitted once, then the cursor advances", async () => {
  const { r: seeded } = await seed();
  const N = 100;
  const pages = [0, 1, 2, 3].map((p) =>
    Array.from({ length: p < 3 ? N : 5 }, (_, i) => rec(`r${p}-${i}`, SINCE_NEW, SINCE_NEW))
  );
  clock.now = () => T1;
  const c1 = mockCtx([
    { body: { data: pages[0], pageNumber: 0 + 1, totalPages: 4 } },
    { body: { data: pages[1], pageNumber: 1 + 1, totalPages: 4 } },
    { body: { data: pages[2], pageNumber: 2 + 1, totalPages: 4 } },
  ]);
  const a = await trigger.poll!({ ...input, state: next(seeded) } as never, c1.ctx);
  assertEquals(events(a).length, 3 * N);
  assertEquals(c1.calls.length, 3);
  assertEquals(cursor(a), T0);
  assertEquals((next(a) as { resume?: unknown }).resume !== undefined, true);
  clock.now = () => T1 + 300_000;
  const c2 = mockCtx([{ body: { data: pages[3], pageNumber: 3 + 1, totalPages: 4 } }]);
  const b = await trigger.poll!({ ...input, state: next(a) } as never, c2.ctx);
  assertEquals(c2.calls.length, 1);
  assertEquals(
    c2.calls[0].url,
    "https://api.smartsheet.com/2.0/sheets?modifiedSince=2026-11-09T11%3A58%3A00.000Z&page=4&pageSize=100",
  );
  assertEquals(events(b).length, 5);
  assertEquals(cursor(b), T1);
  assertEquals((next(b) as { resume?: unknown }).resume, undefined);
  const all = [...events(a), ...events(b)] as { id: string }[];
  assertEquals(new Set(all.map((x) => x.id)).size, 3 * N + 5);
});
