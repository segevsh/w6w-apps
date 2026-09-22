import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, normaliseStoreId, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf, TEST_STORE_ID } from "../_helpers.ts";

const TOKEN = "secret_unitTestFixtureNotARealToken000";

function signedRequest(storeId: string | undefined, token: string) {
  const request = {
    url: "https://app.ecwid.com/api/v3/__storeId__/products",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  return apiKey.sign!({
    request,
    credential: { storeId, token },
  }, {} as never) as { url: string; headers: Record<string, string> };
}

Deno.test("api-key: sign stamps the bearer header and fills in the store id", () => {
  const signed = signedRequest("1003", TOKEN);
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://app.ecwid.com/api/v3/1003/products");
  // The token never reaches a URL: a workflow host logs URLs, not headers.
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders(TOKEN), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-key: sign leaves the URL alone when the store id is unusable", () => {
  // A `sign` that invented a path segment would be worse than one that leaves
  // the request to fail loudly as a 404 against `/api/v3/__storeId__/…`.
  const signed = signedRequest("acme-store", TOKEN);
  assert(signed.url.includes("__storeId__"), signed.url);
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-key: the probe is GET /profile", () => {
  assertEquals(PROBE_PATH, "/profile");
});

Deno.test("api-key: normaliseStoreId accepts only an Ecwid store id", () => {
  assertEquals(normaliseStoreId(" 1003 "), "1003");
  assertEquals(normaliseStoreId(1003), "1003");
  assertEquals(normaliseStoreId("acme.example"), undefined);
  assertEquals(normaliseStoreId(""), undefined);
  assertEquals(normaliseStoreId(undefined), undefined);
});

Deno.test("api-key: test passes when the profile answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { settings: { storeName: "Acme" } } }]);
  const result = await apiKey.test({ credential: { storeId: "1003", token: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), `/api/v3/${TEST_STORE_ID}/profile`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-key: test refuses a missing field without making a request", async () => {
  const noToken = mockCtx([]);
  assertEquals((await apiKey.test({ credential: { storeId: "1003" } }, noToken.ctx)).ok, false);
  assertEquals(noToken.calls.length, 0);

  const noStore = mockCtx([]);
  assertEquals((await apiKey.test({ credential: { token: TOKEN } }, noStore.ctx)).ok, false);
  assertEquals(noStore.calls.length, 0);
});

Deno.test("api-key: test rejects a non-numeric store id before it reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { storeId: "acme.example", token: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/not numeric/.test(result.message ?? ""), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a bodyless 403 is a rejected token — the documented exception", async () => {
  // Measured live on 2026-09-22: store 1003 answers 403 with `content-length: 0`
  // for both a missing header and a fake token.
  const { ctx } = mockCtx([{ status: 403, body: undefined }]);
  const result = await apiKey.test({ credential: { storeId: "1003", token: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/.test(result.message ?? ""), result.message);
  assert(/empty body/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: INVALID_API_TOKEN is a rejected token, INSUFFICIENT_APP_SCOPE is a scope problem", async () => {
  const invalid = mockCtx([
    { status: 403, body: errorBody("INVALID_API_TOKEN", "Invalid access token in the request.") },
  ]);
  const invalidResult = await apiKey.test(
    { credential: { storeId: "1003", token: TOKEN } },
    invalid.ctx,
  );
  assert(/rejected the token/.test(invalidResult.message ?? ""), invalidResult.message);
  assert(/INVALID_API_TOKEN/.test(invalidResult.message ?? ""), invalidResult.message);

  const scope = mockCtx([
    { status: 403, body: errorBody("INSUFFICIENT_APP_SCOPE", "no read_store_profile") },
  ]);
  const scopeResult = await apiKey.test(
    { credential: { storeId: "1003", token: TOKEN } },
    scope.ctx,
  );
  assert(/lacks the scope/.test(scopeResult.message ?? ""), scopeResult.message);
  assert(/read_store_profile/.test(scopeResult.message ?? ""), scopeResult.message);
});

Deno.test("api-key: STORE_NOT_FOUND is reported as a bad store id, whatever the status", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("STORE_NOT_FOUND", "Store not found") },
  ]);
  const result = await apiKey.test({ credential: { storeId: "999999999999", token: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/no store with id 999999999999/.test(result.message ?? ""), result.message);
  assert(/STORE_NOT_FOUND/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a suspended store is named as such, not as a bad token", async () => {
  const { ctx } = mockCtx([
    { status: 402, body: errorBody("STORE_IS_SUSPENDED", "Store with specified ID is suspended") },
  ]);
  const result = await apiKey.test({ credential: { storeId: "1003", token: TOKEN } }, ctx);
  assert(/STORE_IS_SUSPENDED/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 429 reports the vendor's own Retry-After", async () => {
  const { ctx } = mockCtx([
    { status: 429, body: undefined, headers: { "retry-after": "30" } },
  ]);
  const result = await apiKey.test({ credential: { storeId: "1003", token: TOKEN } }, ctx);
  assert(/retry after 30s/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { storeId: "1003", token: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect publishes the store name and id, nothing else", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        settings: { storeName: "Acme Widgets" },
        account: { accountEmail: "owner@acme.example", accountName: "Owner" },
      },
    },
  ]);
  const display = await apiKey.afterConnect!(
    { credential: { storeId: "1003", token: TOKEN } },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), `/api/v3/${TEST_STORE_ID}/profile`);
  assertEquals(display, { storeId: 1003, storeName: "Acme Widgets" });
  assert(!JSON.stringify(display).includes("owner@acme.example"));
});

Deno.test("api-key: afterConnect stays silent when the profile read fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: undefined }]);
  assertEquals(
    await apiKey.afterConnect!({ credential: { storeId: "1003", token: TOKEN } }, ctx),
    { storeId: 1003 },
  );
});

Deno.test("api-key: afterConnect stays silent when the profile carries no store name", async () => {
  const { ctx } = mockCtx([{ body: { settings: {} } }]);
  assertEquals(
    await apiKey.afterConnect!({ credential: { storeId: "1003", token: TOKEN } }, ctx),
    { storeId: 1003 },
  );
});
