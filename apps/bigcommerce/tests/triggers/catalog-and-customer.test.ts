import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, v3Page } from "../_helpers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newOrUpdatedCustomer from "../../triggers/new-or-updated-customer.ts";
import newOrUpdatedProduct from "../../triggers/new-or-updated-product.ts";
import newProduct from "../../triggers/new-product.ts";

const input = { params: {}, subscriptionId: "sub-1" };

const cases = [
  {
    name: "new-product",
    trigger: newProduct,
    item: { id: 101, name: "Canvas Tote", date_modified: "2026-11-10T10:00:00+00:00" },
    request:
      "https://api.bigcommerce.com/stores/abc123/v3/catalog/products?sort=id&direction=desc&limit=100&page=1",
  },
  {
    name: "new-or-updated-product",
    trigger: newOrUpdatedProduct,
    item: { id: 101, name: "Canvas Tote", date_modified: "2026-11-10T10:00:00+00:00" },
    request:
      "https://api.bigcommerce.com/stores/abc123/v3/catalog/products?sort=date_modified&direction=desc&limit=100&page=1",
  },
  {
    name: "new-customer",
    trigger: newCustomer,
    item: { id: 42, email: "customer@example.com", date_created: "2026-11-10T10:00:00+00:00" },
    request:
      "https://api.bigcommerce.com/stores/abc123/v3/customers?sort=date_created%3Adesc&limit=100&page=1",
  },
  {
    name: "new-or-updated-customer",
    trigger: newOrUpdatedCustomer,
    item: { id: 42, email: "customer@example.com", date_modified: "2026-11-10T10:00:00+00:00" },
    request:
      "https://api.bigcommerce.com/stores/abc123/v3/customers?sort=date_modified%3Adesc&limit=100&page=1",
  },
];

for (const { item, name, request, trigger } of cases) {
  test(`${name}: seeds, emits, retries idempotently, and requests newest first`, async () => {
    const seed = mockCtx([{ body: v3Page([item]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0], { ...seed.calls[0], method: "GET", url: request });

    const fresh = { ...item, id: Number(item.id) + 1 };
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: v3Page([fresh, item]) }]).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: v3Page([fresh, item]) }]).ctx,
    );
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
  });
}

test("new-or-updated-product emits an edited record", async () => {
  const oldProduct = { id: 101, name: "Canvas Tote", date_modified: "2026-11-10T10:00:00+00:00" };
  const seeded = await newOrUpdatedProduct.poll!(
    { ...input, state: {} },
    mockCtx([{ body: v3Page([oldProduct]) }]).ctx,
  );
  const edited = { ...oldProduct, date_modified: "2026-11-10T11:00:00+00:00" };
  const result = await newOrUpdatedProduct.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: v3Page([edited, oldProduct]) }]).ctx,
  );
  assertEquals(result.events, [edited]);
});

test("new-or-updated-customer emits an edited record", async () => {
  const oldCustomer = {
    id: 42,
    email: "customer@example.com",
    date_modified: "2026-11-10T10:00:00+00:00",
  };
  const seeded = await newOrUpdatedCustomer.poll!(
    { ...input, state: {} },
    mockCtx([{ body: v3Page([oldCustomer]) }]).ctx,
  );
  const edited = { ...oldCustomer, date_modified: "2026-11-10T11:00:00+00:00" };
  const result = await newOrUpdatedCustomer.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: v3Page([edited, oldCustomer]) }]).ctx,
  );
  assertEquals(result.events, [edited]);
});
