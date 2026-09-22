import { assertEquals, assertRejects } from "@std/assert";
import createProductVariant from "../../actions/create-product-variant.ts";
import { API_ROOT, bodyOf, errorBody, mockCtx } from "../_helpers.ts";

const MINIMAL = {
  productId: "P1",
  sku: "TSHIRT-M",
  pricing: { basePrice: { currency: "USD", value: 29.99 } },
};

// `productId` is a path parameter, not a body field — it must never appear in
// the request body the vendor receives.
const MINIMAL_BODY = {
  sku: "TSHIRT-M",
  pricing: { basePrice: { currency: "USD", value: 29.99 } },
};

Deno.test("create-product-variant: POST /v2/commerce/products/{productId}/variants", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "V1", sku: "TSHIRT-M" } }]);
  const out = await createProductVariant.execute!({ ...MINIMAL }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products/P1/variants`);
  assertEquals(bodyOf(calls[0]), MINIMAL_BODY);
  assertEquals(out.id, "V1");
});

Deno.test("create-product-variant: the physical-only members are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "V1" } }]);
  await createProductVariant.execute!({
    ...MINIMAL,
    attributes: { Color: "Blue", Size: "M" },
    gtin: "0123456789012",
    mpn: "ABC-123",
    shippingMeasurements: { weight: 1.2 },
    stock: { quantity: 10, unlimited: false },
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    ...MINIMAL_BODY,
    attributes: { Color: "Blue", Size: "M" },
    gtin: "0123456789012",
    mpn: "ABC-123",
    shippingMeasurements: { weight: 1.2 },
    stock: { quantity: 10, unlimited: false },
  });
});

Deno.test("create-product-variant: json params accept a typed string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "V1" } }]);
  await createProductVariant.execute!({
    ...MINIMAL,
    stock: '{"quantity":4,"unlimited":false}',
  }, ctx);

  assertEquals(bodyOf(calls[0]).stock, { quantity: 4, unlimited: false });
});

Deno.test("create-product-variant: a 400 SKU_UNAVAILABLE body is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "SKU_UNAVAILABLE",
      message: "SKU already in use",
    }),
  }]);

  await assertRejects(
    async () => await createProductVariant.execute!({ ...MINIMAL, sku: "DUP" }, ctx),
    Error,
    "SKU_UNAVAILABLE",
  );
});
