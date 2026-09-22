import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import updateProductVariant from "../../actions/update-product-variant.ts";
import { API_ROOT, bodyOf, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("update-product-variant: POST .../{variantId} with the Change wrapper", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "V1", sku: "TSHIRT-L" } }]);
  const out = await updateProductVariant.execute!({
    productId: "P1",
    variantId: "V1",
    sku: "TSHIRT-L",
    stock: { quantity: 4, unlimited: false },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products/P1/variants/V1`);
  assertEquals(bodyOf(calls[0]), {
    sku: { present: true, value: "TSHIRT-L" },
    stock: { present: true, value: { quantity: 4, unlimited: false } },
  });
  assertEquals(out.sku, "TSHIRT-L");
});

Deno.test("update-product-variant: every writable member wraps exactly once", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "V1" } }]);
  await updateProductVariant.execute!({
    productId: "P1",
    variantId: "V1",
    sku: "S",
    pricing: { onSale: { present: true, value: true } },
    attributes: { Size: "L" },
    gtin: "0123456789012",
    mpn: "MPN-1",
    shippingMeasurements: { weight: 2 },
    stock: { quantity: 3, unlimited: false },
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    sku: { present: true, value: "S" },
    pricing: { present: true, value: { onSale: { present: true, value: true } } },
    attributes: { present: true, value: { Size: "L" } },
    gtin: { present: true, value: "0123456789012" },
    mpn: { present: true, value: "MPN-1" },
    shippingMeasurements: { present: true, value: { weight: 2 } },
    stock: { present: true, value: { quantity: 3, unlimited: false } },
  });
});

Deno.test("update-product-variant: an empty change set is rejected", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => updateProductVariant.execute!({ productId: "P1", variantId: "V1" }, ctx),
    Error,
    "at least one field",
  );
});

Deno.test("update-product-variant: a 404 PRODUCT_VARIANT_NOT_FOUND body is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "PRODUCT_VARIANT_NOT_FOUND",
      message: "Variant not found",
    }),
  }]);

  await assertRejects(
    async () =>
      await updateProductVariant.execute!({ productId: "P1", variantId: "nope", sku: "S" }, ctx),
    Error,
    "PRODUCT_VARIANT_NOT_FOUND",
  );
});
