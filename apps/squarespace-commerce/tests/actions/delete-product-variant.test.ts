import { assertEquals, assertRejects } from "@std/assert";
import deleteProductVariant from "../../actions/delete-product-variant.ts";
import { API_ROOT, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("delete-product-variant: DELETE .../variants/{variantId} answers 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await deleteProductVariant.execute!({ productId: "P1", variantId: "V1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products/P1/variants/V1`);
  assertEquals(out, { ok: true });
});

Deno.test("delete-product-variant: the vendor refusing the last variant is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INSUFFICIENT_PRODUCT_VARIANTS",
      message: "A product must have at least one variant",
    }),
  }]);

  await assertRejects(
    async () => await deleteProductVariant.execute!({ productId: "P1", variantId: "V1" }, ctx),
    Error,
    "INSUFFICIENT_PRODUCT_VARIANTS",
  );
});
