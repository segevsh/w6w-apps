import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newBill from "../../triggers/new-bill.ts";
import newEstimate from "../../triggers/new-estimate.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newItem from "../../triggers/new-item.ts";
import newPayment from "../../triggers/new-payment.ts";

const page = (data: unknown[]) => ({ metadata: { total: data.length }, data });
const input = { params: {}, subscriptionId: "s" };

const cases = [
  {
    key: "new-bill",
    trigger: newBill,
    url:
      "https://api.alegra.com/api/v1/bills?start=0&order_direction=DESC&order_field=date&limit=30&metadata=true",
  },
  {
    key: "new-estimate",
    trigger: newEstimate,
    url:
      "https://api.alegra.com/api/v1/estimates?start=0&order_direction=DESC&order_field=id&limit=30&metadata=true",
  },
  {
    key: "new-invoice",
    trigger: newInvoice,
    url:
      "https://api.alegra.com/api/v1/invoices?start=0&order_direction=DESC&order_field=id&limit=30&metadata=true",
  },
  {
    key: "new-item",
    trigger: newItem,
    url:
      "https://api.alegra.com/api/v1/items?start=0&order_direction=DESC&order_field=id&limit=30&metadata=true",
  },
  {
    key: "new-payment",
    trigger: newPayment,
    url:
      "https://api.alegra.com/api/v1/payments?start=0&order_direction=DESC&order_field=id&limit=30&metadata=true",
  },
];

for (const c of cases) {
  test(`${c.key} seeds, emits only new ids, retries identically, and requests descending ids`, async () => {
    const seed = mockCtx([{ body: page([{ id: "a" }]) }]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const body = [{ id: "b" }, { id: "a" }];
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page(body) }]).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page(body) }]).ctx,
    );
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(retry, first);
  });
}
