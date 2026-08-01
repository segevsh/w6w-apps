import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { FigmaClient } from "../../lib/client.ts";

Deno.test("client: prefixes the base URL and defaults to GET", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc" } }]);
  const client = new FigmaClient(ctx);
  await client.request("/v1/me");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.figma.com");
  assertEquals(url.pathname, "/v1/me");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new FigmaClient(ctx);
  const result = await client.request("/v1/files/f1/comments/c1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"status":404,"err":"Not found"}' },
  ]);
  const client = new FigmaClient(ctx);
  const err = await assertRejects(
    () => client.request("/v1/files/missing"),
    Error,
    "Figma 404",
  );
  assertEquals(err.message.includes("/v1/files/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new FigmaClient(ctx);
  await client.request("/v1/files/f1/nodes", {
    query: { ids: "1:2", version: undefined, depth: null, geometry: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("ids"), "1:2");
  assertEquals(url.searchParams.has("version"), false);
  assertEquals(url.searchParams.has("depth"), false);
  assertEquals(url.searchParams.has("geometry"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const client = new FigmaClient(ctx);
  await client.request("/v1/files/f1/comments", {
    method: "POST",
    body: { message: "hi" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { message: "hi" });
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new FigmaClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});
