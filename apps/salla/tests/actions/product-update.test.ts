import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-update.ts";

const input = {
  "product_id": 123,
  "name": "v-name",
  "price": 123,
  "status": "sale",
  "description": "v-description",
  "quantity": 123,
  "unlimited_quantity": true,
  "sale_price": 123,
  "cost_price": 123,
  "sku": "v-sku",
  "weight": 123,
  "weight_type": "kg",
  "require_shipping": true,
  "with_tax": true,
  "brand_id": 123,
  "categories": [1, 2],
  "additionalFields": { "extra_field": "x" },
} as never;

Deno.test("product-update: PUT /products/{product_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "status": 200, "success": true, "data": { "id": 1 } },
  }]);
  const result = await action.execute!(input, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.salla.dev/admin/v2/products/123");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "v-name",
    "price": 123,
    "status": "sale",
    "description": "v-description",
    "quantity": 123,
    "unlimited_quantity": true,
    "sale_price": 123,
    "cost_price": 123,
    "sku": "v-sku",
    "weight": 123,
    "weight_type": "kg",
    "require_shipping": true,
    "with_tax": true,
    "brand_id": 123,
    "categories": [1, 2],
    "extra_field": "x",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { "status": 200, "success": true, "data": { "id": 1 } });
});

Deno.test("product-update: sends only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute!({ "product_id": 123 } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("product-update: a Salla error envelope throws with its message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      status: 422,
      success: false,
      error: { code: "error", message: "alert.invalid_fields", fields: { name: ["required"] } },
    },
  }]);
  let message = "";
  try {
    await action.execute!(input, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("alert.invalid_fields"), message);
  assert(message.includes("name: required"), message);
});
