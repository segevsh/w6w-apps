import { assertEquals, assertRejects } from "@std/assert";
import deleteProduct from "../../actions/delete-product.ts";
import { API_ROOT, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("delete-product: DELETE /v2/commerce/products/{productId} answers 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await deleteProduct.execute!({ productId: "P1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products/P1`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: true });
});

Deno.test("delete-product: a repeat is a 404, which is why it is not idempotent", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "MISSING_ARGUMENT",
      message: "Product not found",
    }),
  }]);

  await assertRejects(
    async () => await deleteProduct.execute!({ productId: "P1" }, ctx),
    Error,
    "404 INVALID_REQUEST_ERROR/MISSING_ARGUMENT",
  );
  assertEquals(deleteProduct.idempotent, false);
});
