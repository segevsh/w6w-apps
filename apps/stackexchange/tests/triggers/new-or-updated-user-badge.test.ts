import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-user-badge.ts";

const input = { params: { userIds: "101", site: "stackoverflow" }, subscriptionId: "sub-1" };
const badge = (id: number, count = 1, rep = 5) => ({
  badge_id: id,
  name: `b${id}`,
  rank: "bronze",
  badge_type: "named",
  award_count: count,
  user: { user_id: 101, reputation: rep },
});
const values = (id: number, count = 1) => ({
  user_id: 101,
  badge_id: id,
  name: `b${id}`,
  rank: "bronze",
  badge_type: "named",
  award_count: count,
});
const ctx = (items: unknown[]) => mockCtx([{ body: { items, has_more: false } }]);

test("new-or-updated-user-badge: seeds without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([badge(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-user-badge: emits a new badge and a repeat award, not a reputation change", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([badge(1), badge(2)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([badge(1, 1, 999), badge(2, 2), badge(3)]).ctx,
  );
  assertEquals(next.events, [
    { change: "updated", key: "101:2", values: values(2, 2) },
    { change: "added", key: "101:3", values: values(3) },
  ]);
});

test("new-or-updated-user-badge: gives the same result for the same state and response", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([badge(1)]).ctx);
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([badge(1), badge(2)]).ctx,
  );
  const again = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([badge(1), badge(2)]).ctx,
  );
  assertEquals(again, first);
});

test("new-or-updated-user-badge: requests the user's badges page by page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => badge(i));
  const m = mockCtx([{ body: { items: full, has_more: true } }, {
    body: { items: [badge(500)], has_more: false },
  }]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    [
      "GET",
      "https://api.stackexchange.com/2.3/users/101/badges?site=stackoverflow&page=1&pagesize=100",
    ],
    [
      "GET",
      "https://api.stackexchange.com/2.3/users/101/badges?site=stackoverflow&page=2&pagesize=100",
    ],
  ]);
});

test("new-or-updated-user-badge: more than 1000 badges throws", async () => {
  const page = Array.from({ length: 100 }, (_, i) => badge(i));
  const m = mockCtx(Array.from({ length: 10 }, () => ({ body: { items: page, has_more: true } })));
  let message = "";
  try {
    await trigger.poll!({ ...input, state: {} }, m.ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "User badge snapshot exceeds 1000 rows; narrow the user selection");
});
