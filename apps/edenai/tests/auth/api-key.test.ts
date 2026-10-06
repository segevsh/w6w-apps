import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { detail, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "edenai_unitTestFixtureNotARealKey000000";

Deno.test("api-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.edenai.run/v3/models",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is the account-owned async job list, not a public route", () => {
  assertEquals(PROBE_PATH, "/universal-ai/async");
});

Deno.test("api-key: test passes when the job list answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], total: 0, page: 1 } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/universal-ai/async");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: 403 Not authenticated means the key never reached the request", async () => {
  const { ctx } = mockCtx([{ status: 403, body: detail("Not authenticated") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/received no key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: 401 Invalid token is a rejected key, distinct from a missing one", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detail("Invalid token") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected the key/i.test(result.message ?? ""), result.message);
  assert(!(result.message ?? "").includes(KEY));
});

Deno.test("api-key: the verdict follows the body, not the status code alone", async () => {
  // A 403 whose body is NOT the missing-header message is a refusal, not a missing key.
  const { ctx } = mockCtx([{ status: 403, body: detail("Key suspended") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/refused this key/i.test(result.message ?? ""), result.message);
  assert((result.message ?? "").includes("Key suspended"));
});

Deno.test("api-key: a 429 and a 500 are reported without blaming the key", async () => {
  const a = await apiKey.test(
    { credential: { apiKey: KEY } },
    mockCtx([{ status: 429, body: {} }]).ctx,
  );
  assert(/rate-limited/i.test(a.message ?? ""), a.message);
  const b = await apiKey.test(
    { credential: { apiKey: KEY } },
    mockCtx([{ status: 500, body: detail("boom") }]).ctx,
  );
  assert(/HTTP 500/.test(b.message ?? "") && !/rejected/.test(b.message ?? ""), b.message);
});
