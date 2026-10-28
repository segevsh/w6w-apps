import { assert, assertEquals } from "@std/assert";
import oauth2, { AUTHORIZATION_URL, SCOPES, TOKEN_URL } from "../../auth/oauth2.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const auth = oauth2 as any;

Deno.test("oauth2: authorizes against login.microsoftonline.com/organizations with PKCE", () => {
  assertEquals(
    AUTHORIZATION_URL,
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
  );
  assertEquals(TOKEN_URL, "https://login.microsoftonline.com/organizations/oauth2/v2.0/token");
  assertEquals(oauth2.oauth2?.pkce, true);
  assertEquals(oauth2.oauth2?.scopes, SCOPES);
  assertEquals(oauth2.oauth2?.extraAuthParams, undefined);
  assert(SCOPES.includes("offline_access"));
});

Deno.test("oauth2: sign stamps the bearer token and nothing else", () => {
  const request = { url: "https://graph.microsoft.com/v1.0/users", method: "GET", headers: {} };
  const out = auth.sign({ request, credential: { accessToken: "tok" } });
  assertEquals(out.headers.authorization, "Bearer tok");
});

Deno.test("oauth2: test passes on a 200 from /me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const res = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, "https://graph.microsoft.com/v1.0/me");
});

Deno.test("oauth2: test classifies a failure by Graph's error code, not the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "InvalidAuthenticationToken", message: "expired" } },
  }]);
  const res = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message.includes("InvalidAuthenticationToken"));
  assert(!res.message.includes("tok"), "message must not echo the credential");
});

Deno.test("oauth2: test reports an unrecognised failure body honestly", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const res = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message.includes("unrecognised"));
});

Deno.test("oauth2: test refuses a credential without an access token", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test({ credential: {} }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect labels the connection from /me, preferring mail over UPN", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: "Adele Vance", mail: null, userPrincipalName: "adele@c.com" },
  }]);
  const out = await auth.afterConnect({}, ctx);
  assertEquals(out.user, { id: "u1", email: "adele@c.com", name: "Adele Vance" });
});

Deno.test("oauth2: afterConnect tolerates a failing /me", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.afterConnect({}, ctx), {});
});
