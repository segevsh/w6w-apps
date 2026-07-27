import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { WebflowClient } from "../../lib/client.ts";

Deno.test("client: prefixes the v2 base URL and defaults to GET", async () => {
  const { ctx, calls } = mockCtx([{ body: { sites: [] } }]);
  const client = new WebflowClient(ctx);
  await client.request("/sites");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.webflow.com");
  assertEquals(url.pathname, "/v2/sites");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new WebflowClient(ctx);
  const result = await client.request("/collections/c/items/i", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"message":"Resource not found"}' },
  ]);
  const client = new WebflowClient(ctx);
  const err = await assertRejects(
    () => client.request("/sites/missing"),
    Error,
    "Webflow 404",
  );
  assertEquals(err.message.includes("/v2/sites/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new WebflowClient(ctx);
  await client.request("/sites/s/orders", {
    query: { status: "pending", limit: undefined, offset: null, cursor: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "pending");
  assertEquals(url.searchParams.has("limit"), false);
  assertEquals(url.searchParams.has("offset"), false);
  assertEquals(url.searchParams.has("cursor"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1" } }]);
  const client = new WebflowClient(ctx);
  await client.request("/collections/c/items", {
    method: "POST",
    body: { fieldData: { name: "Hi", slug: "hi" } },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { fieldData: { name: "Hi", slug: "hi" } });
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new WebflowClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});
