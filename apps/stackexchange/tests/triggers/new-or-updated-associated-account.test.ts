import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-associated-account.ts";

const input = { params: { accountIds: "101" }, subscriptionId: "sub-1" };
const account = (id: number, site = "stackoverflow", type = "registered", rep = 1) => ({
  site_url: site,
  user_id: id,
  user_type: type,
  reputation: rep,
});
const ctx = (items: unknown[]) => mockCtx([{ body: { items, has_more: false } }]);

test("new-or-updated-associated-account: seeds without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([account(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-associated-account: emits an added account", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([account(1)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([account(1), account(2)]).ctx,
  );
  assertEquals(next.events, [{
    change: "added",
    key: "stackoverflow:2",
    values: {
      site_url: "stackoverflow",
      site_name: undefined,
      user_id: 2,
      account_id: undefined,
      user_type: "registered",
    },
  }]);
});

test("new-or-updated-associated-account: gives the same result for the same state and response", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([account(1)]).ctx);
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([account(1), account(2)]).ctx,
  );
  const again = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([account(1), account(2)]).ctx,
  );
  assertEquals(again, first);
});

test("new-or-updated-associated-account: requests the bounded first page", async () => {
  const m = ctx([account(1)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.stackexchange.com/2.3/users/101/associated?page=1&pagesize=100",
  );
});

test("new-or-updated-associated-account: a changed account is updated, a reputation change alone is not", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([account(1)]).ctx);
  const rep = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([account(1, "stackoverflow", "registered", 99)]).ctx,
  );
  assertEquals(rep.events, []);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([account(1, "stackoverflow", "moderator")]).ctx,
  );
  assertEquals(next.events.map((e) => [e.change, e.key]), [["updated", "stackoverflow:1"]]);
});

test("new-or-updated-associated-account: more than 500 rows throws", async () => {
  const page = Array.from({ length: 100 }, (_, i) => account(i));
  const m = mockCtx(Array.from({ length: 5 }, () => ({ body: { items: page, has_more: true } })));
  let message = "";
  try {
    await trigger.poll!({ ...input, state: {} }, m.ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(
    message,
    "Associated-account snapshot exceeds 500 rows; narrow the account selection",
  );
  assertEquals(m.calls.length, 5);
});
