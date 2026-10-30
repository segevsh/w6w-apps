import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import inventoryItemList from "../../actions/inventory-item-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

test("inventory-item-list: GETs /v3/inventory/items with :in filters", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ sku: "MUG-1", location_id: 1 }]) }]);
  const out = await inventoryItemList.execute({ skus: "MUG-1", locationIds: "1,2" }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/inventory/items");
  assertEquals(queryOf(calls[0].url), { "sku:in": "MUG-1", "location_id:in": "1,2" });
  assertEquals(out.data.length, 1);
});

test("inventory-item-list: the row is (item, location), which the description says", () => {
  assert(inventoryItemList.description?.includes("per location"), inventoryItemList.description);
});
