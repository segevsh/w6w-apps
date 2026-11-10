import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newCheckout from "../../triggers/new-checkout.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newDiscount from "../../triggers/new-discount.ts";
import newLicenseKey from "../../triggers/new-license-key.ts";
import newPrice from "../../triggers/new-price.ts";
import newSubscription from "../../triggers/new-subscription.ts";
import newProduct from "../../triggers/new-product.ts";
import newVariant from "../../triggers/new-variant.ts";
import newStore from "../../triggers/new-store.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (type: string, id: string) => ({ id, type, attributes: { name: `n${id}` } });
const page = (items: unknown[], lastPage = 1) => ({
  body: { data: items, meta: { page: { currentPage: 1, lastPage } } },
});

interface Case {
  key: string;
  trigger: TriggerDefinition;
  url: string;
  type: string;
}

const cases: Case[] = [
  {
    key: "new-checkout",
    trigger: newCheckout,
    url: "https://api.lemonsqueezy.com/v1/checkouts?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "checkouts",
  },
  {
    key: "new-customer",
    trigger: newCustomer,
    url: "https://api.lemonsqueezy.com/v1/customers?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "customers",
  },
  {
    key: "new-discount",
    trigger: newDiscount,
    url: "https://api.lemonsqueezy.com/v1/discounts?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "discounts",
  },
  {
    key: "new-license-key",
    trigger: newLicenseKey,
    url: "https://api.lemonsqueezy.com/v1/license-keys?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "license-keys",
  },
  {
    key: "new-price",
    trigger: newPrice,
    url: "https://api.lemonsqueezy.com/v1/prices?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "prices",
  },
  {
    key: "new-subscription",
    trigger: newSubscription,
    url: "https://api.lemonsqueezy.com/v1/subscriptions?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "subscriptions",
  },
  {
    key: "new-product",
    trigger: newProduct,
    url: "https://api.lemonsqueezy.com/v1/products?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "products",
  },
  {
    key: "new-variant",
    trigger: newVariant,
    url: "https://api.lemonsqueezy.com/v1/variants?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "variants",
  },
  {
    key: "new-store",
    trigger: newStore,
    url: "https://api.lemonsqueezy.com/v1/stores?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    type: "stores",
  },
];

for (const c of cases) {
  test(`${c.key}: the first check seeds without emitting`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([page([item(c.type, "1")])]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  });

  test(`${c.key}: a new record is emitted once and a retry repeats it identically`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([page([item(c.type, "1")])]).ctx,
    );
    const items = [item(c.type, "2"), item(c.type, "1")];
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page(items)]).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page(items)]).ctx,
    );
    assertEquals(first.events, [item(c.type, "2")]);
    assertEquals(retry, first);
  });

  test(`${c.key}: requests the literal list endpoint`, async () => {
    const m = mockCtx([page([item(c.type, "1")])]);
    await c.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals({ method: m.calls[0].method, url: m.calls[0].url }, {
      method: "GET",
      url: c.url,
    });
  });
}

const product = cases.find((c) => c.key === "new-product")!;

test("new-product: follows meta.page.lastPage and emits a record found on page 2", async () => {
  const seedCtx = mockCtx([page([item("products", "1")], 2), page([item("products", "2")], 2)]);
  const seeded = await product.trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seedCtx.calls.map((c) => c.url), [
    "https://api.lemonsqueezy.com/v1/products?page%5Bnumber%5D=1&page%5Bsize%5D=100",
    "https://api.lemonsqueezy.com/v1/products?page%5Bnumber%5D=2&page%5Bsize%5D=100",
  ]);
  const next = await product.trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([
      page([item("products", "1")], 2),
      page([item("products", "2"), item("products", "3")], 2),
    ]).ctx,
  );
  assertEquals(next.events, [item("products", "3")]);
});

test("new-product: a collection wider than 10 pages fails loudly instead of being half-read", async () => {
  const responses = Array.from({ length: 10 }, () => page([item("products", "1")], 11));
  await assertRejects(
    () => product.trigger.poll!({ ...input, state: {} }, mockCtx(responses).ctx),
    Error,
    "1000-record cap",
  );
});
