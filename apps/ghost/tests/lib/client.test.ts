import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { GhostClient, resolveBaseUrl } from "../../lib/client.ts";

Deno.test("resolveBaseUrl: siteUrl → /ghost/api/admin", () => {
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://example.com" }),
    "https://example.com/ghost/api/admin",
  );
});

Deno.test("resolveBaseUrl: trims trailing slash from siteUrl", () => {
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://example.com/" }),
    "https://example.com/ghost/api/admin",
  );
});

Deno.test("resolveBaseUrl: throws when siteUrl is missing", () => {
  assertThrows(() => resolveBaseUrl({}), Error, "missing siteUrl");
});

Deno.test("browse: unwraps the plural envelope array and surfaces meta", async () => {
  const { ctx, calls } = mockCtx([
    { body: { posts: [{ id: "1" }, { id: "2" }], meta: { pagination: { page: 1 } } } },
  ]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  const result = await client.browse("posts");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/");
  assertEquals(result.items, [{ id: "1" }, { id: "2" }]);
  assertEquals(result.meta, { pagination: { page: 1 } });
});

Deno.test("read: requests /<resource>/:id/ (trailing slash) and unwraps the 1-element array", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "42", title: "Hi" }] } }]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  const result = await client.read("posts", "42");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/42/");
  assertEquals(result, { id: "42", title: "Hi" });
});

Deno.test("create: wraps the request body in a named array and unwraps the response", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { posts: [{ id: "1" }] } }]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  const result = await client.create("posts", { title: "Hello" });
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { posts: [{ title: "Hello" }] });
  assertEquals(result, { id: "1" });
});

Deno.test("update: PUTs /<resource>/:id/ with the body wrapped, and unwraps the response", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "1", title: "New" }] } }]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  const result = await client.update("posts", "1", { title: "New" });
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/1/");
  assertEquals(JSON.parse(calls[0].body!), { posts: [{ title: "New" }] });
  assertEquals(result, { id: "1", title: "New" });
});

Deno.test("destroy: DELETEs /<resource>/:id/ and returns undefined on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  const result = await client.destroy("posts", "1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, undefined);
});

Deno.test("site: unwraps the bare `{ site: {...} }` object, not an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { site: { title: "My Blog", version: "5.100" } } }]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  const result = await client.site();
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/site/");
  assertEquals(result, { title: "My Blog", version: "5.100" });
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"errors":[{"message":"Resource not found"}]}' },
  ]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  const err = await assertRejects(() => client.read("posts", "999"), Error, "Ghost 404");
  assert(err.message.includes("/ghost/api/admin/posts/999/"));
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [] } }]);
  const client = new GhostClient(ctx, "https://example.com/ghost/api/admin");
  await client.browse("posts", { a: "kept", b: undefined, c: null, d: "" });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: fromConnection reads display.siteUrl to build the base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [] } }], {
    display: { siteUrl: "https://example.com" },
  });
  const client = GhostClient.fromConnection(ctx);
  await client.browse("posts");
  assertEquals(new URL(calls[0].url).origin, "https://example.com");
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/posts/");
});
