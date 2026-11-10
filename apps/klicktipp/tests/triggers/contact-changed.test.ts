import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/contact-changed.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const T0 = 1_794_225_600; // 2026-11-09T12:00:00Z
const input = { params: {}, subscriptionId: "sub-1" };
const page = (ids: string[], nextCursor: string | null = null) => ({
  body: { subscriberIds: ids, nextCursor },
});

test("contact-changed: seeds the cursor, emits nothing, asks from=now with limit 200", async () => {
  clock.now = () => T0 * 1000;
  const seed = mockCtx([page(["1"])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  const state = seeded.nextState as { seeded?: boolean; cursor?: number };
  assertEquals(state.seeded, true);
  assertEquals(state.cursor, T0);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.klicktipp.com/subscriber/changed?from=1794225600&limit=200",
  );
});

test("contact-changed: emits newly changed ids from the previous cursor, skips the boundary id, is idempotent", async () => {
  clock.now = () => T0 * 1000;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page(["1"])]).ctx);
  clock.now = () => (T0 + 300) * 1000;
  const run = () => {
    const r = mockCtx([page(["1", "2", "3"])]);
    return trigger.poll!({ ...input, state: seeded.nextState }, r.ctx).then((out) => ({ out, r }));
  };
  const first = await run();
  assertEquals(first.out.events, [{ subscriberId: "2" }, { subscriberId: "3" }]);
  assertEquals((first.out.nextState as { cursor?: number }).cursor, T0 + 300);
  assertEquals(
    first.r.calls[0].url,
    "https://api.klicktipp.com/subscriber/changed?from=1794225600&limit=200",
  );
  assertEquals((await run()).out, first.out);
});

test("contact-changed: pages through nextCursor and skips a boundary-second repeat", async () => {
  clock.now = () => T0 * 1000;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page(["1"])]).ctx);
  clock.now = () => (T0 + 300) * 1000;
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(["2"], "c1"), page(["3"])]).ctx,
  );
  assertEquals(second.events, [{ subscriberId: "2" }, { subscriberId: "3" }]);
  clock.now = () => (T0 + 600) * 1000;
  const r = mockCtx([page(["2"])]);
  const third = await trigger.poll!({ ...input, state: second.nextState }, r.ctx);
  assertEquals(r.calls[0].url.includes("from=1794225900"), true);
  assertEquals(third.events, []); // boundary-second duplicate of the previous listing
});

test("contact-changed: a burst above 100 new ids emits 100 and keeps the cursor to work off the rest", async () => {
  clock.now = () => T0 * 1000;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page(["0"])]).ctx);
  clock.now = () => (T0 + 300) * 1000;
  const ids = Array.from({ length: 150 }, (_, i) => String(i + 1));
  const burst = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(ids)]).ctx,
  );
  assertEquals(burst.events.length, 100);
  // The cursor did not advance, so the next check lists the same window again.
  assertEquals((burst.nextState as { cursor?: number }).cursor, T0);
  clock.now = () => (T0 + 600) * 1000;
  const r = mockCtx([page(ids)]);
  const next = await trigger.poll!({ ...input, state: burst.nextState }, r.ctx);
  assertEquals(r.calls[0].url.includes("from=1794225600"), true);
  assertEquals(next.events.length, 50);
  assertEquals((next.nextState as { cursor?: number }).cursor, T0 + 600);
});

test("contact-changed: a window of maxPages+1 full pages resumes from nextCursor, none twice, cursor advances after", async () => {
  clock.now = () => T0 * 1000;
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page(["0"])]).ctx);
  clock.now = () => (T0 + 300) * 1000;
  // 5 pages of 20 ids fill one check's chunk (100 events); page 6 is the (maxPages+1)th.
  const small = (from: number) => Array.from({ length: 20 }, (_, i) => String(from + i));
  const first = mockCtx([
    page(small(1), "c1"),
    page(small(21), "c2"),
    page(small(41), "c3"),
    page(small(61), "c4"),
    page(small(81), "c5"),
  ]);
  const out1 = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  assertEquals(first.calls.length, 5);
  assertEquals(out1.events.length, 100);
  const s1 = out1.nextState as { cursor: number; resume?: { pageCursor: string; end: number } };
  assertEquals(s1.cursor, T0); // window not drained
  assertEquals(s1.resume, { pageCursor: "c5", end: T0 + 300 });
  clock.now = () => (T0 + 600) * 1000;
  const second = mockCtx([page(small(101))]);
  const out2 = await trigger.poll!({ ...input, state: out1.nextState }, second.ctx);
  assertEquals(
    second.calls[0].url,
    "https://api.klicktipp.com/subscriber/changed?from=1794225600&cursor=c5&limit=200",
  );
  assertEquals(out2.events.length, 20);
  const all = [...out1.events, ...out2.events].map((e) =>
    (e as { subscriberId: string }).subscriberId
  );
  assertEquals(new Set(all).size, 120);
  const s2 = out2.nextState as { cursor: number; resume?: unknown };
  assertEquals(s2.cursor, T0 + 300); // the drained window's end
  assertEquals(s2.resume, undefined);
});
