import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import trigger from "../../triggers/new-invoice.ts";

// Newest-first feed (sort=-id, documented enum id | -id | due_date | -due_date).
const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number) => ({ id, status: "open" });
const ctx = (items: unknown[]) => mockCtx([{ body: pageEnvelope(items) }]);

test("new-invoice: seeds without emitting, then emits exactly the new item (idempotent)", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item(2), item(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});

test("new-invoice: requests the newest first with the wrapped action's endpoint", async () => {
  const m = ctx([item(1)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, "https://goteamup.com/api/v2/invoices?page_size=100&sort=-id");
});
