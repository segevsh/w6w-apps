import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { AUTHORIZATION_URL, SCOPES, TOKEN_URL } from "../../auth/oauth2.ts";
import type { HookContext } from "@w6w/types";

Deno.test("oauth2: is an oauth2 method with PKCE on", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.pkce, true);
  assertEquals(auth.oauth2?.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(auth.oauth2?.tokenUrl, TOKEN_URL);
});

Deno.test("oauth2: uses the `organizations` tenant — Teams has no personal-account support", () => {
  // Every Teams delegated permission this App requests is documented
  // "Delegated (personal Microsoft account): Not supported", so `common` would
  // let a consumer account complete the dance and then fail every action.
  assert(AUTHORIZATION_URL.includes("/organizations/"));
  assert(TOKEN_URL.includes("/organizations/"));
  assertEquals(AUTHORIZATION_URL.includes("/common/"), false);
});

Deno.test("oauth2: requests offline_access — Microsoft's only route to a refresh token", () => {
  assert(SCOPES.includes("offline_access"));
  // Unlike Google there is no `access_type=offline` parameter to set.
  assertEquals(auth.oauth2?.extraAuthParams, undefined);
});

Deno.test("oauth2: requests exactly the scopes the actions need, and no others", () => {
  assertEquals(SCOPES, [
    "offline_access",
    "User.Read",
    "Team.ReadBasic.All",
    "TeamMember.ReadWrite.All",
    "Channel.ReadBasic.All",
    "ChannelMember.Read.All",
    "ChannelMessage.Send",
    "ChannelMessage.Read.All",
    "Chat.ReadWrite",
  ]);
  assertEquals(auth.oauth2?.scopes, SCOPES);
  assertEquals(new Set(SCOPES).size, SCOPES.length, "scopes must be unique");
});

Deno.test("oauth2: does not request the app-only migration scope", () => {
  // Teamwork.Migrate.All is the only application permission Graph accepts for
  // posting messages, and it is for data import — not for this App.
  assertEquals(SCOPES.includes("Teamwork.Migrate.All"), false);
});

Deno.test("oauth2: sign stamps the bearer token onto the request", () => {
  const request = { headers: {} as Record<string, string> };
  const { ctx } = mockCtx([]);
  const out = auth.sign!({ request, credential: { accessToken: "tok" } } as never, ctx);
  assertEquals((out as typeof request).headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: sign never reaches the network — it is credential-only", () => {
  const { ctx, calls } = mockCtx([]);
  auth.sign!({ request: { headers: {} }, credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes GET /me, the cheapest call needing only User.Read", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const out = await auth.test({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://graph.microsoft.com/v1.0/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test fails legibly on a missing token, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports the upstream status when Graph refuses", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "InvalidAuthenticationToken" } },
  }]);
  const out = await auth.test({ credential: { accessToken: "stale" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("401"));
});

Deno.test("oauth2: afterConnect labels the connection from the profile", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: "Robin Kline", mail: "robin@contoso.com" },
  }]);
  const out = await auth.afterConnect!({} as never, ctx as HookContext);
  assertEquals(out, {
    user: { id: "u1", email: "robin@contoso.com", name: "Robin Kline" },
  });
});

Deno.test("oauth2: afterConnect falls back to userPrincipalName when mail is null", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: null, mail: null, userPrincipalName: "robin@contoso.com" },
  }]);
  const out = await auth.afterConnect!({} as never, ctx as HookContext);
  assertEquals(
    out,
    { user: { id: "u1", email: "robin@contoso.com", name: "robin@contoso.com" } },
  );
});

Deno.test("oauth2: afterConnect degrades to an empty label rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: { code: "Forbidden" } } }]);
  assertEquals(await auth.afterConnect!({} as never, ctx as HookContext), {});
});
