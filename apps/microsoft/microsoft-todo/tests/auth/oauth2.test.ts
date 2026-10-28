import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { AUTHORIZATION_URL, SCOPES, TOKEN_URL } from "../../auth/oauth2.ts";

Deno.test("oauth2: uses the Entra v2.0 endpoints on the `common` tenant", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(AUTHORIZATION_URL, "https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  assertEquals(TOKEN_URL, "https://login.microsoftonline.com/common/oauth2/v2.0/token");
  assertEquals(auth.oauth2?.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(auth.oauth2?.tokenUrl, TOKEN_URL);
  assertEquals(auth.oauth2?.pkce, true);
  // Microsoft issues refresh tokens from a SCOPE, not from a parameter — so
  // there is deliberately nothing here (contrast Google's access_type=offline).
  assertEquals(auth.oauth2?.extraAuthParams, undefined);
});

Deno.test("oauth2: asks for exactly the least-privileged scope set", () => {
  assertEquals(SCOPES, ["offline_access", "User.Read", "Tasks.ReadWrite"]);
  assertEquals(auth.oauth2?.scopes, SCOPES);
  // Tasks.ReadWrite is documented as the higher-privileged form of Tasks.Read,
  // so asking for both would be redundant consent.
  assert(!SCOPES.includes("Tasks.Read"));
  // The .All variants are the application (app-only) permissions; this is a
  // delegated flow acting as the signed-in user.
  assert(!SCOPES.some((s) => s.endsWith(".All")));
  // No Mail/Calendars/Files creep from the sibling Graph apps.
  assert(!SCOPES.some((s) => /^(Mail|Calendars|Files|Group|Directory)\./.test(s)));
});

Deno.test("oauth2: sign appends the Bearer token and makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  const request = {
    url: "https://graph.microsoft.com/v1.0/me/todo/lists",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports a missing accessToken without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes /me/todo/lists with no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { value: [] } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "graph.microsoft.com");
  assertEquals(url.pathname, "/v1.0/me/todo/lists");
  // Microsoft does not enumerate which OData params To Do supports, so sending
  // a $top to shrink the probe would risk a 400 on a healthy credential.
  assertEquals([...url.searchParams.keys()], []);
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test treats an account with zero lists as healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { value: [] } }]);
  assertEquals((await auth.test({ credential: { accessToken: "acc" } }, ctx)).ok, true);
});

Deno.test("oauth2: test surfaces the upstream status, and leaks no token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "super-secret" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("403"));
  assert(!(result.message ?? "").includes("super-secret"));
});

Deno.test("oauth2: afterConnect labels the connection, preferring mail over UPN", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "u1",
      displayName: "Ada Lovelace",
      mail: "ada@example.com",
      userPrincipalName: "ada@example.onmicrosoft.com",
    },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me");
  assertEquals((out as { user: Record<string, string> }).user, {
    id: "u1",
    email: "ada@example.com",
    name: "Ada Lovelace",
  });
});

Deno.test("oauth2: afterConnect falls back to userPrincipalName when mail is null", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "u1",
      displayName: null,
      mail: null,
      userPrincipalName: "ada@example.onmicrosoft.com",
    },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  const user = (out as { user: { email: string; name: string } }).user;
  assertEquals(user.email, "ada@example.onmicrosoft.com");
  assertEquals(user.name, "ada@example.onmicrosoft.com");
});

Deno.test("oauth2: afterConnect degrades to {} rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx), {});
});
