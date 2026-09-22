import { assertEquals, assertThrows } from "@std/assert";
import getProducts from "../../actions/get-products.ts";
import { API_ROOT, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-products: GET /v2/commerce/products/{productIdCsvs}", async () => {
  const { ctx, calls } = mockCtx([{ body: { products: [{ id: "P1", name: "Tee" }] } }]);
  const out = await getProducts.execute!({ productIds: "P1,P2" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/commerce/products/P1,P2");
  assertEquals(out.products?.[0].id, "P1");
});

Deno.test("get-products: ids are escaped individually, commas stay separators", async () => {
  const { ctx, calls } = mockCtx([{ body: { products: [] } }]);
  await getProducts.execute!({ productIds: "a b,c/d" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products/a%20b,c%2Fd`);
});

Deno.test("get-products: more than 50 ids is refused before the request", () => {
  const { ctx } = mockCtx([]);
  const ids = Array.from({ length: 51 }, (_, i) => `P${i}`).join(",");
  assertThrows(() => getProducts.execute!({ productIds: ids }, ctx), Error, "at most 50");
});

Deno.test("get-products: the vendor's own 50-id 400 is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INVALID_ARGUMENT",
      message: "The provided product IDs are invalid or exceed the maximum of 50",
    }),
  }]);

  let message = "";
  try {
    await getProducts.execute!({ productIds: "P1" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("exceed the maximum of 50"), true);
});
