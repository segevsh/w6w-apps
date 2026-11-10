import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => items;
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const item = (id: string) => ({ id, created_at: 1794128400000, updated_at: 1794128400000 });

test("new-or-updated-user: seeds without emitting, emits only the new item, retries idempotently", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-user: sends the list action's request with the newest-first argument", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.clerk.com/v1/users?order_by=-updated_at&limit=100&offset=0",
  );
});

test("new-or-updated-user: an edited record is a new event; an unchanged one is not", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const edited = { ...item("a"), updated_at: 1794132000000 };
  const out = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([edited, item("b")]).ctx,
  );
  assertEquals(out.events.length, 2);
  const again = await trigger.poll!(
    { ...input, state: out.nextState },
    ctx([edited, item("b")]).ctx,
  );
  assertEquals(again.events, []);
});
