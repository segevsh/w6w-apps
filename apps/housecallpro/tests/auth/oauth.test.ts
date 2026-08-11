import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import oauth, { authHeaders, bearerToken } from "../../auth/oauth.ts";
import { API_ROOT, mockCtx, unauthorizedBody } from "../_helpers.ts";

const CREDENTIAL = { access_token: "d7f65570a4714ae944fbe58acc05ffb2" };

/**
 * The authorization screen and the token endpoint are on different hosts, which
 * the authentication page states twice. Getting them the same way round is the
 * whole configuration.
 */
Deno.test("oauth: authorize is on pro., token exchange is on api.", () => {
  assertEquals(oauth.oauth2?.authorizationUrl, "https://pro.housecallpro.com/oauth/authorize");
  assertEquals(oauth.oauth2?.tokenUrl, `${API_ROOT}/oauth/token`);
  assertEquals(oauth.oauth2?.refreshUrl, `${API_ROOT}/oauth/token`);
});

/**
 * The spec default for `pkce` is true. The documented flow authenticates with
 * `client_secret` and never mentions a code challenge, so leaving this unset
 * would send one the vendor has not documented accepting.
 */
Deno.test("oauth: pkce is explicitly off, matching the documented flow", () => {
  assertEquals(oauth.oauth2?.pkce, false);
});

Deno.test("oauth: only the scope the vendor demonstrates is declared", () => {
  assertEquals(oauth.oauth2?.scopes, ["public"]);
});

Deno.test("oauth: no revoke url or hook is declared — the vendor documents none", () => {
  assertEquals(oauth.oauth2?.revokeUrl, undefined);
  assertEquals(oauth.revoke, undefined);
});

Deno.test("oauth: the header prefix is Bearer, not Token", () => {
  assertEquals(authHeaders(CREDENTIAL), { authorization: `Bearer ${CREDENTIAL.access_token}` });
});

Deno.test("oauth: the bearer is read from either access_token or token", () => {
  assertEquals(bearerToken({ access_token: "a" }), "a");
  assertEquals(bearerToken({ token: "b" }), "b");
  assertEquals(bearerToken({}), "");
});

Deno.test("oauth: sign stamps the bearer and makes no request", () => {
  const { ctx, calls } = mockCtx([]);
  const request = { headers: {} as Record<string, string> };
  const signed = oauth.sign!(
    { request, credential: CREDENTIAL } as never,
    ctx as HookContext,
  ) as typeof request;

  assertEquals(signed.headers.authorization, `Bearer ${CREDENTIAL.access_token}`);
  assertEquals(calls.length, 0);
});

Deno.test("oauth: the probe is the same GET /company as the api-key method", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "co1", name: "Acme" } }]);
  const out = await oauth.test({ credential: CREDENTIAL } as never, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/company`);
  assertEquals(calls[0].headers.authorization, `Bearer ${CREDENTIAL.access_token}`);
  assertEquals(out, { ok: true });
});

Deno.test("oauth: a missing token fails without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await oauth.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth: a 401 points at the refresh flow rather than at re-consent", async () => {
  const { ctx } = mockCtx([{ status: 401, body: unauthorizedBody() }]);
  const out = await oauth.test({ credential: CREDENTIAL } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("grant_type=refresh_token"));
});

Deno.test("oauth: no failure message ever echoes the token", async () => {
  for (
    const response of [
      { status: 401, body: unauthorizedBody() },
      { status: 403, body: { message: "Forbidden" } },
      { status: 500, body: { message: "boom" } },
    ]
  ) {
    const { ctx } = mockCtx([response]);
    const out = await oauth.test({ credential: CREDENTIAL } as never, ctx);
    assert(!out.message!.includes(CREDENTIAL.access_token), `leaked in ${response.status}`);
  }
});

Deno.test("oauth: collects no user fields — the host runs the flow", () => {
  assertEquals(oauth.fields, undefined);
});
