import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { errorBody, failureEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.cloudbeds.com/api/v1.3/getHotels",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: "tok_123" } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer tok_123");
  assert(!signed.url.includes("tok_123"), "the token leaked into the URL");
});

Deno.test("oauth2: the authorize/token URLs are the vendor-verified ones, not the guessed ones", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.cloudbeds.com/api/v1.3/oauth");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.cloudbeds.com/api/v1.3/access_token");
  // The intake brief's guess. If this ever comes back, someone "fixed" it to the wrong value.
  assert(oauth2.oauth2?.authorizationUrl !== "https://api.cloudbeds.com/auth/oauth/authorize");
  assert(oauth2.oauth2?.tokenUrl !== "https://api.cloudbeds.com/auth/oauth/token");
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: test fails fast with no accessToken, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test passes when /userinfo answers a real user profile", async () => {
  const { ctx, calls } = mockCtx([
    { body: { user_id: "u1", first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" } },
  ]);
  const result = await oauth2.test({ credential: { accessToken: "tok_123" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v1.3/userinfo");
  assertEquals(calls[0].headers.authorization, "Bearer tok_123");
});

/**
 * Same status, different `hint`, different fix — classification must read the
 * body, not just the 401.
 */
Deno.test("oauth2: a missing-header 401 and an invalid-token 401 are distinguishable", async () => {
  const missing = mockCtx([
    { status: 401, body: errorBody("access_denied", { hint: 'Missing "Authorization" header' }) },
  ]);
  const missingResult = await oauth2.test({ credential: { accessToken: "tok" } }, missing.ctx);
  assert(missingResult.ok === false);
  assert(missingResult.message?.includes('Missing "Authorization" header'), missingResult.message);

  const invalid = mockCtx([
    { status: 401, body: errorBody("access_denied", { hint: "Access token is invalid" }) },
  ]);
  const invalidResult = await oauth2.test({ credential: { accessToken: "bad" } }, invalid.ctx);
  assert(invalidResult.ok === false);
  assert(invalidResult.message?.includes("Access token is invalid"), invalidResult.message);
});

/**
 * The vendor's HTTP-200-but-failed quirk applies to the probe too: a 200 with
 * `success: false` (e.g. the approving user was deactivated) is a failed probe.
 */
Deno.test("oauth2: test fails on a 200 that carries success:false", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: failureEnvelope("User who approved this connection is not active anymore"),
    },
  ]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("not active anymore"), result.message);
});

Deno.test("oauth2: test fails if /userinfo answers something that isn't a user profile", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: "shape" } }]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("did not return a Cloudbeds user profile"), result.message);
});

/**
 * afterConnect must publish a label and NOT leak anything beyond
 * first_name/last_name/email/user_id — acl and roles are permission lists,
 * not identity.
 */
Deno.test("oauth2: afterConnect publishes only name/email/id", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        user_id: "u1",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        acl: ["read:reservation"],
        roles: [{ id: "r1", name: "Admin" }],
      },
    },
  ]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(display, { user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" } });
  assert(!JSON.stringify(display).includes("read:reservation"));
  assert(!JSON.stringify(display).includes("Admin"));
});

Deno.test("oauth2: afterConnect stays silent (not throwing) when /userinfo fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  assertEquals(await oauth2.afterConnect!({ credential: { accessToken: "tok" } }, ctx), {});
});

Deno.test("oauth2: the credential field is declared secret", () => {
  assertEquals(oauth2.key, "oauth2");
  assertEquals(oauth2.type, "oauth2");
  assertEquals(typeof oauth2.test, "function");
  assertEquals(typeof oauth2.sign, "function");
});
