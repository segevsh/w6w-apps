import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshBooksCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-or-updated-invoice.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const invoice = (id: number, updated = "2026-11-09 09:00:00") => ({
  id,
  invoice_number: `000${id}`,
  updated,
});
const page = (...invoices: unknown[]) => ({ body: { response: { result: { invoices } } } });

test("new-or-updated-invoice: seeds, emits new and edited invoices, retries idempotently", async () => {
  const originalNow = clock.now;
  clock.now = () => Date.parse("2026-11-09T10:00:00Z");
  try {
    const seededCtx = mockFreshBooksCtx([page(invoice(1))]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seededCtx.calls[0].method, "GET");
    assertEquals(
      seededCtx.calls[0].url,
      "https://api.freshbooks.com/accounting/account/acc1/invoices/invoices?page=1&per_page=100&search%5Bupdated_min%5D=2026-11-08",
    );
    const items = [invoice(2), invoice(1, "2026-11-09 09:30:00"), invoice(1)];
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockFreshBooksCtx([page(...items)]).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockFreshBooksCtx([page(...items)]).ctx,
    );
    assertEquals(first.events, [invoice(1, "2026-11-09 09:30:00"), invoice(2)]);
    assertEquals(retry, first);
  } finally {
    clock.now = originalNow;
  }
});
