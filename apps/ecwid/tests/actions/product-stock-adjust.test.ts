import { assertEquals } from "@std/assert";
import productStockAdjust from "../../actions/product-stock-adjust.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-stock-adjust: PUTs a quantityDelta to /products/{id}/inventory", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  const out = await productStockAdjust.execute(
    { productId: "39766764", quantityDelta: -10 },
    ctx,
  ) as { updateCount: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products/39766764/inventory");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { quantityDelta: -10 });
  assertEquals(out.updateCount, 1);
});

Deno.test("product-stock-adjust: the low-stock switch is a query param, not a body field", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await productStockAdjust.execute(
    { productId: "1", quantityDelta: 5, checkLowStockNotification: true },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { checkLowStockNotification: "true" });
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { quantityDelta: 5 });
});

Deno.test("product-stock-adjust: a negative-stock warning comes back with the result", async () => {
  const { ctx } = mockCtx([{ body: { updateCount: 1, warning: "Stock is negative" } }]);
  assertEquals(await productStockAdjust.execute({ productId: "1", quantityDelta: -99 }, ctx), {
    updateCount: 1,
    warning: "Stock is negative",
  });
});

/**
 * The delta is the whole reason this action exists, and it is also why it must
 * never be retried automatically: applying `-1` twice sells two units.
 */
Deno.test("product-stock-adjust: a delta write is not idempotent", () => {
  assertEquals(productStockAdjust.idempotent, false);
  assertEquals(productStockAdjust.params?.find((p) => p.key === "quantityDelta")?.required, true);
});
