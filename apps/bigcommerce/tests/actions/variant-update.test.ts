import { assert, assertEquals } from "@std/assert";
import variantUpdate from "../../actions/variant-update.ts";
import { bodyOf, mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

Deno.test("variant-update: PUTs a partial variant under its product", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: 9 }) }]);
  await variantUpdate.execute({ productId: 77, variantId: 9, fields: { price: 24.5 } }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products/77/variants/9");
  assertEquals(bodyOf(calls[0]), { price: 24.5 });
});

Deno.test("variant-update: warns that inventory_level here is ABSOLUTE", () => {
  // Two absolute writes racing silently discard one; the relative endpoint is
  // the vendor's recommendation for order-driven changes.
  const fields = variantUpdate.params?.find((p) => p.key === "fields");
  assert(fields?.hint?.includes("absolute"), fields?.hint);
  assert(fields?.hint?.includes("Relative"), fields?.hint);
});
