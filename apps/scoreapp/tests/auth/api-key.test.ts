import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH, PROBE_URL } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf, UNAUTHENTICATED_BODY } from "../_helpers.ts";

const KEY = "scoreapp_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://open-api.scoreapp.com/scorecards",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  // ScoreApp documents no query-parameter form of the key, and this app never
  // builds one: a workflow host logs request URLs and does not log headers.
  assertEquals(signed.url, "https://open-api.scoreapp.com/scorecards");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is the cheapest documented path, and the same call the quota check makes", () => {
  assertEquals(PROBE_PATH, "/scorecards");
  assertEquals(PROBE_URL, "https://open-api.scoreapp.com/scorecards?limit=1");
});

Deno.test("api-key: test passes when the scorecards list answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/scorecards");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
  // Without this the API answers a 302 to its login page instead of JSON.
  assertEquals(calls[0].headers.accept, "application/json");
  assert(!calls[0].url.includes(KEY));
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);

  assertEquals((await apiKey.test({ credential: {} }, ctx)).ok, false);
  assertEquals((await apiKey.test({ credential: { apiKey: "   " } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The documented auth failure: 401 plus `{"error":"Unauthenticated."}`. */
Deno.test("api-key: the documented 401 body is reported as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHENTICATED_BODY }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/.test(result.message ?? ""), result.message);
  assert(/Unauthenticated\./.test(result.message ?? ""), result.message);
  // The fix lives in the message: the key is regenerated, not looked up.
  assert(/Account settings > API keys/.test(result.message ?? ""), result.message);
});

/**
 * A 401 that does NOT carry the documented body is a different failure — this app
 * must not tell someone to regenerate a key on the strength of it.
 */
Deno.test("api-key: a 401 without the documented body is not reported as a revoked key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Something unexpected") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(!/rejected the API key/.test(result.message ?? ""), result.message);
  assert(/unexpected refusal/.test(result.message ?? ""), result.message);
  assert(/Something unexpected/.test(result.message ?? ""), result.message);
});

/**
 * The trap, made operational: Laravel answers a request that does not ask for
 * JSON with a redirect to its login page. Reported as what it is.
 */
Deno.test("api-key: a redirect is named as the missing-Accept trap, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 302, headers: { location: "/login" }, body: "" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 302/.test(result.message ?? ""), result.message);
  assert(/Accept: application\/json/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 422 is reported as a validation error, never as an auth failure", async () => {
  const { ctx } = mockCtx([
    { status: 422, body: errorBody("The limit must be an integer.") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/422/.test(result.message ?? ""), result.message);
  assert(/not a credential problem/.test(result.message ?? ""), result.message);
  assert(/The limit must be an integer/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 429 is reported against the live rate-limit headers", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody("Too Many Requests") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/rate-limited/.test(result.message ?? ""), result.message);
  assert(/x-ratelimit-limit/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
  assert(!/rejected the API key/.test(result.message ?? ""), result.message);
});

/** The article documents no account-identity endpoint, so no label is invented. */
Deno.test("api-key: there is no afterConnect and no connectionLabel", () => {
  assertEquals(apiKey.afterConnect, undefined);
  assertEquals(apiKey.connectionLabel, undefined);
  assertEquals(apiKey.fields?.[0].type, "secret");
});
