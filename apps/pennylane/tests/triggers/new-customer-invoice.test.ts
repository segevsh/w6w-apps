import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number) => ({ id, invoice_number: `F-${id}` });
const ctx = (ids: number[]) =>
  mockCtx([{ body: { items: ids.map(row), has_more: false, next_cursor: null } }]);

test("new-customer-invoice: seeds, emits only new invoices, retries idempotently, sorts by -id", async () => {
  const seed = ctx([1]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://app.pennylane.com/api/external/v2/customer_invoices?limit=100&sort=-id",
  );

  const page = [2, 1];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(2)]);
  assertEquals(retry, first);
});
