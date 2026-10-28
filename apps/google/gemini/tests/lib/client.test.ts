import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { GeminiClient, modelResource } from "../../lib/client.ts";

Deno.test("client: JSON body sets content-type and stringifies", async () => {
  const { ctx, calls } = mockCtx([{ body: { candidates: [] } }]);
  const client = new GeminiClient(ctx);
  await client.request("/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    body: { contents: [] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ contents: [] }));
});

Deno.test("client: GET request carries no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { models: [] } }]);
  const client = new GeminiClient(ctx);
  await client.request("/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new GeminiClient(ctx);
  const result = await client.request("/models/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      statusText: "Bad Request",
      body: '{"error":{"status":"INVALID_ARGUMENT","message":"bad"}}',
    },
  ]);
  const client = new GeminiClient(ctx);
  const err = await assertRejects(
    () => client.request("/models/x:generateContent", { method: "POST", body: {} }),
    Error,
    "Gemini 400",
  );
  assertEquals(err.message.includes(":generateContent"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GeminiClient(ctx);
  await client.request("/models", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("modelResource: leaves an already-qualified name alone", () => {
  assertEquals(modelResource("models/gemini-3.5-flash"), "models/gemini-3.5-flash");
});

Deno.test("modelResource: prefixes a bare model id", () => {
  assertEquals(modelResource("gemini-3.5-flash"), "models/gemini-3.5-flash");
});
