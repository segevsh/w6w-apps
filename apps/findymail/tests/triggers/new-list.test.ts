import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-list.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number, name = `list ${id}`) => ({ id, name });
const ctx = (lists: unknown[]) => mockCtx([{ body: { lists } }]);

test("new-list: first check seeds and emits nothing", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-list: emits only the new list after seeding", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(1), item(2)]).ctx,
  );
  assertEquals(next.events, [item(2)]);
  const renamed = await trigger.poll!(
    { ...input, state: next.nextState },
    ctx([item(1, "renamed"), item(2)]).ctx,
  );
  assertEquals(renamed.events, []);
});

test("new-list: retrying the same state and page is idempotent", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
  const page = [item(1), item(2), item(3)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(2), item(3)]);
  assertEquals(retry, first);
});

test("new-list: requests the wrapped list-lists endpoint", async () => {
  const seed = ctx([item(1)]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://app.findymail.com/api/lists");
});
