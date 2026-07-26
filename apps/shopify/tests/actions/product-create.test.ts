import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-create.ts";

Deno.test("product-create: POSTs /products.json with the product envelope", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: { id: 1 } } }]);
  await action.execute({ title: "Mug", status: "active" }, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/products.json");
  assertEquals(JSON.parse(calls[0].body!), { product: { title: "Mug", status: "active" } });
});

Deno.test("product-create: maps bodyHtml/productType onto Shopify's snake_case", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ title: "Mug", bodyHtml: "<p>hi</p>", productType: "Drinkware" }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.body_html, "<p>hi</p>");
  assertEquals(p.product_type, "Drinkware");
});
