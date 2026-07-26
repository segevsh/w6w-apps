import { assert, assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/inventory-level-set.ts";

Deno.test("inventory-level-set: POSTs an absolute quantity to /inventory_levels/set.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { inventory_level: { available: 7 } } }]);
  await action.execute({ inventoryItemId: 11, locationId: 22, available: 7 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/admin/api/2024-07/inventory_levels/set.json");
  assertEquals(JSON.parse(calls[0].body!), {
    inventory_item_id: 11,
    location_id: 22,
    available: 7,
  });
});

Deno.test("inventory-level-set: is idempotent because it sets rather than adjusts", () => {
  // `adjust` applies a delta and would double-count on a retry; `set` cannot.
  assertEquals(action.idempotent, true);
  assert(action.description?.includes("Absolute, not a delta"));
});
