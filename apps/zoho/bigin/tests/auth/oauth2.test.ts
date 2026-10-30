import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

/** The live 401 body, measured 2026-09-22 with a syntactically valid but dead token. */
const INVALID_TOKEN_BODY = {
  code: "INVALID_TOKEN",
  details: {},
  message: "invalid oauth token",
  status: "error",
};

/** The live 401 body, measured 2026-09-22 with no usable token on the request. */
const AUTHENTICATION_FAILURE_BODY = {
  code: "AUTHENTICATION_FAILURE",
  details: {},
  message: "Authentication failed",
  status: "error",
};

test("oauth2: US authorization/token endpoints, offline access so a refresh token comes back", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.zoho.com/oauth/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://accounts.zoho.com/oauth/v2/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://accounts.zoho.com/oauth/v2/token");
  assertEquals(auth.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
});

test("oauth2: requests the module, users and secure-search scopes", () => {
  assertEquals(auth.oauth2?.scopes, [
    "ZohoBigin.modules.ALL",
    "ZohoBigin.users.ALL",
    "ZohoSearch.securesearch.READ",
  ]);
});

test("sign: stamps Zoho's own auth scheme, not a bare Bearer", async () => {
  const request = {
    url: "https://www.zohoapis.com/bigin/v2/Contacts",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "t" } }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], "Zoho-oauthtoken t");
});

test("test: fails fast when the credential carries no access token", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
});

test("test: probes the cheapest authenticated call on the recorded api_domain", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: "1", full_name: "Sarah" }] } }]);
  const result = await auth.test(
    { credential: { accessToken: "t", apiDomain: "https://www.zohoapis.eu" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://www.zohoapis.eu/bigin/v2/users?type=CurrentUser");
  assertEquals(calls[0].headers["authorization"], "Zoho-oauthtoken t");
});

test("test: accepts either spelling of the api domain field", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: "1" }] } }]);
  assertEquals(
    await auth.test(
      { credential: { accessToken: "t", api_domain: "https://www.zohoapis.ca" } },
      ctx,
    ),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://www.zohoapis.ca/bigin/v2/users?type=CurrentUser");
});

test("test: falls back to the US host when the credential names no domain", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: "1" }] } }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://www.zohoapis.com/bigin/v2/users?type=CurrentUser");
});

test("test: refuses a 200 that does not carry the documented users array", async () => {
  const { ctx } = mockCtx([{ body: { message: "something else" } }]);
  const result = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("users"), "message should name the missing shape");
});

test("test: classifies a dead token from the body's code, not the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: INVALID_TOKEN_BODY }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("INVALID_TOKEN"), result.message);
});

test("test: distinguishes 'no usable token' from 'dead token'", async () => {
  const { ctx } = mockCtx([{ status: 401, body: AUTHENTICATION_FAILURE_BODY }]);
  const result = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("AUTHENTICATION_FAILURE"), result.message);
});

test("test: names the scope when the vendor reports a scope mismatch", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { code: "OAUTH_SCOPE_MISMATCH", message: "scope mismatch" } },
  ]);
  const result = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assert(result.message?.includes("ZohoBigin.users.READ"), result.message);
});

test("test: falls back to the status and code for an unrecognised error body", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { code: "INTERNAL_ERROR" } }]);
  const result = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(result, {
    ok: false,
    message: "Bigin returned HTTP 500 (INTERNAL_ERROR) for /users?type=CurrentUser",
  });
});

test("afterConnect: lifts api_domain and the calling user's name onto the connection", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: "u1", full_name: "Sarah Johnson" }] } }]);
  const out = await auth.afterConnect!(
    { credential: { accessToken: "t", api_domain: "https://www.zohoapis.in" } },
    ctx,
  );
  assertEquals(out, {
    apiDomain: "https://www.zohoapis.in",
    user: { id: "u1", name: "Sarah Johnson" },
  });
  assertEquals(calls[0].url, "https://www.zohoapis.in/bigin/v2/users?type=CurrentUser");
});

test("afterConnect: still records the api domain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: INVALID_TOKEN_BODY }]);
  const out = await auth.afterConnect!(
    { credential: { accessToken: "t", apiDomain: "https://www.zohoapis.com" } },
    ctx,
  );
  assertEquals(out, { apiDomain: "https://www.zohoapis.com" });
});

test("afterConnect: no-ops when the credential carries no api domain at all", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx), {});
});
