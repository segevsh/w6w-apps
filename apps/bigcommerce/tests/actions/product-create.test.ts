import { assert, assertEquals } from "@std/assert";
import productCreate from "../../actions/product-create.ts";
import { bodyOf, mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

Deno.test("product-create: POSTs the four required fields under their API names", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: 100 }) }]);
  const out = await productCreate.execute(
    { name: "Mug", type: "physical", price: 12.5, weight: 0.4 },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products");
  assertEquals(bodyOf(calls[0]), { name: "Mug", type: "physical", price: 12.5, weight: 0.4 });
  assertEquals(out, { id: 100 });
});

Deno.test("product-create: weight is required even for a digital product, and 0 survives", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await productCreate.execute({ name: "Ebook", type: "digital", price: 9, weight: 0 }, ctx);
  assertEquals((bodyOf(calls[0]) as { weight: number }).weight, 0);

  const weight = productCreate.params?.find((p) => p.key === "weight");
  assertEquals(weight?.required, true);
  assertEquals(weight?.default, 0);
});

Deno.test("product-create: categories are parsed into a number array", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await productCreate.execute(
    { name: "x", type: "physical", price: 1, weight: 1, categories: " 23 , 24 ,bad, " },
    ctx,
  );
  assertEquals((bodyOf(calls[0]) as { categories: number[] }).categories, [23, 24]);
});

Deno.test("product-create: extraFields merge in and win", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await productCreate.execute({
    name: "x",
    type: "physical",
    price: 1,
    weight: 1,
    extraFields: '{"price": 99, "availability": "preorder"}',
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    name: "x",
    type: "physical",
    price: 99,
    weight: 1,
    availability: "preorder",
  });
});

Deno.test("product-create: is honestly non-idempotent", () => {
  // BigCommerce mints the id and accepts no idempotency key, so a retry makes a
  // second product.
  assertEquals(productCreate.idempotent, false);
  assert(productCreate.type === "perform");
});
