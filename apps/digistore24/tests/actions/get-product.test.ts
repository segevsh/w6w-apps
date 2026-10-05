import { assertEquals, assertRejects } from "@std/assert";
import getProduct from "../../actions/get-product.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "getProduct";
const DATA = { "ok": "Y" };

Deno.test("get-product: calls getProduct with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await getProduct.execute({ "product_id": 123 }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), { "product_id": "123" });
  assertEquals(out, DATA);
});

Deno.test("get-product: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await getProduct.execute({ "product_id": 123 }, ctx),
    Error,
    "The API key is invalid.",
  );
});
