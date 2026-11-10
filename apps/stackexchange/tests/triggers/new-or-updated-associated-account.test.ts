import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-associated-account.ts";

const input = { params: { accountIds: "101" }, subscriptionId: "sub-1" };
const account = (id: number, site = "stackoverflow") => ({ site_url: site, user_id: id });
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
  assertEquals(next.events, [{ change: "added", key: "stackoverflow:2", values: account(2) }]);
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
