import { assertEquals, assertRejects } from "@std/assert";
import listProducts from "../../actions/list-products.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "listProducts";
const DATA = { "ok": "Y" };

Deno.test("list-products: calls listProducts with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await listProducts.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("list-products: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await listProducts.execute({ "sort_by": "name", "merchant_id": 9 }, ctx);
  assertEquals(fieldsOf(calls[0]), { "sort_by": "name", "merchant_id": "9" });
});

Deno.test("list-products: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await listProducts.execute({}, ctx),
    Error,
    "The API key is invalid.",
  );
});
