import { assert, assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-update.ts";

Deno.test("product-update: PUTs the id plus only the supplied fields", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: {} } }]);
  await action.execute({ productId: 5, status: "archived" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { product: { id: 5, status: "archived" } });
});

Deno.test("product-update: warns that tags replace rather than append", () => {
  assert(action.params?.find((p) => p.key === "tags")?.hint?.includes("REPLACES"));
});
