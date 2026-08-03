import { assert, assertEquals } from "@std/assert";
import auth, { AUTHORIZATION_URL, SCOPES, TOKEN_URL } from "../../auth/oauth2.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("oauth2: declares an oauth2 method with PKCE", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.pkce, true);
  assertEquals(auth.oauth2?.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(auth.oauth2?.tokenUrl, TOKEN_URL);
});

Deno.test("oauth2: targets the `organizations` tenant, not `common`", () => {
  // The Excel API does not serve consumer OneDrive and the permissions tables
  // say "Delegated (personal Microsoft account): Not supported", so `common`
  // would let a personal account consent and then fail on the first real call.
  assert(AUTHORIZATION_URL.includes("/organizations/"), AUTHORIZATION_URL);
  assert(TOKEN_URL.includes("/organizations/"), TOKEN_URL);
  assert(!AUTHORIZATION_URL.includes("/common/"), AUTHORIZATION_URL);
});

Deno.test("oauth2: uses the Microsoft identity platform v2.0 endpoints", () => {
  assert(AUTHORIZATION_URL.startsWith("https://login.microsoftonline.com/"));
  assert(AUTHORIZATION_URL.endsWith("/oauth2/v2.0/authorize"));
  assert(TOKEN_URL.endsWith("/oauth2/v2.0/token"));
});

Deno.test("oauth2: requests the least-privileged scope set, including offline_access", () => {
  assertEquals([...SCOPES].sort(), ["Files.ReadWrite", "User.Read", "offline_access"]);
  assertEquals(auth.oauth2?.scopes, SCOPES);
  // Microsoft issues a refresh token only when this scope is asked for; there
  // is no `access_type=offline` equivalent, hence no extraAuthParams.
  assert(SCOPES.includes("offline_access"));
});

Deno.test("oauth2: sign stamps a bearer token and returns the request", () => {
  const { ctx } = mockCtx([]);
  const request = { headers: {} as Record<string, string> };
  const out = auth.sign!({ request, credential: { accessToken: "tok" } } as never, ctx);
  assertEquals((out as typeof request).headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test probes GET /me with the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const out = await auth.test({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://graph.microsoft.com/v1.0/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test fails legibly when the credential carries no token", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0, "must not call the network without a token");
});

Deno.test("oauth2: test reports the status when Graph rejects the credential", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "InvalidAuthenticationToken" } },
  }]);
  const out = await auth.test({ credential: { accessToken: "stale" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("401"), out.message);
});

Deno.test("oauth2: afterConnect labels the connection from the profile", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: "Ada Lovelace", mail: "ada@contoso.com" },
  }]);
  const out = await auth.afterConnect!({} as never, ctx);
  assertEquals(out, { user: { id: "u1", email: "ada@contoso.com", name: "Ada Lovelace" } });
});

Deno.test("oauth2: afterConnect falls back to userPrincipalName when mail is null", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: "Ada", mail: null, userPrincipalName: "ada@contoso.com" },
  }]);
  const out = await auth.afterConnect!({} as never, ctx);
  assertEquals((out as { user: { email: string } }).user.email, "ada@contoso.com");
});

Deno.test("oauth2: afterConnect stays silent rather than failing a connect", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({} as never, ctx), {});
});
