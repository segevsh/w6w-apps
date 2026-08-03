import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding";
import { mockCtx } from "../_helpers.ts";
import auth, { basicHeader } from "../../auth/api-key.ts";

const cred = { site: "acme", apiKey: "live_testkey123" };
const expected = `Basic ${encodeBase64(`${cred.apiKey}:`)}`;
const CONFIG_URL = "https://acme.chargebee.com/api/v2/configurations";

const configBody = (version = "v2") => ({
  configurations: [{ domain: "acme", object: "configuration", product_catalog_version: version }],
});

// ------------------------------------------------------------ the wire format --

/**
 * Chargebee's own Node client states the wire value as code, which is the least
 * ambiguous form the vendor publishes:
 *
 *   `Authorization: 'Basic ' + Buffer.from(env.apiKey + ':').toString('base64')`
 *
 * and every curl sample in the reference writes `-u {site_api_key}:` with the
 * bare trailing colon. That colon is the whole subtlety.
 */
Deno.test("api-key: the encoded payload is `key:` — key as username, EMPTY password", () => {
  const decoded = atob(basicHeader(cred.apiKey).slice("Basic ".length));
  assertEquals(decoded, "live_testkey123:");
  // The colon must be present and must be LAST: everything after it is the
  // password, and Chargebee requires that to be empty.
  assertEquals(decoded.indexOf(":"), decoded.length - 1);
  assertEquals(decoded.split(":")[1], "");
});

Deno.test("api-key: base64 of `key` WITHOUT the trailing colon is a different, wrong header", () => {
  // Guards the single most likely regression: dropping the colon still produces
  // a syntactically valid Basic header, which Chargebee rejects with a 401.
  assert(basicHeader(cred.apiKey) !== `Basic ${encodeBase64(cred.apiKey)}`);
});

Deno.test("api-key: reproduces base64(`key:`) for a known vector", () => {
  // `test_key:` -> dGVzdF9rZXk6
  assertEquals(basicHeader("test_key"), "Basic dGVzdF9rZXk6");
  assertEquals(atob("dGVzdF9rZXk6"), "test_key:");
});

// ----------------------------------------------------------------- declaration --

Deno.test("api-key: declares the site plus one secret field, and the basic wire type", () => {
  assertEquals(auth.key, "api-key");
  // Basic is genuinely what goes over the wire, even though the credential is an
  // API key — `ApiKeyConfig` cannot express base64(`key:`).
  assertEquals(auth.type, "basic");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["site", "apiKey"]);
  assertEquals(fields[0].type, "string");
  assertEquals(fields[0].required, true);
  assertEquals(fields[1].type, "secret");
  assertEquals(fields[1].required, true);
  // No password field: the password is fixed empty by the protocol, so
  // prompting for one would only invite a wrong answer.
  assertEquals(fields.length, 2);
});

Deno.test("api-key: the site field explains that a test site is a separate site", () => {
  const site = (auth.fields ?? []).find((f) => f.key === "site")!;
  assert(/-test/.test(site.hint ?? ""), "site hint should name the `-test` convention");
});

// ------------------------------------------------------------------------ sign --

Deno.test("api-key: sign stamps the Basic header and returns the request", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], expected);
});

Deno.test("api-key: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred },
    ctx,
  );
  assertEquals(calls.length, 0);
});

// ------------------------------------------------------------------------ test --

Deno.test("api-key: test probes GET /configurations on the connection's own site", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: configBody() }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, CONFIG_URL);
  assertEquals(calls[0].headers["authorization"], expected);
});

Deno.test("api-key: test hits the site the credential names, not a fixed host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: configBody() }]);
  await auth.test({ credential: { site: "other-test", apiKey: "k" } }, ctx);
  assertEquals(calls[0].url, "https://other-test.chargebee.com/api/v2/configurations");
});

Deno.test("api-key: test accepts a pasted base URL as the site", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: configBody() }]);
  await auth.test(
    { credential: { site: "https://acme.chargebee.com/api/v2", apiKey: "k" } },
    ctx,
  );
  assertEquals(calls[0].url, CONFIG_URL);
});

Deno.test("api-key: test fails without a network call when a field is missing", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test({ credential: {} }, ctx)).ok, false);
  assertEquals((await auth.test({ credential: { site: "acme" } }, ctx)).ok, false);
  assertEquals((await auth.test({ credential: { apiKey: "k" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test rejects a site name that is not a single label, without calling out", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { site: "evil.example.com", apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("not a Chargebee site name"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports a 401 as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "unauthorized" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: test reports a 404 as a wrong site name, not a bad key", async () => {
  // The two failures look identical to a user and have completely different fixes.
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await auth.test({ credential: { site: "nosuch", apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("nosuch"));
  assert(/site name/i.test(result.message ?? ""));
});

Deno.test("api-key: test surfaces Chargebee's own message on other failures", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Sorry, The request is blocked" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Sorry, The request is blocked");
});

Deno.test("api-key: test falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500"));
});

Deno.test("api-key: test connects a Product Catalog 1.0 site but says what will not work", async () => {
  // Half this App's surface does not exist on PC 1.0; a 404 much later is a
  // worse answer than a sentence now.
  const { ctx } = mockCtx([{ status: 200, body: configBody("v1") }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assert((result.message ?? "").includes("Product Catalog v1"));
  assert(/subscription and catalog actions/i.test(result.message ?? ""));
});

Deno.test("api-key: test says nothing extra on a Product Catalog 2.0 site", async () => {
  const { ctx } = mockCtx([{ status: 200, body: configBody("v2") }]);
  assertEquals(await auth.test({ credential: cred }, ctx), { ok: true });
});

// ---------------------------------------------------------------- afterConnect --

Deno.test("afterConnect: publishes site, domain and catalog version — never the key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: configBody("v2") }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, CONFIG_URL);
  assertEquals(display.site, "acme");
  assertEquals(display.domain, "acme");
  assertEquals(display.productCatalogVersion, "v2");
  // Nothing about the credential may reach the Connection's display data.
  assertEquals(JSON.stringify(display).includes(cred.apiKey), false);
});

Deno.test("afterConnect: normalises a pasted URL down to the bare site name", async () => {
  const { ctx } = mockCtx([{ status: 200, body: configBody() }]);
  const display = await auth.afterConnect!(
    { credential: { site: "https://acme-test.chargebee.com/api/v2", apiKey: "k" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.site, "acme-test");
});

Deno.test("afterConnect: still records the site when the probe fails", async () => {
  // The site is what `lib/client.ts` needs; losing it would break every action.
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.site, "acme");
  assertEquals(display.productCatalogVersion, undefined);
});

Deno.test("afterConnect: degrades without a network call on a malformed site", async () => {
  const { ctx, calls } = mockCtx();
  const display = await auth.afterConnect!(
    { credential: { site: "evil.example.com", apiKey: "k" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 0);
  assertEquals(display.site, "evil.example.com");
});
