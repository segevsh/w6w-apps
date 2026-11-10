import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-answer.ts";

const params = { site: "stackoverflow", userIds: "22656;7" };
const input = { params, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockCtx([{ body: { items, has_more: false } }]);
const item = (id: number, activity: number) => ({
  answer_id: id,
  creation_date: 1762646400,
  last_activity_date: activity,
});

test("new-or-updated-answer: seeds without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2, 20), item(1, 10)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-answer: emits a new answer and an edited one, not an unchanged one", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2, 20), item(1, 10)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(3, 40), item(1, 30), item(2, 20)]).ctx,
  );
  assertEquals(next.events, [item(1, 30), item(3, 40)]);
});

test("new-or-updated-answer: the same state and response give an identical result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1, 10)]).ctx);
  const page = [item(1, 30), item(1, 10)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const again = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(1, 30)]);
  assertEquals(again, first);
});

test("new-or-updated-answer: requests most recent activity first (sort=activity, order=desc)", async () => {
  const m = ctx([item(1, 10)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.stackexchange.com/2.3/users/22656;7/answers?site=stackoverflow&page=1&pagesize=100&order=desc&sort=activity",
  );
});
