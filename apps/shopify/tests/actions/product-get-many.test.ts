import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-get-many.ts";

Deno.test("product-get-many: sends the filters on a first page", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { products: [] } }]);
  await action.execute({ status: "active", vendor: "Acme", limit: 10 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("status"), "active");
  assertEquals(q.get("vendor"), "Acme");
  assertEquals(q.get("limit"), "10");
});

Deno.test("product-get-many: drops the filters once a cursor is in play", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { products: [] } }]);
  await action.execute({ status: "active", vendor: "Acme", pageInfo: "NEXT" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  // Shopify REJECTS a cursor sent alongside filters — the cursor encodes them.
  assertEquals(q.get("page_info"), "NEXT");
  assertEquals(q.has("status"), false);
  assertEquals(q.has("vendor"), false);
});

Deno.test("product-get-many: returns the data plus the next cursor", async () => {
  const { ctx } = mockShopifyCtx([{
    body: { products: [{ id: 1 }] },
    headers: { "content-type": "application/json", link: '<https://x?page_info=N2>; rel="next"' },
  }]);
  assertEquals(await action.execute({}, ctx), { data: [{ id: 1 }], nextPageInfo: "N2" });
});
