import { assert, assertEquals, assertRejects } from "@std/assert";
import inventoryAdjustRelative from "../../actions/inventory-adjust-relative.ts";
import { bodyOf, mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

Deno.test("inventory-adjust-relative: POSTs deltas with a reason", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await inventoryAdjustRelative.execute({
    items: [{ location_id: 1, sku: "MUG-1", quantity: -2 }],
    reason: "Order 1234 fulfilled",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/inventory/adjustments/relative");
  assertEquals(bodyOf(calls[0]), {
    items: [{ location_id: 1, sku: "MUG-1", quantity: -2 }],
    reason: "Order 1234 fulfilled",
  });
});

Deno.test("inventory-adjust-relative: enforces the documented 2000-item payload limit", async () => {
  const { ctx } = mockCtx([]);
  const many = Array.from({ length: 2001 }, () => ({ location_id: 1, sku: "x", quantity: 1 }));
  await assertRejects(
    async () => await inventoryAdjustRelative.execute({ items: many }, ctx),
    Error,
    "at most 2000 adjustment items",
  );
});

Deno.test("inventory-adjust-relative: refuses a non-array body", async () => {
  await assertRejects(
    async () =>
      await inventoryAdjustRelative.execute({ items: { location_id: 1 } }, mockCtx([]).ctx),
    Error,
    "must be a JSON array",
  );
});

Deno.test("inventory-adjust-relative: is honestly non-idempotent — a delta applied twice moves twice", () => {
  assertEquals(inventoryAdjustRelative.idempotent, false);
  const items = inventoryAdjustRelative.params?.find((p) => p.key === "items");
  assert(items?.hint?.includes("exactly ONE"), items?.hint);
});
