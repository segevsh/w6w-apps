import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { extractError, OpenRouterClient } from "../../lib/client.ts";

test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new OpenRouterClient(ctx);
  const result = await client.request("/embeddings");
  assertEquals(result, undefined);
});

test("client: throws a descriptive Error carrying the vendor's error message", async () => {
  const { ctx } = mockCtx([
    {
      status: 429,
      statusText: "Too Many Requests",
      body: {
        error: {
          code: 429,
          message: "Rate limit exceeded",
          metadata: { error_type: "rate_limit_exceeded" },
        },
      },
    },
  ]);
  const client = new OpenRouterClient(ctx);
  const err = await assertRejects(
    () => client.request("/chat/completions"),
    Error,
    "OpenRouter 429",
  );
  assertEquals(err.message.includes("/chat/completions"), true);
  assertEquals(err.message.includes("Rate limit exceeded"), true);
  assertEquals(err.message.includes("rate_limit_exceeded"), true);
});

test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new OpenRouterClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "gen-1" } }]);
  const client = new OpenRouterClient(ctx);
  await client.request("/chat/completions", {
    method: "POST",
    body: { model: "openai/gpt-5.2", messages: [{ role: "user", content: "hi" }] },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { model: "openai/gpt-5.2", messages: [{ role: "user", content: "hi" }] },
  );
});

test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new OpenRouterClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

test("client: defaults to GET with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new OpenRouterClient(ctx);
  await client.request("/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

// --- extractError -----------------------------------------------------------

test("extractError: reads the vendor's error.message and error.metadata.error_type", async () => {
  const res = new Response(
    JSON.stringify({
      error: { code: 401, message: "Invalid credentials", metadata: { error_type: "auth_error" } },
    }),
    { status: 401 },
  );
  assertEquals(await extractError(res), "Invalid credentials (auth_error)");
});

test("extractError: reads error.message alone when there is no metadata", async () => {
  const res = new Response(
    JSON.stringify({ error: { code: 400, message: "Bad Request" } }),
    { status: 400 },
  );
  assertEquals(await extractError(res), "Bad Request");
});

test("extractError: falls back to raw text when the body isn't the expected shape", async () => {
  const res = new Response("<html>gateway error</html>", { status: 502 });
  assertEquals(await extractError(res), "<html>gateway error</html>");
});
