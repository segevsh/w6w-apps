import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const wrap = (items: unknown[]) => ({
  page: 1,
  per_page: 100,
  has_next_page: false,
  count: items.length,
  page_count: 1,
  records: items,
});
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
const item = (id: string) => ({ id: Number(id.charCodeAt(0)), name: id });

test("new-event: seeds without emitting, emits only the new item, retries idempotently", async () => {
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

test("new-event: sends the list action's request with the newest-first argument", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://app.circle.so/api/admin/v2/events?page=1&per_page=100");
});
