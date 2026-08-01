import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { appendBracketParams, resolveBaseUrl, StrapiClient } from "../../lib/client.ts";

Deno.test("resolveBaseUrl: returns endpoint as-is", () => {
  assertEquals(
    resolveBaseUrl({ endpoint: "https://example.com" }),
    "https://example.com",
  );
});

Deno.test("resolveBaseUrl: trims trailing slash", () => {
  assertEquals(
    resolveBaseUrl({ endpoint: "https://example.com/" }),
    "https://example.com",
  );
});

Deno.test("resolveBaseUrl: throws when endpoint is missing", () => {
  assertThrows(() => resolveBaseUrl({}), Error, "missing endpoint");
});

Deno.test("appendBracketParams: scalar sets the key directly", () => {
  const params = new URLSearchParams();
  appendBracketParams(params, "sort", "name:asc");
  assertEquals(params.get("sort"), "name:asc");
});

Deno.test("appendBracketParams: nested object expands into bracket paths", () => {
  const params = new URLSearchParams();
  appendBracketParams(params, "filters", { title: { $eq: "hello" } });
  assertEquals(params.get("filters[title][$eq]"), "hello");
});

Deno.test("appendBracketParams: array expands with numeric indices", () => {
  const params = new URLSearchParams();
  appendBracketParams(params, "sort", ["name:asc", "id:desc"]);
  assertEquals(params.get("sort[0]"), "name:asc");
  assertEquals(params.get("sort[1]"), "id:desc");
});

Deno.test("appendBracketParams: deeply nested populate", () => {
  const params = new URLSearchParams();
  appendBracketParams(params, "populate", { author: { fields: ["name"] } });
  assertEquals(params.get("populate[author][fields][0]"), "name");
});

Deno.test("appendBracketParams: skips undefined/null", () => {
  const params = new URLSearchParams();
  appendBracketParams(params, "a", undefined);
  appendBracketParams(params, "b", null);
  assertEquals([...params.keys()].length, 0);
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new StrapiClient(ctx, "https://example.com");
  const result = await client.request("/api/articles/1");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      statusText: "Not Found",
      body: '{"error":{"message":"Not Found"}}',
    },
  ]);
  const client = new StrapiClient(ctx, "https://example.com");
  const err = await assertRejects(
    () => client.request("/api/articles/missing"),
    Error,
    "Strapi 404",
  );
  assert(err.message.includes("/api/articles/missing"));
});

Deno.test("client: bracket-encodes nested query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new StrapiClient(ctx, "https://example.com");
  await client.request("/api/articles", {
    query: { filters: { title: { $eq: "hi" } }, pagination: { page: 1, pageSize: 10 } },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filters[title][$eq]"), "hi");
  assertEquals(url.searchParams.get("pagination[page]"), "1");
  assertEquals(url.searchParams.get("pagination[pageSize]"), "10");
});

Deno.test("client: JSON bodies set content-type and wrap correctly", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const client = new StrapiClient(ctx, "https://example.com");
  await client.request("/api/articles", { method: "POST", body: { data: { title: "hi" } } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ data: { title: "hi" } }));
});

Deno.test("client: fromConnection reads display.endpoint to build the base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }], {
    display: { endpoint: "https://example.com" },
  });
  const client = StrapiClient.fromConnection(ctx);
  await client.request("/api/articles");
  assertEquals(new URL(calls[0].url).origin, "https://example.com");
  assertEquals(new URL(calls[0].url).pathname, "/api/articles");
});

Deno.test("client: empty response body does not throw on JSON parse", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "", headers: { "content-type": "text/plain" } }]);
  const client = new StrapiClient(ctx, "https://example.com");
  const result = await client.request("/api/articles/1");
  assertEquals(result, undefined);
});
