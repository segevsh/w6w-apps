import { assertEquals, assertRejects } from "@std/assert";
import productUpdate from "../../actions/product-update.ts";
import { bodyOf, mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

Deno.test("product-update: PUTs only the fields given", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: 77 }) }]);
  await productUpdate.execute({ productId: 77, fields: { price: 19.99 } }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products/77");
  assertEquals(bodyOf(calls[0]), { price: 19.99 });
});

Deno.test("product-update: accepts the fields param as a JSON string too", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await productUpdate.execute({ productId: 1, fields: '{"is_visible":false}' }, ctx);
  assertEquals(bodyOf(calls[0]), { is_visible: false });
});

Deno.test("product-update: rejects unparseable JSON before making a request", async () => {
  // `mockCtx([])` throws on any fetch, so reaching the network fails the test.
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await productUpdate.execute({ productId: 1, fields: "{oops" }, ctx),
    Error,
    "Fields to change is not valid JSON",
  );
});

Deno.test("product-update: a repeat is a no-op, so it is idempotent", () => {
  assertEquals(productUpdate.idempotent, true);
});
