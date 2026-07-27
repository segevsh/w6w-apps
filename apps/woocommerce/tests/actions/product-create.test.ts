import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-create.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("product-create: POSTs /products with only the required name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }], { display });
  const result = await action.execute!({ name: "Widget" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/products");
  assertEquals(JSON.parse(calls[0].body!), { name: "Widget" });
  assertEquals(result, { id: 1 });
});

Deno.test("product-create: maps camelCase inputs, categories/tags to {id} objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2 } }], { display });
  await action.execute!(
    {
      name: "Widget",
      type: "simple",
      status: "publish",
      sku: "W-1",
      regularPrice: "9.99",
      salePrice: "7.99",
      description: "long",
      shortDescription: "short",
      categories: [3, 4],
      tags: [7],
      manageStock: true,
      stockQuantity: 12,
      stockStatus: "instock",
      weight: "0.5",
      featured: true,
      virtual: false,
      downloadable: false,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Widget",
    type: "simple",
    status: "publish",
    sku: "W-1",
    regular_price: "9.99",
    sale_price: "7.99",
    description: "long",
    short_description: "short",
    categories: [{ id: 3 }, { id: 4 }],
    tags: [{ id: 7 }],
    manage_stock: true,
    stock_quantity: 12,
    stock_status: "instock",
    weight: "0.5",
    featured: true,
    virtual: false,
    downloadable: false,
  });
});
