import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-subscriber.ts";

const input = { params: { listId: "l1" }, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => ({ Results: items });
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const item = (
  id: string,
) => ({
  EmailAddress: `${id}@example.com`,
  Name: id,
  Date: "2026-11-09 09:00:00",
  State: "Active",
  CustomFields: [],
});

test("new-subscriber: seeds without emitting, emits only the new item, retries idempotently", async () => {
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

test("new-subscriber: sends the list action's request with the newest-first argument", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.createsend.com/api/v3.3/lists/l1/active.json?pagesize=100&orderfield=date&orderdirection=desc",
  );
});
