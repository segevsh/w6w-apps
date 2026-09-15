import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { basicHeader } from "../../auth/api-key.ts";
import { ACCEPT_HEADER } from "../../lib/client.ts";

const cred = { apiKey: "live_testkey123", region: "us" as const };

function decodeBasic(header: string): string {
  return atob(header.slice("Basic ".length));
}

// ------------------------------------------------------------ the wire format --

Deno.test("api-key: the encoded payload is `key:` — key as username, EMPTY password", () => {
  const decoded = decodeBasic(basicHeader(cred.apiKey));
  assertEquals(decoded, "live_testkey123:");
  assertEquals(decoded.indexOf(":"), decoded.length - 1);
  assertEquals(decoded.split(":")[1], "");
});

Deno.test("api-key: base64 of the key WITHOUT the trailing colon is a different, wrong header", () => {
  assert(basicHeader(cred.apiKey) !== `Basic ${btoa(cred.apiKey)}`);
});

Deno.test("api-key: reproduces base64(`key:`) for a known vector", () => {
  assertEquals(basicHeader("test_key"), "Basic dGVzdF9rZXk6");
  assertEquals(atob("dGVzdF9rZXk6"), "test_key:");
});

// ----------------------------------------------------------------- declaration --

Deno.test("api-key: declares one secret field and a region select, and the basic wire type", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey", "region"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
  assertEquals(fields[1].type, "select");
  assertEquals(fields[1].default, "us");
  // No password field: the password is fixed empty by the protocol.
  assertEquals(fields.length, 2);
});

Deno.test("api-key: region offers exactly the two documented data-center hosts", () => {
  const region = (auth.fields ?? []).find((f) => f.key === "region")!;
  const options = region.options;
  assert(Array.isArray(options));
  assertEquals(options.map((o) => o.value), ["us", "eu"]);
});

// ------------------------------------------------------------------------ sign --

Deno.test("api-key: sign stamps the Basic header and returns the request", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], basicHeader(cred.apiKey));
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

const listBody = (subdomain = "acme") => ({
  object: "list",
  data: [{ subdomain, mode: "production" }],
});

Deno.test("api-key: test probes GET /sites on the global host by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody() }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://v3.recurly.com/sites");
  assertEquals(calls[0].headers["authorization"], basicHeader(cred.apiKey));
  assertEquals(calls[0].headers["accept"], ACCEPT_HEADER);
});

Deno.test("api-key: test probes the EU host when region is eu", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody() }]);
  await auth.test({ credential: { apiKey: "k", region: "eu" } }, ctx);
  assertEquals(calls[0].url, "https://v3.eu.recurly.com/sites");
});

Deno.test("api-key: test fails without a network call when apiKey is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test classifies a 401 by the error body's `type`, not the bare status", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { type: "invalid_api_key", message: "Invalid API key." } },
  ]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").toLowerCase().includes("rejected"));
});

Deno.test("api-key: test surfaces the vendor's own message for a non-auth error type", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { type: "validation", message: "Something else was wrong." } },
  ]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Something else was wrong.");
});

Deno.test("api-key: test falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500"));
});

Deno.test("api-key: test rejects a response that is not the documented list envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { unexpected: true } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert(/did not return a list|unexpected/i.test(result.message ?? ""));
});

Deno.test("api-key: test rejects a key with no associated site", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { object: "list", data: [] } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert(/not associated with any/i.test(result.message ?? ""));
});

Deno.test("api-key: test never echoes the raw API key back in its message", async () => {
  const { ctx } = mockCtx([{ status: 200, body: listBody() }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(JSON.stringify(result).includes(cred.apiKey), false);
});

// ---------------------------------------------------------------- afterConnect --

Deno.test("afterConnect: publishes region and subdomain — never the key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody("widgets-inc") }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://v3.recurly.com/sites");
  assertEquals(display.region, "us");
  assertEquals(display.subdomain, "widgets-inc");
  assertEquals(JSON.stringify(display).includes(cred.apiKey), false);
});

Deno.test("afterConnect: defaults region to us when omitted", async () => {
  const { ctx } = mockCtx([{ status: 200, body: listBody() }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "k" } }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(display.region, "us");
});

Deno.test("afterConnect: still records the region when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.region, "us");
  assertEquals(display.subdomain, undefined);
});

Deno.test("afterConnect: degrades without a network call when apiKey is missing", async () => {
  const { ctx, calls } = mockCtx();
  const display = await auth.afterConnect!({ credential: { region: "eu" } }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 0);
  assertEquals(display.region, "eu");
});
