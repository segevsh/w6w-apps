import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooqableCtx } from "../_helpers.ts";
import newOrder from "../../triggers/new-order.ts";
import updatedOrder from "../../triggers/new-or-updated-order.ts";
import newProduct from "../../triggers/new-product.ts";
import updatedProduct from "../../triggers/new-or-updated-product.ts";
import newProductGroup from "../../triggers/new-product-group.ts";
import updatedProductGroup from "../../triggers/new-or-updated-product-group.ts";
import newStockItem from "../../triggers/new-stock-item.ts";
import updatedStockItem from "../../triggers/new-or-updated-stock-item.ts";
import updatedCustomer from "../../triggers/new-or-updated-customer.ts";
import newPlanning from "../../triggers/new-planning.ts";

const input = { subscriptionId: "sub-1" };
const BASE = "https://acme.booqable.com/api/4";
const QUERY = (sort: string) => `sort=${sort}&page%5Bnumber%5D=1&page%5Bsize%5D=100`;
const row = (id: string, updatedAt = "2026-11-09T09:00:00.000000+00:00") => ({
  id,
  type: "x",
  attributes: { created_at: "2026-11-09T09:00:00.000000+00:00", updated_at: updatedAt },
});

const NEW = [
  ["new-order", newOrder, "orders"],
  ["new-product", newProduct, "products"],
  ["new-product-group", newProductGroup, "product_groups"],
  ["new-stock-item", newStockItem, "stock_items"],
  ["new-planning", newPlanning, "plannings"],
] as const;
const UPDATED = [
  ["new-or-updated-order", updatedOrder, "orders"],
  ["new-or-updated-product", updatedProduct, "products"],
  ["new-or-updated-product-group", updatedProductGroup, "product_groups"],
  ["new-or-updated-stock-item", updatedStockItem, "stock_items"],
  ["new-or-updated-customer", updatedCustomer, "customers"],
] as const;

describe("new-<record> triggers (sort -created_at)", () => {
  for (const [name, trigger, path] of NEW) {
    test(`${name}: seeds, emits only new records, retries idempotently, requests -created_at`, async () => {
      const seed = mockBooqableCtx([{ body: { data: [row("a")] } }]);
      const seeded = await trigger.poll!({ ...input, params: {}, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, `${BASE}/${path}?${QUERY("-created_at")}`);
      const body = { data: [row("b"), row("a")] };
      const first = await trigger.poll!(
        { ...input, params: {}, state: seeded.nextState },
        mockBooqableCtx([{ body }]).ctx,
      );
      const retry = await trigger.poll!(
        { ...input, params: {}, state: seeded.nextState },
        mockBooqableCtx([{ body }]).ctx,
      );
      assertEquals(first.events, [row("b")]);
      assertEquals(retry, first);
    });
  }
});

describe("new-or-updated-<record> triggers (sort -updated_at)", () => {
  for (const [name, trigger, path] of UPDATED) {
    test(`${name}: an edit is a new event; requests -updated_at`, async () => {
      const seed = mockBooqableCtx([{ body: { data: [row("a")] } }]);
      const seeded = await trigger.poll!({ ...input, params: {}, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].url, `${BASE}/${path}?${QUERY("-updated_at")}`);
      const edited = row("a", "2026-11-09T10:00:00.000000+00:00");
      const body = { data: [edited, row("a")] };
      const first = await trigger.poll!(
        { ...input, params: {}, state: seeded.nextState },
        mockBooqableCtx([{ body }]).ctx,
      );
      const retry = await trigger.poll!(
        { ...input, params: {}, state: seeded.nextState },
        mockBooqableCtx([{ body }]).ctx,
      );
      assertEquals(first.events, [edited]);
      assertEquals(retry, first);
      const same = await trigger.poll!(
        { ...input, params: {}, state: first.nextState },
        mockBooqableCtx([{ body }]).ctx,
      );
      assertEquals(same.events, []);
    });
  }
});
