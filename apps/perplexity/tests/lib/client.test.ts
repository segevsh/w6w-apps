import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { extractError, PerplexityClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new PerplexityClient(ctx);
  const result = await client.request("/v1/embeddings");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error carrying the vendor's error message", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      statusText: "Unauthorized",
      body: { error: { message: "Invalid API key provided.", type: "invalid_api_key", code: 401 } },
    },
  ]);
  const client = new PerplexityClient(ctx);
  const err = await assertRejects(
    () => client.request("/v1/sonar"),
    Error,
    "Perplexity 401",
  );
  assertEquals(err.message.includes("/v1/sonar"), true);
  assertEquals(err.message.includes("Invalid API key provided."), true);
  assertEquals(err.message.includes("invalid_api_key"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new PerplexityClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cmpl-1" } }]);
  const client = new PerplexityClient(ctx);
  await client.request("/v1/sonar", {
    method: "POST",
    body: { model: "sonar", messages: [{ role: "user", content: "hi" }] },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { model: "sonar", messages: [{ role: "user", content: "hi" }] },
  );
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new PerplexityClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: defaults to GET with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  const client = new PerplexityClient(ctx);
  await client.request("/v1/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

// --- extractError -----------------------------------------------------------

Deno.test("extractError: reads the vendor's error.message and error.type", async () => {
  const res = new Response(
    JSON.stringify({ error: { message: "Invalid API key provided.", type: "invalid_api_key" } }),
    { status: 401 },
  );
  assertEquals(await extractError(res), "Invalid API key provided. (invalid_api_key)");
});

Deno.test("extractError: falls back to raw text when the body isn't the expected shape", async () => {
  const res = new Response("<html>gateway error</html>", { status: 502 });
  assertEquals(await extractError(res), "<html>gateway error</html>");
});
