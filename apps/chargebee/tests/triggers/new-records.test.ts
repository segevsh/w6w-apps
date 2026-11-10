import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newOrUpdatedCustomer from "../../triggers/new-or-updated-customer.ts";
import newSubscription from "../../triggers/new-subscription.ts";
import newOrUpdatedSubscription from "../../triggers/new-or-updated-subscription.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newOrUpdatedInvoice from "../../triggers/new-or-updated-invoice.ts";
import newPaymentSource from "../../triggers/new-payment-source.ts";
import newOrUpdatedPaymentSource from "../../triggers/new-or-updated-payment-source.ts";
import newOrUpdatedItem from "../../triggers/new-or-updated-item.ts";
import newOrUpdatedItemPrice from "../../triggers/new-or-updated-item-price.ts";

const BASE = "https://acme.chargebee.com/api/v2/";
const cases = [
  { trigger: newCustomer, path: "customers", wrap: "customer", sort: "created_at", updated: false },
  {
    trigger: newOrUpdatedCustomer,
    path: "customers",
    wrap: "customer",
    sort: "updated_at",
    updated: true,
  },
  {
    trigger: newSubscription,
    path: "subscriptions",
    wrap: "subscription",
    sort: "created_at",
    updated: false,
  },
  {
    trigger: newOrUpdatedSubscription,
    path: "subscriptions",
    wrap: "subscription",
    sort: "updated_at",
    updated: true,
  },
  { trigger: newInvoice, path: "invoices", wrap: "invoice", sort: "date", updated: false },
  {
    trigger: newOrUpdatedInvoice,
    path: "invoices",
    wrap: "invoice",
    sort: "updated_at",
    updated: true,
  },
  {
    trigger: newPaymentSource,
    path: "payment_sources",
    wrap: "payment_source",
    sort: "created_at",
    updated: false,
  },
  {
    trigger: newOrUpdatedPaymentSource,
    path: "payment_sources",
    wrap: "payment_source",
    sort: "updated_at",
    updated: true,
  },
  { trigger: newOrUpdatedItem, path: "items", wrap: "item", sort: "updated_at", updated: true },
  {
    trigger: newOrUpdatedItemPrice,
    path: "item_prices",
    wrap: "item_price",
    sort: "updated_at",
    updated: true,
  },
];
const rows = (wrap: string, items: unknown[]) => ({ list: items.map((i) => ({ [wrap]: i })) });
const rec = (id: string, updated = 1762689600) => ({ id, updated_at: updated });

for (const c of cases) {
  const input = { params: {}, subscriptionId: "s" };
  test(`${c.trigger.key} seeds, emits only the new record, retries identically, sends the literal request`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      connected(mockCtx([{ body: rows(c.wrap, [rec("a")]) }]).ctx),
    );
    assertEquals(seeded.events, []);
    assertEquals(seeded.nextState.seeded, true);
    const body = rows(c.wrap, [rec("b"), rec("a")]);
    const run = mockCtx([{ body }]);
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, connected(run.ctx));
    assertEquals(first.events, [rec("b")]);
    assertEquals(run.calls.map((x) => [x.method, x.url]), [
      ["GET", `${BASE}${c.path}?limit=100&sort_by%5Bdesc%5D=${c.sort}`],
    ]);
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      connected(mockCtx([{ body }]).ctx),
    );
    assertEquals(retry, first);
  });
  if (c.updated) {
    test(`${c.trigger.key} emits an edited old record again`, async () => {
      const seeded = await c.trigger.poll!(
        { ...input, state: {} },
        connected(mockCtx([{ body: rows(c.wrap, [rec("a", 1)]) }]).ctx),
      );
      const out = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        connected(mockCtx([{ body: rows(c.wrap, [rec("a", 2)]) }]).ctx),
      );
      assertEquals(out.events, [rec("a", 2)]);
    });
  }
}

test("gateway tokens (reference_id) never reach the run event", async () => {
  const withToken = {
    id: "a",
    payment_method: { type: "card", reference_id: "gw-token-1", status: "valid" },
    reference_id: "gw-token-2",
  };
  const seeded = await newCustomer.poll!(
    { params: {}, state: {} },
    connected(mockCtx([{ body: rows("customer", [{ id: "z" }]) }]).ctx),
  );
  const out = await newCustomer.poll!(
    { params: {}, state: seeded.nextState },
    connected(mockCtx([{ body: rows("customer", [withToken, { id: "z" }]) }]).ctx),
  );
  assertEquals(out.events, [{ id: "a", payment_method: { type: "card", status: "valid" } }]);
  assertEquals(JSON.stringify(out.events).includes("gw-token"), false);
});
