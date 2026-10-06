import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import productUpdate from "../../actions/product-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "productId": 42,
  "name": "Widget",
  "price": 9.5,
  "tax_rate": 20,
  "description": "A widget",
  "internal_id": "P1",
  "product_code": "SKU-1",
  "supplier_product_code": "S-1",
  "job_costing": 4,
  "tax_deee": 0.1,
  "eco_participation": 0.2,
  "location": "A1",
  "unit": "pcs",
  "product_type": 601,
  "category": "Hardware",
  "custom_fields": '{"Color": "red"}',
  "stock_threshold": 5,
  "disabled": true,
};

Deno.test("product-update: PATCH /api/v2/products/42 with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await productUpdate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/products/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Widget",
    "price": 9.5,
    "tax_rate": 20,
    "description": "A widget",
    "internal_id": "P1",
    "product_code": "SKU-1",
    "supplier_product_code": "S-1",
    "job_costing": 4,
    "tax_deee": 0.1,
    "eco_participation": 0.2,
    "location": "A1",
    "unit": "pcs",
    "product_type": 601,
    "category": "Hardware",
    "custom_fields": {
      "Color": "red",
    },
    "stock_threshold": 5,
    "disabled": true,
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("product-update: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await productUpdate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("product-update: invalid JSON in custom_fields is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (productUpdate.execute({
      ...({
        "productId": 42,
        "name": "Widget",
        "price": 9.5,
        "tax_rate": 20,
        "description": "A widget",
        "internal_id": "P1",
        "product_code": "SKU-1",
        "supplier_product_code": "S-1",
        "job_costing": 4,
        "tax_deee": 0.1,
        "eco_participation": 0.2,
        "location": "A1",
        "unit": "pcs",
        "product_type": 601,
        "category": "Hardware",
        "custom_fields": '{"Color": "red"}',
        "stock_threshold": 5,
        "disabled": true,
      }),
      "custom_fields": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: custom_fields");
  assertEquals(calls.length, 0);
});
