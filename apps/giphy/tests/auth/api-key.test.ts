import { assert, assertEquals } from "@std/assert";
import apiKey, { PROBE_PATH, probeRequest } from "../../auth/api-key.ts";
import { envelope, giphyError, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** A syntactically plausible, entirely fake key. */
const KEY = "giphy_unitTestFixtureNotARealKey000000";

Deno.test("api-key: sign merges api_key into the query without disturbing existing params", () => {
  const signed = apiKey.sign!({
    request: {
      method: "GET",
      url: "https://api.giphy.com/v1/gifs/search?q=happy%20dance&limit=5",
      headers: {},
    },
    credential: { apiKey: KEY },
  }, {} as never) as { url: string; headers: Record<string, string> };

  const url = new URL(signed.url);
  assertEquals(url.pathname, "/v1/gifs/search");
  // The action's own parameters survive...
  assertEquals(url.searchParams.get("q"), "happy dance");
  assertEquals(url.searchParams.get("limit"), "5");
  // ...and the key arrives as GIPHY's documented query parameter.
  assertEquals(url.searchParams.get("api_key"), KEY);
  // No doubled `?`, and no header was invented for it.
  assertEquals(signed.url.includes("?api_key"), false);
  assertEquals("authorization" in signed.headers, false);
});

Deno.test("api-key: sign works on a URL that has no query string at all", () => {
  const signed = apiKey.sign!({
    request: { method: "GET", url: "https://api.giphy.com/v1/gifs/trending", headers: {} },
    credential: { apiKey: KEY },
  }, {} as never) as { url: string };

  assertEquals(queryOf(signed.url), { api_key: KEY });
});

Deno.test("api-key: sign overwrites an api_key already present rather than repeating it", () => {
  const signed = apiKey.sign!({
    request: {
      method: "GET",
      url: "https://api.giphy.com/v1/gifs/trending?api_key=stale",
      headers: {},
    },
    credential: { apiKey: KEY },
  }, {} as never) as { url: string };

  const params = new URL(signed.url).searchParams;
  assertEquals(params.getAll("api_key"), [KEY]);
});

Deno.test("api-key: the wire format declares api_key in the query", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "query", name: "api_key" });
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});

/** The cheapest documented call, pinned here so a "shorter" probe cannot slip in. */
Deno.test("api-key: the probe is GET /v1/gifs/trending?limit=1", () => {
  assertEquals(PROBE_PATH, "/gifs/trending");
  const request = probeRequest();
  assertEquals(pathOf(request.url), "/v1/gifs/trending");
  assertEquals(queryOf(request.url), { limit: "1" });
});

Deno.test("api-key: test passes when GIPHY's body says meta.status 200", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/gifs/trending");
  // The probe is signed by the same hook the actions are: the key is in the
  // query string, and it is the only place it appears.
  assertEquals(queryOf(calls[0].url), { limit: "1", api_key: KEY });
  assertEquals("authorization" in calls[0].headers, false);
});

/**
 * The single most important property of this probe: GIPHY can answer HTTP 200
 * while its body says 401. Classifying on `res.ok` would call that key live.
 */
Deno.test("api-key: a body that says 401 fails even when the HTTP status is 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: giphyError(401, "Unauthorized") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
  assert(result.message?.includes("Unauthorized"), result.message);
});

Deno.test("api-key: the message never echoes the credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: giphyError(401, "Unauthorized") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assertEquals((result.message ?? "").includes(KEY), false);
});

Deno.test("api-key: a 429 is reported as rate limiting, not as a bad key", async () => {
  const { ctx } = mockCtx([{ status: 429, body: giphyError(429, "Too Many Requests") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/rate-limited/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an unreadable body is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a missing credential fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
