import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const SINCE_OLD = "2026-11-09T11:00:00.000Z"; // before the window start (T0 - 120 s)
const SINCE_NEW = "2026-11-09T12:03:00.000Z"; // inside the window
const rec = (id: string, created: string, updated: string) => ({ contactId: id, created, updated });
const wrap = (content: unknown[]) => ({ content, totalPages: 1, totalElements: content.length });
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const cursor = (r: unknown) => (next(r) as { cursor: number }).cursor;
const seed = async () => {
  clock.now = () => T0;
  const c = mockCtx([]);
  const r = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  return { r, calls: c.calls };
};

test("new-contact: first check seeds the cursor without a request or events", async () => {
  const { r, calls } = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
  assertEquals(cursor(r), T0);
  assertEquals(calls.length, 0);
});

test("new-contact: emits the new record and skips an old one; a retry is identical", async () => {
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
  assertEquals(events(first), [rec("fresh", SINCE_NEW, SINCE_NEW)]);
  assertEquals(retry, first);
  assertEquals(cursor(first), T1);
});

test("new-contact: requests the since window with the vendor's filter", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const c = mockCtx([{ body: wrap([]) }]);
  await trigger.poll!({ ...input, state: next(seeded) } as never, c.ctx);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api-app2.simpletexting.com/v2/api/contacts?page=0&size=100&since=2026-11-09T11%3A58%3A00.000Z&direction=desc",
  );
});

test("new-contact: an old record edited inside the window is not new", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const edited = rec("old", SINCE_OLD, SINCE_NEW);
  const r = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body: wrap([edited]) }]).ctx,
  );
  assertEquals(events(r), []);
});

test("new-contact: a window longer than maxPages is resumed, every record emitted once, then the cursor advances", async () => {
  const { r: seeded } = await seed();
  const N = 100;
  const pages = [0, 1, 2, 3].map((p) =>
    Array.from({ length: p < 3 ? N : 5 }, (_, i) => rec(`r${p}-${i}`, SINCE_NEW, SINCE_NEW))
  );
  clock.now = () => T1;
  const c1 = mockCtx([
    { body: { content: pages[0], totalPages: 4, totalElements: 305 } },
    { body: { content: pages[1], totalPages: 4, totalElements: 305 } },
    { body: { content: pages[2], totalPages: 4, totalElements: 305 } },
  ]);
  const a = await trigger.poll!({ ...input, state: next(seeded) } as never, c1.ctx);
  assertEquals(events(a).length, 3 * N);
  assertEquals(c1.calls.length, 3);
  assertEquals(cursor(a), T0);
  assertEquals((next(a) as { resume?: unknown }).resume !== undefined, true);
  clock.now = () => T1 + 300_000;
  const c2 = mockCtx([{ body: { content: pages[3], totalPages: 4, totalElements: 305 } }]);
  const b = await trigger.poll!({ ...input, state: next(a) } as never, c2.ctx);
  assertEquals(c2.calls.length, 1);
  assertEquals(
    c2.calls[0].url,
    "https://api-app2.simpletexting.com/v2/api/contacts?page=3&size=100&since=2026-11-09T11%3A58%3A00.000Z&direction=desc",
  );
  assertEquals(events(b).length, 5);
  assertEquals(cursor(b), T1);
  assertEquals((next(b) as { resume?: unknown }).resume, undefined);
  const all = [...events(a), ...events(b)] as { contactId: string }[];
  assertEquals(new Set(all.map((x) => x.contactId)).size, 3 * N + 5);
});

test("new-contact: records from before the seed are never emitted; one after it is (seed floor)", async () => {
  const { r: seeded } = await seed();
  const PRE = "2026-11-09T11:59:30.000Z"; // 30 s before the seed, inside the overlap window
  const POST = "2026-11-09T12:06:00.000Z"; // after the seed, inside the next window
  // more than maxPages (3) full pages of records that all existed before the seed
  const pre = [0, 1, 2, 3].map((p) =>
    Array.from({ length: 100 }, (_, i) => rec(`pre${p}-${i}`, PRE, PRE))
  );
  let state = next(seeded);
  let emitted = 0;
  let now = T1;
  for (
    const responses of [pre.slice(0, 3).map((c) => ({ body: { content: c, totalPages: 4 } })), [{
      body: { content: pre[3], totalPages: 4 },
    }]]
  ) {
    clock.now = () => now;
    const r = await trigger.poll!({ ...input, state } as never, mockCtx(responses).ctx);
    emitted += events(r).length;
    state = next(r);
    now += 300_000;
  }
  assertEquals(emitted, 0);
  assertEquals((state as { resume?: unknown }).resume, undefined);
  clock.now = () => now;
  const post = rec("post-1", POST, POST);
  const r = await trigger.poll!(
    { ...input, state } as never,
    mockCtx([{ body: wrap([post]) }]).ctx,
  );
  assertEquals(events(r), [post]);
});
