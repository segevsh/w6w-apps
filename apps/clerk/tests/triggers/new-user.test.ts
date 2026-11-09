import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => items;
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const item = (id: string) => ({ id, created_at: 1794128400000, updated_at: 1794128400000 });

test("new-user: seeds without emitting, emits only the new item, retries idempotently", async () => {
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

test("new-user: sends the list action's request with the newest-first argument", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.clerk.com/v1/users?order_by=-created_at&limit=100&offset=0",
  );
});
