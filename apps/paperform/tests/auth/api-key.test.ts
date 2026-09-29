import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-key: authHeaders() builds the Bearer header", () => {
  assertEquals(authHeaders({ apiKey: "abc" }), { authorization: "Bearer abc" });
});

Deno.test("api-key: sign() stamps the Authorization header and returns the request", () => {
  const request = {
    url: "https://api.paperform.co/v1/forms",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = apiKey.sign!(
    { request, credential: { apiKey: "abc" } },
    mockCtx().ctx,
  ) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer abc");
  assertEquals(out, request); // mutated and returned, not copied
});

Deno.test("api-key: test() fails fast on a missing credential, with no request made", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test() probes GET /v1/forms?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok", results: { forms: [] } } }]);
  const out = await apiKey.test({ credential: { apiKey: "good" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/v1/forms");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["authorization"], "Bearer good");
});

Deno.test("api-key: test() reports a 401 authentication failure without claiming it can tell missing from wrong", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Could not authenticate", "authentication", [
      "Please pass a valid API Key in the Bearer header",
    ]),
  }]);
  const out = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401"), true);
  assertEquals(out.message?.includes("does not distinguish"), true);
});

Deno.test("api-key: test() names the plan requirement on a 403", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Not permitted", "permission") }]);
  const out = await apiKey.test({ credential: { apiKey: "scoped" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.toLowerCase().includes("plan"), true);
});

Deno.test("api-key: test() falls back to a generic message for an unexpected status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await apiKey.test({ credential: { apiKey: "x" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("500"), true);
});

Deno.test("api-key: declares api-key as its key and bearer as its type", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
});

Deno.test("api-key: the apiKey field is type secret", () => {
  const field = apiKey.fields?.find((f) => f.key === "apiKey");
  assertEquals(field?.type, "secret");
});

Deno.test("api-key: declares no afterConnect — Paperform documents no whoami endpoint", () => {
  assertEquals(apiKey.afterConnect, undefined);
});
