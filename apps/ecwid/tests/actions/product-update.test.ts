import { assertEquals } from "@std/assert";
import productUpdate from "../../actions/product-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-update: PUTs a partial product body and returns updateCount", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  const out = await productUpdate.execute(
    { productId: "692730761", price: 12.5, enabled: true },
    ctx,
  ) as { updateCount: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products/692730761");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { price: 12.5, enabled: true });
  assertEquals(out.updateCount, 1);
});

Deno.test("product-update: additional fields win over the typed ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await productUpdate.execute(
    { productId: "1", price: 10, extraFields: '{"price":99,"subtitle":"Sale"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { price: 99, subtitle: "Sale" });
});

Deno.test("product-update: the id is required and escaped", async () => {
  assertEquals(productUpdate.params?.find((p) => p.key === "productId")?.required, true);
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await productUpdate.execute({ productId: " a b ", name: "x" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products/a%20b");
});
