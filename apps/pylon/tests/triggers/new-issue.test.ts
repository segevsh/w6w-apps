import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-issue.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = Date.parse("2026-11-10T10:00:00Z");
const input = (state: unknown) => ({ params: {}, subscriptionId: "sub-1", state });
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return {
    method: c.method,
    url: u.origin + u.pathname,
    query: Object.fromEntries(u.searchParams),
  };
};
const issue = (id: string, title = "t") => ({
  id,
  title,
  state: "new",
  created_at: "2026-11-10T10:03:00Z",
});
const reply = (items: unknown[]) => ({
  body: { data: items, pagination: { cursor: null, has_next_page: false } },
});

test("new-issue seeds, emits, retries, and sends the literal since-filtered request", async () => {
  clock.now = () => T0;
  const seed = mockCtx([reply([issue("i1")])]);
  const seeded = await trigger.poll!(input({}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(req(seed.calls[0]), {
    method: "GET",
    url: "https://api.usepylon.com/issues",
    query: { start_time: "2026-11-10T09:58:00Z", end_time: "2026-11-10T10:00:00Z", limit: "200" },
  });

  clock.now = () => T0 + 300_000;
  const page = [issue("i2"), issue("i1")];
  const run = () => mockCtx([reply(page)]);
  const first = run();
  const out = await trigger.poll!(input(seeded.nextState), first.ctx);
  const retry = await trigger.poll!(input(seeded.nextState), run().ctx);
  assertEquals(out.events, [issue("i2")]);
  assertEquals(retry, out);
  assertEquals(req(first.calls[0]), {
    method: "GET",
    url: "https://api.usepylon.com/issues",
    query: { start_time: "2026-11-10T09:58:00Z", end_time: "2026-11-10T10:05:00Z", limit: "200" },
  });
});

test("new-issue skips an already seen record", async () => {
  clock.now = () => T0;
  const seeded = await trigger.poll!(input({}), mockCtx([reply([issue("i1")])]).ctx);
  clock.now = () => T0 + 300_000;
  const out = await trigger.poll!(input(seeded.nextState), mockCtx([reply([issue("i1")])]).ctx);
  assertEquals(out.events, []);
});

// Brief 9.8: a window holding maxPages + 1 full pages is drained over successive checks.
test("new-issue drains a window of maxPages + 1 full pages: every item once, cursor moves after the drain", async () => {
  const SIZE = 200;
  const item = (n: number, i: number) => ({
    id: `i${n}-${i}`,
    title: "t",
    state: "new",
    created_at: "2026-11-10T10:03:00Z",
  });
  const pageReply = (n: number) => {
    const items = Array.from({ length: SIZE }, (_, i) => item(n, i));
    const more = n < 3;
    return {
      body: { data: items, pagination: { cursor: more ? `c${n + 1}` : null, has_next_page: more } },
    };
  };
  clock.now = () => T0;
  const seeded = await trigger.poll!(
    input({}),
    mockCtx([{ body: { data: [], pagination: { cursor: null, has_next_page: false } } }]).ctx,
  );

  clock.now = () => T0 + 300_000;
  const first = mockCtx([pageReply(0), pageReply(1), pageReply(2)]);
  const one = await trigger.poll!(input(seeded.nextState), first.ctx);
  const s1 = one.nextState as { cursor: number; resume?: unknown };
  assertEquals(first.calls.length, 3);
  assertEquals(one.events.length, SIZE * 3);
  assertEquals(s1.cursor, T0);
  assertEquals(s1.resume !== undefined, true);

  clock.now = () => T0 + 600_000;
  const second = mockCtx([pageReply(3)]);
  const two = await trigger.poll!(input(one.nextState), second.ctx);
  const s2 = two.nextState as { cursor: number; resume?: unknown };
  assertEquals(second.calls.length, 1);
  assertEquals(req(second.calls[0]), {
    method: "GET",
    url: "https://api.usepylon.com/issues",
    query: {
      start_time: "2026-11-10T09:58:00Z",
      end_time: "2026-11-10T10:05:00Z",
      limit: "200",
      cursor: "c3",
    },
  });
  assertEquals(two.events.length, SIZE);
  assertEquals(s2.cursor, T0 + 300_000);
  assertEquals(s2.resume, undefined);

  const all = [...one.events, ...two.events].map((e) => JSON.stringify(e));
  assertEquals(new Set(all).size, SIZE * 4);
  assertEquals(all.length, SIZE * 4);
});

// Brief 9.9: the seed stores a floor; records created before it are never emitted, however many
// pages the window holds; a record created after it is.
test("new-issue never emits a pre-seed record (floor), then emits the one created after the seed", async () => {
  const SIZE = 200;
  const OLD = "2026-11-10T09:00:00Z";
  const NEW = "2026-11-10T10:03:00Z";
  const mk = (tag: string, stamp: string) => ({
    id: tag,
    title: "t",
    state: "new",
    created_at: stamp,
  });
  const pageReply = (n: number, items: unknown[], more: boolean) => ({
    body: { data: items, pagination: { cursor: more ? `c${n + 1}` : null, has_next_page: more } },
  });
  const oldPage = (n: number) =>
    pageReply(n, Array.from({ length: SIZE }, (_, i) => mk(`p${n}-${i}`, OLD)), n < 3);
  clock.now = () => T0;
  const seeded = await trigger.poll!(
    input({}),
    mockCtx([{ body: { data: [], pagination: { cursor: null, has_next_page: false } } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { floor?: number }).floor, T0);

  clock.now = () => T0 + 300_000;
  const one = await trigger.poll!(
    input(seeded.nextState),
    mockCtx([oldPage(0), oldPage(1), oldPage(2)]).ctx,
  );
  assertEquals(one.events, []);
  assertEquals((one.nextState as { resume?: unknown }).resume !== undefined, true);

  clock.now = () => T0 + 600_000;
  const two = await trigger.poll!(input(one.nextState), mockCtx([oldPage(3)]).ctx);
  assertEquals(two.events, []);
  assertEquals((two.nextState as { resume?: unknown }).resume, undefined);

  clock.now = () => T0 + 900_000;
  const fresh = mk("fresh", NEW);
  const three = await trigger.poll!(
    input(two.nextState),
    mockCtx([pageReply(0, [fresh], false)]).ctx,
  );
  assertEquals(three.events, [fresh]);
});
