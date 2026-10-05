import { assertEquals, assertRejects } from "@std/assert";
import productUpdate from "../../actions/product-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "productId": "productId-1==",
  "name": "name-1",
  "description": "description-1",
  "customPermalink": "customPermalink-1",
  "price": 5,
  "priceCurrencyType": "priceCurrencyType-1",
  "customizablePrice": true,
  "suggestedPriceCents": 5,
  "maxPurchaseCount": 5,
  "category": "category-1",
  "taxonomyId": 5,
  "tags": "a, b",
  "customSummary": "customSummary-1",
  "refundPeriod": "inherit",
  "refundFinePrint": "refundFinePrint-1",
  "customReceipt": "customReceipt-1",
  "quantityEnabled": true,
  "isAdult": true,
  "displayProductReviews": true,
  "shouldShowSalesCount": true,
};

Deno.test("product-update: sends PUT /v2/products/productId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  await productUpdate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [
    ["name", "name-1"],
    ["description", "description-1"],
    ["custom_permalink", "customPermalink-1"],
    ["price", "5"],
    ["price_currency_type", "priceCurrencyType-1"],
    ["customizable_price", "true"],
    ["suggested_price_cents", "5"],
    ["max_purchase_count", "5"],
    ["category", "category-1"],
    ["taxonomy_id", "5"],
    ["tags[]", "a"],
    ["tags[]", "b"],
    ["custom_summary", "customSummary-1"],
    ["refund_period", "inherit"],
    ["refund_fine_print", "refundFinePrint-1"],
    ["custom_receipt", "customReceipt-1"],
    ["quantity_enabled", "true"],
    ["is_adult", "true"],
    ["display_product_reviews", "true"],
    ["should_show_sales_count", "true"],
  ]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("product-update: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "product": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await productUpdate.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("product-update: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(productUpdate.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("product-update: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(productUpdate.execute(INPUT, ctx)), Error, "refused");
});
