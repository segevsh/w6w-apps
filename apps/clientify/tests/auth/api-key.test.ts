import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { detail, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: authHeaders builds `Authorization: Token <key>`", () => {
  assertEquals(authHeaders({ apiKey: "abc" }), { authorization: "Token abc" });
});

Deno.test("api-key: sign stamps the Token header onto the request", async () => {
  const request = {
    url: "https://api.clientify.net/v1/users/",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!({ request, credential: { apiKey: "k1" } }, {} as never);
  assertEquals(out.headers["authorization"], "Token k1");
});

Deno.test("api-key: test fails fast on an empty credential without a fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await apiKey.test({ credential: { apiKey: " " } }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a results envelope is a pass; probe is GET /v1/users/ with the key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: "k1" } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/users/");
  assertEquals(calls[0].headers["authorization"], "Token k1");
});

Deno.test("api-key: a bare array is also a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  assertEquals((await apiKey.test({ credential: { apiKey: "k1" } }, ctx)).ok, true);
});

Deno.test("api-key: 'Invalid token.' is classified from the body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detail("Invalid token.") }]);
  const r = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(/rejected the API key/.test(r.message ?? ""), true);
});

Deno.test("api-key: 'Api key not provided.' (a 404, not a 401) is still read from the body", async () => {
  const { ctx } = mockCtx([{ status: 404, body: detail("Api key not provided.") }]);
  const r = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(/did not receive an API key/.test(r.message ?? ""), true);
});

Deno.test("api-key: a 200 with an unrecognised body is NOT a pass", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const r = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(/Unexpected response/.test(r.message ?? ""), true);
});

Deno.test("api-key: a 500 surfaces the vendor sentence", async () => {
  const { ctx } = mockCtx([{ status: 500, body: detail("boom") }]);
  const r = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message?.includes("HTTP 500"), true);
  assertEquals(r.message?.includes("boom"), true);
});
