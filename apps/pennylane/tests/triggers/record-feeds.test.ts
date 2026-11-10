import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newSupplier from "../../triggers/new-supplier.ts";
import newSupplierInvoice from "../../triggers/new-supplier-invoice.ts";
import newProduct from "../../triggers/new-product.ts";
import newTransaction from "../../triggers/new-transaction.ts";

const BASE = "https://app.pennylane.com/api/external/v2";
const cases = [
  { trigger: newCustomer, url: `${BASE}/customers?limit=100&sort=-id` },
  { trigger: newSupplier, url: `${BASE}/suppliers?limit=100&sort=-id` },
  { trigger: newSupplierInvoice, url: `${BASE}/supplier_invoices?limit=100&sort=-id` },
  { trigger: newProduct, url: `${BASE}/products?limit=100&sort=-id` },
  { trigger: newTransaction, url: `${BASE}/transactions?limit=100&sort=-id` },
];

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number) => ({ id });
const ctx = (ids: number[]) =>
  mockCtx([{ body: { items: ids.map(row), has_more: false, next_cursor: null } }]);

for (const c of cases) {
  test(`${c.trigger.key}: seeds, emits only new records, retries idempotently, literal sort=-id request`, async () => {
    const seed = ctx([1]);
    const seeded = await c.trigger.poll!({ ...input, state: {} } as never, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const page = [2, 1];
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState } as never,
      ctx(page).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState } as never,
      ctx(page).ctx,
    );
    assertEquals(first.events, [row(2)]);
    assertEquals(retry, first);
  });
}
