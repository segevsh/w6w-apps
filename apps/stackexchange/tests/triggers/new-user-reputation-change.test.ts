import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-user-reputation-change.ts";

const NOW = 1_794_700_000_000; // ms
const NOW_S = NOW / 1000;
clock.now = () => NOW;

const input = { params: { userIds: "101", site: "stackoverflow" }, subscriptionId: "sub-1" };
const row = (post: number, onDate: number) => ({
  user_id: 101,
  post_id: post,
  vote_type: "up_votes",
  reputation_change: 10,
  on_date: onDate,
});
const page = (rows: unknown[], hasMore = false) => ({ body: { items: rows, has_more: hasMore } });
const full = (from: number, onDate: number) =>
  Array.from({ length: 100 }, (_, i) => row(from + i, onDate));

test("new-user-reputation-change: seed emits nothing, reads nothing, stores the floor", async () => {
  const m = mockCtx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(m.calls.length, 0);
  assertEquals((seeded.nextState as { floor?: number }).floor, NOW);
});

test("new-user-reputation-change: requests fromdate = cursor - overlap, newest first", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const m = mockCtx([page([])]);
  await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    `https://api.stackexchange.com/2.3/users/101/reputation?site=stackoverflow&page=1&pagesize=100&fromdate=${
      NOW_S - 120
    }`,
  );
});

test("new-user-reputation-change: pre-seed records never fire, then exactly the new one", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  // 5 full pages (= maxPages) of records created before the seed, a sixth page left over.
  const old = mockCtx(
    [0, 1, 2, 3, 4].map((n) => page(full(n * 100, NOW_S - 60), true)),
  );
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, old.ctx);
  assertEquals(first.events, []);
  assertEquals(old.calls.length, 5);
  const fresh = mockCtx([page([row(9001, NOW_S + 30), ...full(0, NOW_S - 60).slice(0, 2)])]);
  const second = await trigger.poll!({ ...input, state: first.nextState }, fresh.ctx);
  assertEquals(second.events, [row(9001, NOW_S + 30)]);
});

test("new-user-reputation-change: a window of maxPages + 1 pages drains across checks, none twice", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const at = NOW_S + 10;
  const first = mockCtx(
    [0, 1, 2, 3, 4].map((n) => page(full(n * 100, at), true)),
  );
  const a = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  assertEquals(a.events.length, 500);
  const resume = (a.nextState as { resume?: { page: number; since: number } }).resume;
  assertEquals(resume, { page: 6, since: NOW_S - 120 });
  assertEquals((a.nextState as { cursor: number }).cursor, NOW);

  clock.now = () => NOW + 300_000;
  try {
    const second = mockCtx([page(full(500, at).slice(0, 7))]);
    const b = await trigger.poll!({ ...input, state: a.nextState }, second.ctx);
    assertEquals(b.events.length, 7);
    assertEquals(
      second.calls[0].url,
      `https://api.stackexchange.com/2.3/users/101/reputation?site=stackoverflow&page=6&pagesize=100&fromdate=${
        NOW_S - 120
      }`,
    );
    const ids = new Set([...a.events, ...b.events].map((r) => (r as { post_id: number }).post_id));
    assertEquals(ids.size, 507);
    assertEquals((b.nextState as { resume?: unknown }).resume, undefined);
    assertEquals((b.nextState as { cursor: number }).cursor, NOW + 300_000);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-user-reputation-change: gives the same result for the same state and response", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page([row(2, NOW_S + 20), row(1, NOW_S + 10)])]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [row(1, NOW_S + 10), row(2, NOW_S + 20)]);
  assertEquals(await run(), first);
});
