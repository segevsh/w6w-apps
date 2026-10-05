import { assert, assertEquals, assertRejects } from "@std/assert";
import updateProduct from "../../actions/update-product.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "updateProduct";
const DATA = { "ok": "Y" };

Deno.test("update-product: calls updateProduct with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await updateProduct.execute({
    "product_id": 123,
    "fields": { "name_en": "New", "is_active": "N" },
  }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "product_id": "123", "name_en": "New", "is_active": "N" });
  assertEquals(out, DATA);
});

Deno.test("update-product: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await updateProduct.execute({
    "product_id": 123,
    "fields": { "name_en": "New", "is_active": "N" },
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("update-product: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () =>
      await updateProduct.execute({
        "product_id": 123,
        "fields": { "name_en": "New", "is_active": "N" },
      }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("update-product: declares idempotency as true", () => {
  assertEquals(updateProduct.idempotent, true);
});
