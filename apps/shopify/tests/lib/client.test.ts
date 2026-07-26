import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockShopifyCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  nextPageInfo,
  shopFromConnection,
  ShopifyClient,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's store handle", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { shop: {} } }], "acme");
  await new ShopifyClient(ctx).request("/shop.json");
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/shop.json");
  // Shopify's token header is set by `sign`, not here.
  assertEquals("x-shopify-access-token" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no store handle", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new ShopifyClient(ctx), Error, "no store handle");
});

Deno.test("client: surfaces Shopify's error body", async () => {
  const { ctx } = mockShopifyCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: '{"errors":{"title":["can\'t be blank"]}}',
  }]);
  await assertRejects(
    () => new ShopifyClient(ctx).request("/products.json", { method: "POST", body: {} }),
    Error,
    "can't be blank",
  );
});

Deno.test("nextPageInfo: extracts the cursor from the rel=next Link header", () => {
  const link =
    '<https://acme.myshopify.com/admin/api/2024-07/orders.json?page_info=PREV&limit=50>; rel="previous", ' +
    '<https://acme.myshopify.com/admin/api/2024-07/orders.json?page_info=NEXT&limit=50>; rel="next"';
  assertEquals(nextPageInfo(link), "NEXT");
});

Deno.test("nextPageInfo: is undefined on the last page and with no header", () => {
  assertEquals(nextPageInfo(null), undefined);
  assertEquals(nextPageInfo('<https://x/orders.json?page_info=P>; rel="previous"'), undefined);
});

Deno.test("client.list: pairs the collection with the Link cursor", async () => {
  const { ctx } = mockShopifyCtx([{
    body: { orders: [{ id: 1 }] },
    headers: {
      "content-type": "application/json",
      link: '<https://acme.myshopify.com/x?page_info=NEXT>; rel="next"',
    },
  }]);
  assertEquals(await new ShopifyClient(ctx).list("/orders.json", "orders", {}), {
    data: [{ id: 1 }],
    nextPageInfo: "NEXT",
  });
});

Deno.test("baseUrl: pins the Admin API version", () => {
  assertEquals(baseUrl("acme"), "https://acme.myshopify.com/admin/api/2024-07");
});

Deno.test("shopFromConnection/compact/unset behave as expected", () => {
  assertEquals(shopFromConnection({ display: { shop: "acme" } } as never), "acme");
  assertThrows(() => shopFromConnection(undefined), Error, "no store handle");
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(unset(""), undefined);
});
