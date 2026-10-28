import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Google authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.revokeUrl, "https://oauth2.googleapis.com/revoke");
  // Google's OAuth server requires these for a refresh_token to come back.
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: requests exactly the three user-auth scopes the actions need", () => {
  assertEquals(auth.oauth2?.scopes, [
    "https://www.googleapis.com/auth/chat.spaces",
    "https://www.googleapis.com/auth/chat.messages",
    "https://www.googleapis.com/auth/chat.memberships",
  ]);
});

Deno.test("oauth2: asks for no app-auth, admin, delete or import scope", () => {
  // These are the scopes a *Chat app* (service account) uses, plus the admin and
  // destructive ones. A user credential either cannot hold them or should not be
  // asked to. Requesting one here would over-scope every connection.
  const forbidden = [
    "chat.bot",
    "chat.app.spaces",
    "chat.app.spaces.create",
    "chat.app.memberships",
    "chat.app.messages.readonly",
    "chat.app.delete",
    "chat.admin.spaces",
    "chat.admin.memberships",
    "chat.admin.delete",
    "chat.delete",
    "chat.import",
    "chat.memberships.app",
  ];
  for (const s of forbidden) {
    assertEquals(
      auth.oauth2?.scopes?.includes(`https://www.googleapis.com/auth/${s}`),
      false,
      `${s} must not be requested`,
    );
  }
});

Deno.test("oauth2: is the only auth method — no service-account flow is offered", () => {
  // A bare service account has no Chat presence without a configured Chat app,
  // and the chat.app.* scopes explicitly do not support user credentials or
  // domain-wide delegation, so a service-account method could not make a call.
  assert((auth.description ?? "").length > 0);
  assertEquals(auth.type, "oauth2");
});

Deno.test("oauth2: sign appends the Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://chat.googleapis.com/v1/spaces",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!({
    request: { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> },
    credential: { accessToken: "acc" },
  }, ctx);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test with a missing accessToken reports it without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes spaces.list — reachable by chat.spaces.readonly too", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { spaces: [] } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "chat.googleapis.com");
  assertEquals(url.pathname, "/v1/spaces");
  assertEquals(url.searchParams.get("pageSize"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test treats a user in zero spaces as healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  assertEquals((await auth.test({ credential: { accessToken: "acc" } }, ctx)).ok, true);
});

Deno.test("oauth2: test surfaces the upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
