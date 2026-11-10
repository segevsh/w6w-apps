import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listBody, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const SINCE_OLD = "2026-11-09T11:00:00.000Z"; // before the window start (T0 - 120 s)
const SINCE_NEW = "2026-11-09T12:03:00.000Z"; // inside the window
const rec = (id: number, created: string, updated: string) => ({
  id,
  email: `c${id}@example.com`,
  created_at: created,
  updated_at: updated,
});
/** A cursor-paged Simplero page; `more` is whether the vendor says another page follows. */
const wrap = (data: { id: number }[], more = false) =>
  listBody(data, {
    page: null,
    total: null,
    total_pages: null,
    per_page: 100,
    next_after: more ? data[data.length - 1].id : null,
  });
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const cursor = (r: unknown) => (next(r) as { cursor: number }).cursor;
const seed = async () => {
  clock.now = () => T0;
  const c = mockCtx([]);
  const r = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  return { r, calls: c.calls };
};
const URL0 =
  "https://simplero.com/api/v2/customers?per_page=100&after=0&updated_at%5Bpreset%5D=custom&updated_at%5Bfrom%5D=2026-11-08&updated_at%5Bto%5D=2026-11-10";

test("new-or-updated-contact: first check seeds the cursor and floor without a request or events", async () => {
  const { r, calls } = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
  assertEquals(cursor(r), T0);
  assertEquals((next(r) as { floor?: number }).floor, T0);
  assertEquals(calls.length, 0);
});

test("new-or-updated-contact: emits the new or edited record and skips an old one; a retry is identical", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const body = wrap([rec(1, SINCE_NEW, SINCE_NEW), rec(2, SINCE_OLD, SINCE_NEW)]);
  const first = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([{ body }]).ctx,
  );
  assertEquals(events(first), [rec(2, SINCE_OLD, SINCE_NEW), rec(1, SINCE_NEW, SINCE_NEW)]);
  assertEquals(retry, first);
  assertEquals(cursor(first), T1);
});

test("new-or-updated-contact: requests the date-window filter from the cursor, paging by id", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const c = mockCtx([{ body: wrap([]) }]);
  await trigger.poll!({ ...input, state: next(seeded) } as never, c.ctx);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, URL0);
});

test("new-or-updated-contact: an edit (same id, new update stamp) is a new event", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const v1 = rec(1, SINCE_OLD, "2026-11-09T12:01:00.000Z");
  const v2 = rec(1, SINCE_OLD, SINCE_NEW);
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

test("new-or-updated-contact: a window longer than maxPages is resumed from the last id, every record emitted once, then the cursor advances", async () => {
  const { r: seeded } = await seed();
  const N = 100;
  const pages = [0, 1, 2, 3].map((p) =>
    Array.from({ length: p < 3 ? N : 5 }, (_, i) => rec(p * N + i + 1, SINCE_NEW, SINCE_NEW))
  );
  clock.now = () => T1;
  const c1 = mockCtx([
    { body: wrap(pages[0], true) },
    { body: wrap(pages[1], true) },
    { body: wrap(pages[2], true) },
  ]);
  const a = await trigger.poll!({ ...input, state: next(seeded) } as never, c1.ctx);
  assertEquals(events(a).length, 3 * N);
  assertEquals(c1.calls.length, 3);
  assertEquals(cursor(a), T0);
  assertEquals((next(a) as { resume?: unknown }).resume !== undefined, true);
  clock.now = () => T1 + 300_000;
  const c2 = mockCtx([{ body: wrap(pages[3]) }]);
  const b = await trigger.poll!({ ...input, state: next(a) } as never, c2.ctx);
  assertEquals(c2.calls.length, 1);
  assertEquals(
    c2.calls[0].url,
    "https://simplero.com/api/v2/customers?per_page=100&after=300&updated_at%5Bpreset%5D=custom&updated_at%5Bfrom%5D=2026-11-08&updated_at%5Bto%5D=2026-11-10"
      .replace("2026-11-10", "2026-11-10"),
  );
  assertEquals(events(b).length, 5);
  assertEquals(cursor(b), T1);
  assertEquals((next(b) as { resume?: unknown }).resume, undefined);
  const all = [...events(a), ...events(b)] as { id: number }[];
  assertEquals(new Set(all.map((x) => x.id)).size, 3 * N + 5);
});

test("new-or-updated-contact: records from before the seed are never emitted; one after it is (seed floor)", async () => {
  const { r: seeded } = await seed();
  const PRE = "2026-11-09T11:59:30.000Z"; // 30 s before the seed, inside the overlap window
  const POST = "2026-11-09T12:06:00.000Z"; // after the seed, inside the next window
  // more than maxPages (3) full pages of records that all existed before the seed
  const pre = [0, 1, 2, 3].map((p) =>
    Array.from({ length: 100 }, (_, i) => rec(p * 100 + i + 1, PRE, PRE))
  );
  let state = next(seeded);
  let emitted = 0;
  let now = T1;
  for (
    const responses of [
      [wrap(pre[0], true), wrap(pre[1], true), wrap(pre[2], true)],
      [wrap(pre[3])],
    ]
  ) {
    clock.now = () => now;
    const r = await trigger.poll!(
      { ...input, state } as never,
      mockCtx(responses.map((body) => ({ body }))).ctx,
    );
    emitted += events(r).length;
    state = next(r);
    now += 300_000;
  }
  assertEquals(emitted, 0);
  assertEquals((state as { resume?: unknown }).resume, undefined);
  clock.now = () => now;
  const post = rec(9001, POST, POST);
  const r = await trigger.poll!(
    { ...input, state } as never,
    mockCtx([{ body: wrap([post]) }]).ctx,
  );
  assertEquals(events(r), [post]);
});
