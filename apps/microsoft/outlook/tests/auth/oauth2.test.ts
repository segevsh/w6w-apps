import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Microsoft identity platform v2.0 endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  );
  assertEquals(
    auth.oauth2?.tokenUrl,
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  );
  // `common` is the only tenant segment accepting both work/school and
  // personal Microsoft accounts.
  assert(auth.oauth2?.authorizationUrl.includes("/common/"));
});

Deno.test("oauth2: requests offline_access, which is how Microsoft grants a refresh token", () => {
  // Unlike Google there is no access_type/prompt parameter — the refresh token
  // is gated on the scope alone.
  assert(auth.oauth2?.scopes?.includes("offline_access"));
  assertEquals(auth.oauth2?.extraAuthParams, undefined);
});

Deno.test("oauth2: requests the least-privileged scope set covering every action", () => {
  assertEquals(auth.oauth2?.scopes, [
    "offline_access",
    "User.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "Calendars.ReadWrite",
  ]);
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign injects the bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://graph.microsoft.com/v1.0/me/messages",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test fails without a token and makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes GET /me, which needs only User.Read", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1", displayName: "Alex" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test surfaces the upstream status on rejection", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("oauth2: afterConnect labels the connection from the profile", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", displayName: "Alex Wilber", mail: "alexw@contoso.com" },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals((out as { user: Record<string, string> }).user, {
    id: "u1",
    email: "alexw@contoso.com",
    name: "Alex Wilber",
  });
});

Deno.test("oauth2: afterConnect falls back to userPrincipalName when mail is null", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u2", displayName: "Sam", mail: null, userPrincipalName: "sam@contoso.com" },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals((out as { user: { email: string } }).user.email, "sam@contoso.com");
});

Deno.test("oauth2: afterConnect degrades quietly when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx), {});
});
