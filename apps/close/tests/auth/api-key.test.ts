import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding";
import { mockCtx } from "../_helpers.ts";
import auth, { basicHeader } from "../../auth/api-key.ts";

const cred = { apiKey: "api_testkey123" };

/**
 * Close's documentation publishes an exact wire vector, and it is the best
 * possible test for this hook because it pins the one subtle part — the
 * trailing colon standing in for the empty password:
 *
 *   > `curl https://api.close.com/api/v1/me/ -u yourapikey:`
 *   > This results in the header `Authorization: Basic eW91cmFwaWtleTo=` ...
 *   > base64-encoded string `yourapikey:` is `eW91cmFwaWtleTo=`
 */
const VENDOR_KEY = "yourapikey";
const VENDOR_HEADER = "Basic eW91cmFwaWtleTo=";

const expected = `Basic ${encodeBase64(`${cred.apiKey}:`)}`;

Deno.test("api-key: reproduces Close's own published Authorization vector exactly", () => {
  assertEquals(basicHeader(VENDOR_KEY), VENDOR_HEADER);
});

Deno.test("api-key: the encoded payload is `key:` — key as username, EMPTY password", () => {
  const encoded = basicHeader(cred.apiKey).slice("Basic ".length);
  const decoded = atob(encoded);
  assertEquals(decoded, "api_testkey123:");
  // The colon must be present and must be last: everything after it is the
  // password, and Close requires that to be empty.
  assertEquals(decoded.indexOf(":"), decoded.length - 1);
  assertEquals(decoded.split(":")[1], "");
});

Deno.test("api-key: base64 of `key` WITHOUT the trailing colon is a different, wrong header", () => {
  // Guards the single most likely regression: dropping the colon still produces
  // a syntactically valid Basic header, which Close rejects.
  assert(basicHeader(VENDOR_KEY) !== `Basic ${encodeBase64(VENDOR_KEY)}`);
});

Deno.test("api-key: declares one secret field and the basic wire type", () => {
  assertEquals(auth.key, "api-key");
  // Basic is genuinely what goes over the wire, even though the credential is an
  // API key — `ApiKeyConfig` cannot express base64(`key:`).
  assertEquals(auth.type, "basic");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
  // No password field: the password is fixed empty by the protocol, so
  // prompting for one would only invite a wrong answer.
  assertEquals(fields.length, 1);
});

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

Deno.test("api-key: test probes GET /me/ with the credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1", email: "a@b.com" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.close.com/api/v1/me/");
  assertEquals(calls[0].headers["authorization"], expected);
});

Deno.test("api-key: test fails without a network call when the key is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports a 401 as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "authentication required" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: test surfaces Close's own error message on other failures", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "insufficient permissions" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "insufficient permissions");
});

Deno.test("api-key: test falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500"));
});

Deno.test("afterConnect: publishes user and organization display data, never the key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      id: "user_1",
      email: "anthony@close.com",
      first_name: "Anthony",
      last_name: "Nemitz",
      organizations: [{ id: "orga_1", name: "Bluth Company" }],
    },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.close.com/api/v1/me/");
  assertEquals((display.user as Record<string, unknown>).email, "anthony@close.com");
  assertEquals((display.user as Record<string, unknown>).name, "Anthony Nemitz");
  assertEquals((display.organization as Record<string, unknown>).name, "Bluth Company");
  // Nothing about the credential may reach the Connection's display data.
  assertEquals(JSON.stringify(display).includes(cred.apiKey), false);
});

Deno.test("afterConnect: falls back to memberships for the organization id", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { id: "user_1", memberships: [{ organization_id: "orga_9" }] },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals((display.organization as Record<string, unknown>).id, "orga_9");
});

Deno.test("afterConnect: degrades to empty display data rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx);
  assertEquals(display, {});
});
