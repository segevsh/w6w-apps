import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ElasticClient, encodeBase64, resolveBaseUrl } from "../../lib/client.ts";

Deno.test("resolveBaseUrl: returns endpoint as-is", () => {
  assertEquals(
    resolveBaseUrl({ endpoint: "https://example.com:9200" }),
    "https://example.com:9200",
  );
});

Deno.test("resolveBaseUrl: trims trailing slash", () => {
  assertEquals(
    resolveBaseUrl({ endpoint: "https://example.com:9200/" }),
    "https://example.com:9200",
  );
});

Deno.test("resolveBaseUrl: throws when endpoint is missing", () => {
  assertThrows(() => resolveBaseUrl({}), Error, "missing endpoint");
});

Deno.test("encodeBase64: matches the standard id:key pairing", () => {
  assertEquals(encodeBase64("alice:secret"), btoa("alice:secret"));
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new ElasticClient(ctx, "https://example.com:9200");
  const result = await client.request("/my-index/_doc/1");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      statusText: "Not Found",
      body: '{"error":{"type":"index_not_found_exception"}}',
    },
  ]);
  const client = new ElasticClient(ctx, "https://example.com:9200");
  const err = await assertRejects(
    () => client.request("/missing-index/_doc/1"),
    Error,
    "Elasticsearch 404",
  );
  assert(err.message.includes("/missing-index/_doc/1"));
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new ElasticClient(ctx, "https://example.com:9200");
  await client.request("/my-index/_search", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON bodies set content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "1" } }]);
  const client = new ElasticClient(ctx, "https://example.com:9200");
  await client.request("/my-index/_doc", { method: "POST", body: { title: "hi" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ title: "hi" }));
});

Deno.test("client: fromConnection reads display.endpoint to build the base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { endpoint: "https://example.com:9200" },
  });
  const client = ElasticClient.fromConnection(ctx);
  await client.request("/my-index/_doc/1");
  assertEquals(new URL(calls[0].url).origin, "https://example.com:9200");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_doc/1");
});

Deno.test("client: empty response body does not throw on JSON parse", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "", headers: { "content-type": "text/plain" } }]);
  const client = new ElasticClient(ctx, "https://example.com:9200");
  const result = await client.request("/");
  assertEquals(result, undefined);
});
