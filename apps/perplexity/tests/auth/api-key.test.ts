import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "pplx-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer pplx-abc");
});

Deno.test("api-key: test hits /v1/models and reports ok on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "list", data: [] } }]);
  const result = await auth.test({ credential: { apiKey: "pplx-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.perplexity.ai");
  assertEquals(url.pathname, "/v1/models");
  assertEquals(calls[0].headers["authorization"], "Bearer pplx-abc");
});

/**
 * Perplexity's `/v1/models` is documented `security: []` but the live API
 * 401s an unauthenticated or bogus request exactly like every other endpoint
 * (measured 2026-08-16) — this is what makes it usable as a probe at all.
 */
Deno.test("api-key: test reports failure with the vendor's error type on rejection", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { error: { message: "Invalid API key provided.", type: "invalid_api_key", code: 401 } },
    },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"), result.message);
  assert(result.message?.includes("invalid_api_key"), result.message);
});

Deno.test("api-key: test reports failure when the credential is missing, without a request", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0, "must not fetch without a credential to send");
});
