import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "wap_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps x-api-key and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.wappalyzer.com/v2/lookup/",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["x-api-key"], KEY);
  assertEquals(Object.keys(signed.headers), ["x-api-key"]);
  assertEquals(signed.url, "https://api.wappalyzer.com/v2/lookup/");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { "x-api-key": KEY });
});

Deno.test("api-key: the probe is the free credits-balance endpoint", () => {
  assertEquals(PROBE_PATH, "/credits/balance/");
});

Deno.test("api-key: test passes when the balance endpoint answers with a numeric credits field", async () => {
  const { ctx, calls } = mockCtx([{ body: { credits: 100000 } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/credits/balance/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-api-key"], KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Confirmed live on 2026-09-29: a missing key, a wrong key, and a bearer-style
 * `Authorization` header all answer the byte-identical 403. `test` must not
 * invent a distinction the API does not make.
 */
Deno.test("api-key: a 403 is reported honestly as covering three indistinguishable causes", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden") }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/missing, incorrect, or the account has run out of credits/i.test(result.message ?? ""));
});

Deno.test("api-key: a 429 is reported as a rate limit, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/rate-limited/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 200 with no numeric credits field fails, not silently ok", async () => {
  const { ctx } = mockCtx([{ body: { message: "wrong shape" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: credential field is declared secret; the header is x-api-key with no prefix", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(apiKey.apiKey?.in, "header");
  assertEquals(apiKey.apiKey?.name, "x-api-key");
});
