import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, v3Page } from "../_helpers.ts";
import newBrand from "../../triggers/new-brand.ts";
import newInventoryLocation from "../../triggers/new-inventory-location.ts";
import newOrUpdatedPriceList from "../../triggers/new-or-updated-price-list.ts";
import newPriceList from "../../triggers/new-price-list.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ROOT = "https://api.bigcommerce.com/stores/abc123";

const cases = [
  {
    name: "new-price-list",
    trigger: newPriceList,
    item: { id: 3, name: "Wholesale", date_modified: "2026-11-10T10:00:00+00:00" },
    request: `${ROOT}/v3/pricelists?limit=250&page=1`,
  },
  {
    name: "new-or-updated-price-list",
    trigger: newOrUpdatedPriceList,
    item: { id: 3, name: "Wholesale", date_modified: "2026-11-10T10:00:00+00:00" },
    request: `${ROOT}/v3/pricelists?limit=250&page=1`,
  },
  {
    name: "new-brand",
    trigger: newBrand,
    item: { id: 7, name: "Acme" },
    request: `${ROOT}/v3/catalog/brands?limit=250&page=1`,
  },
  {
    name: "new-inventory-location",
    trigger: newInventoryLocation,
    item: { id: 1, code: "WH-1", label: "Main warehouse" },
    request: `${ROOT}/v3/inventory/locations?limit=250&page=1`,
  },
];

for (const { item, name, request, trigger } of cases) {
  test(`${name}: seeds silently, emits only the new row, retries idempotently`, async () => {
    const seed = mockCtx([{ body: v3Page([item]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0], { ...seed.calls[0], method: "GET", url: request });

    const fresh = { ...item, id: Number(item.id) + 1 };
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: v3Page([item, fresh]) }]).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: v3Page([item, fresh]) }]).ctx,
    );
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
  });
}

test("new-or-updated-price-list emits an edited list, new-price-list does not", async () => {
  const old = { id: 3, name: "Wholesale", date_modified: "2026-11-10T10:00:00+00:00" };
  const edited = { ...old, name: "Wholesale EU", date_modified: "2026-11-10T11:00:00+00:00" };
  for (
    const [trigger, expected] of [[newOrUpdatedPriceList, [edited]], [newPriceList, []]] as const
  ) {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: v3Page([old]) }]).ctx,
    );
    const result = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: v3Page([edited]) }]).ctx,
    );
    assertEquals(result.events, expected);
  }
});

test("a full page is followed by the next page", async () => {
  const page1 = Array.from({ length: 250 }, (_, i) => ({ id: i + 1, name: `B${i + 1}` }));
  const m = mockCtx([{ body: v3Page(page1) }, { body: v3Page([{ id: 251, name: "B251" }]) }]);
  const seeded = await newBrand.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 2);
  assertEquals(m.calls[1].url, `${ROOT}/v3/catalog/brands?limit=250&page=2`);
  assertEquals(Object.keys((seeded.nextState as { hashes: object }).hashes).length, 251);
});
