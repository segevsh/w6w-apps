import { assertEquals } from "@std/assert";
import productGet from "../../actions/product-get.ts";
import { mockCtx, pathOf, queryOf, v3Envelope } from "../_helpers.ts";

Deno.test("product-get: GETs one product and unwraps the v3 envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: 77, name: "Mug" }) }]);
  const out = await productGet.execute({ productId: 77 }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products/77");
  assertEquals(out, { id: 77, name: "Mug" });
});

Deno.test("product-get: passes include and field selection through", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await productGet.execute(
    { productId: 1, include: ["variants"], excludeFields: "description" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { include: "variants", exclude_fields: "description" });
});

Deno.test("product-get: an id containing a separator cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await productGet.execute({ productId: "1/../../v2/store" as unknown as number }, ctx);
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products/1%2F..%2F..%2Fv2%2Fstore");
});
