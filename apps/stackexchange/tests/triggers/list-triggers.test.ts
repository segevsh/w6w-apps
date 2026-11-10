import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newComment from "../../triggers/new-comment.ts";
import newQuestion from "../../triggers/new-question.ts";
import newOrUpdatedQuestion from "../../triggers/new-or-updated-question.ts";
import newUser from "../../triggers/new-user.ts";
import newOrUpdatedUser from "../../triggers/new-or-updated-user.ts";

type Poll = NonNullable<typeof newQuestion.poll>;

const input = { params: { site: "stackoverflow" }, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockCtx([{ body: { items, has_more: false } }]);

const cases: Array<{
  key: string;
  trigger: { poll?: Poll };
  item: (id: number, stamp?: number) => Record<string, number>;
  url: string;
  updated?: boolean;
}> = [
  {
    key: "new-question",
    trigger: newQuestion,
    item: (id) => ({ question_id: id, creation_date: 1762646400 + id }),
    url:
      "https://api.stackexchange.com/2.3/questions?site=stackoverflow&page=1&pagesize=100&order=desc&sort=creation",
  },
  {
    key: "new-or-updated-question",
    trigger: newOrUpdatedQuestion,
    item: (id, stamp = 1762646400 + id) => ({ question_id: id, last_activity_date: stamp }),
    url:
      "https://api.stackexchange.com/2.3/questions?site=stackoverflow&page=1&pagesize=100&order=desc&sort=activity",
    updated: true,
  },
  {
    key: "new-comment",
    trigger: newComment,
    item: (id) => ({ comment_id: id, creation_date: 1762646400 + id }),
    url:
      "https://api.stackexchange.com/2.3/comments?site=stackoverflow&page=1&pagesize=100&order=desc&sort=creation",
  },
  {
    key: "new-user",
    trigger: newUser,
    item: (id) => ({ user_id: id, creation_date: 1762646400 + id }),
    url:
      "https://api.stackexchange.com/2.3/users?site=stackoverflow&page=1&pagesize=100&order=desc&sort=creation",
  },
  {
    key: "new-or-updated-user",
    trigger: newOrUpdatedUser,
    item: (id, stamp = 1762646400 + id) => ({ user_id: id, last_modified_date: stamp }),
    url:
      "https://api.stackexchange.com/2.3/users?site=stackoverflow&page=1&pagesize=100&order=desc&sort=modified",
    updated: true,
  },
];

for (const entry of cases) {
  test(`${entry.key}: seeds without emitting`, async () => {
    const seeded = await entry.trigger.poll!(
      { ...input, state: {} },
      ctx([entry.item(2), entry.item(1)]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  });

  test(`${entry.key}: emits only unseen records after the seed`, async () => {
    const first = entry.item(1, 10);
    const seeded = await entry.trigger.poll!(
      { ...input, state: {} },
      ctx([entry.item(2), first]).ctx,
    );
    const next = await entry.trigger.poll!(
      { ...input, state: seeded.nextState },
      ctx([entry.item(3, 40), entry.updated ? entry.item(1, 30) : first, entry.item(2)]).ctx,
    );
    const expected = entry.updated ? [entry.item(1, 30), entry.item(3, 40)] : [entry.item(3, 40)];
    assertEquals(next.events, expected);
  });

  test(`${entry.key}: gives the same result for the same state and response`, async () => {
    const seeded = await entry.trigger.poll!({ ...input, state: {} }, ctx([entry.item(1)]).ctx);
    const page = [entry.item(2), entry.item(1)];
    const first = await entry.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const again = await entry.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(again, first);
  });

  test(`${entry.key}: requests the documented descending sort`, async () => {
    const m = ctx([entry.item(1)]);
    await entry.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, entry.url);
  });
}
