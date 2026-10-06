import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH, PROBE_QUERY } from "../../auth/api-key.ts";
import { envelope, errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "rsly_unitTestFixtureNotARealKey000000";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.raisely.com/v3/campaigns",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://api.raisely.com/v3/campaigns");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe asks for the private campaigns list, bounded to one", () => {
  assertEquals(PROBE_PATH, "/campaigns");
  assertEquals(PROBE_QUERY, "?private=true&limit=1");
});

Deno.test("api-key: test passes when the campaigns list answers with a data array", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/campaigns");
  assertEquals(queryOf(calls[0].url), { private: "true", limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: a 200 that is not the {data: [...]} envelope is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<!doctype html><title>shell</title>" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/not the API/.test(result.message ?? ""), result.message);

  const obj = mockCtx([{ body: envelope({ not: "a list" }) }]);
  assertEquals((await apiKey.test({ credential: { apiKey: KEY } }, obj.ctx)).ok, false);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a body code of unauthorized is a rejected key, with its subcode", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("unauthorized", "You must login again", "invalid token"),
  }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
  assert(/invalid token/.test(result.message ?? ""), result.message);
});

/** Classification is by the vendor's code: the same code on an unexpected status still counts. */
Deno.test("api-key: classification follows the body code, not the status", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("unauthorized", "You must login again"),
  }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a body code of forbidden is a refusal, not a bad-key verdict", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "You are not authorized to do that"),
  }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
  assert(!/rejected the API key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an unreadable error body is reported as such", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/unreadable body/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: another coded error is reported with its code", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { code: "rate limit exceeded", detail: "slow down" },
  }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 429: rate limit exceeded/.test(result.message ?? ""), result.message);
});
