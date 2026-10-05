import { assert, assertEquals, assertRejects } from "@std/assert";
import createProduct from "../../actions/create-product.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "createProduct";
const DATA = { "product_id": 777 };

Deno.test("create-product: calls createProduct with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await createProduct.execute({
    "data": { "name_intern": "My course", "currency": "EUR" },
  }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "data[name_intern]": "My course", "data[currency]": "EUR" });
  assertEquals(out, DATA);
});

Deno.test("create-product: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await createProduct.execute({ "data": { "name_intern": "My course", "currency": "EUR" } }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("create-product: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () =>
      await createProduct.execute(
        { "data": { "name_intern": "My course", "currency": "EUR" } },
        ctx,
      ),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("create-product: declares idempotency as false", () => {
  assertEquals(createProduct.idempotent, false);
});
