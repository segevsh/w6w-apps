import { assertEquals, assertRejects } from "@std/assert";
import variantUpdate from "../../actions/variant-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "productId": "productId-1==",
  "variantCategoryId": "variantCategoryId-1==",
  "variantId": "variantId-1==",
  "name": "name-1",
  "priceDifferenceCents": 5,
  "maxPurchaseCount": 5,
};

Deno.test("variant-update: sends PUT /v2/products/productId-1%3D%3D/variant_categories/variantCategoryId-1%3D%3D/variants/variantId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "variant": { "id": "x1", "marker": true } },
  }]);
  await variantUpdate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/products/productId-1%3D%3D/variant_categories/variantCategoryId-1%3D%3D/variants/variantId-1%3D%3D",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["name", "name-1"], [
    "price_difference_cents",
    "5",
  ], ["max_purchase_count", "5"]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("variant-update: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "variant": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await variantUpdate.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("variant-update: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(variantUpdate.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("variant-update: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(variantUpdate.execute(INPUT, ctx)), Error, "refused");
});
