import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { resolveBaseUrl, WooCommerceClient } from "../../lib/client.ts";

Deno.test("resolveBaseUrl: storeUrl → /wp-json/wc/v3", () => {
  assertEquals(
    resolveBaseUrl({ storeUrl: "https://shop.example.com" }),
    "https://shop.example.com/wp-json/wc/v3",
  );
});

Deno.test("resolveBaseUrl: trims trailing slash from storeUrl", () => {
  assertEquals(
    resolveBaseUrl({ storeUrl: "https://shop.example.com/" }),
    "https://shop.example.com/wp-json/wc/v3",
  );
});

Deno.test("resolveBaseUrl: throws when storeUrl is missing", () => {
  assertThrows(() => resolveBaseUrl({}), Error, "missing storeUrl");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new WooCommerceClient(ctx, "https://shop.example.com/wp-json/wc/v3");
  const result = await client.request("/products/1");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      statusText: "Not Found",
      body: '{"code":"woocommerce_rest_product_invalid_id"}',
    },
  ]);
  const client = new WooCommerceClient(ctx, "https://shop.example.com/wp-json/wc/v3");
  const err = await assertRejects(
    () => client.request("/products/999"),
    Error,
    "WooCommerce 404",
  );
  assert(err.message.includes("/wp-json/wc/v3/products/999"));
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new WooCommerceClient(ctx, "https://shop.example.com/wp-json/wc/v3");
  await client.request("/products", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: array query params join with commas, empties omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new WooCommerceClient(ctx, "https://shop.example.com/wp-json/wc/v3");
  await client.request("/products", {
    query: { include: [1, 2, 3], exclude: [] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include"), "1,2,3");
  assertEquals(url.searchParams.has("exclude"), false);
});

Deno.test("client: JSON bodies set content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const client = new WooCommerceClient(ctx, "https://shop.example.com/wp-json/wc/v3");
  await client.request("/products", { method: "POST", body: { name: "hi" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "hi" }));
});

Deno.test("client: fromConnection reads display.storeUrl to build the base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { storeUrl: "https://shop.example.com" },
  });
  const client = WooCommerceClient.fromConnection(ctx);
  await client.request("/products/1");
  assertEquals(new URL(calls[0].url).origin, "https://shop.example.com");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wc/v3/products/1");
});
