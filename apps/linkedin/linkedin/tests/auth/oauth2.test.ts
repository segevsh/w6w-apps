import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares LinkedIn's authorize/token endpoints and the free-tier scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.linkedin.com/oauth/v2/authorization");
  assertEquals(auth.oauth2?.tokenUrl, "https://www.linkedin.com/oauth/v2/accessToken");
  assertEquals(auth.oauth2?.scopes, ["openid", "profile", "email", "w_member_social"]);
  assertEquals(auth.oauth2?.pkce, false);
  // No org scopes here — see oauth2-community-management.
  assert(!auth.oauth2?.scopes?.includes("w_organization_social"));
});

Deno.test("oauth2: sign injects Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2: test with missing accessToken reports the failure", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2: test probes GET /v2/userinfo with the Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sub: "abc123" } }]);
  const result = await auth.test({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/userinfo");
});

Deno.test("oauth2: test surfaces a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "invalid token" } }]);
  const result = await auth.test({ credential: { accessToken: "expired" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2: afterConnect derives the connection label's user data", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { sub: "abc123", name: "Ada Lovelace" } },
  ]);
  const out = await auth.afterConnect!({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals((out.user as { id: string; name: string }).id, "abc123");
  assertEquals((out.user as { id: string; name: string }).name, "Ada Lovelace");
});

Deno.test("oauth2: afterConnect falls back to given_name + family_name when name is absent", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { sub: "abc123", given_name: "Ada", family_name: "Lovelace" } },
  ]);
  const out = await auth.afterConnect!({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals((out.user as { name: string }).name, "Ada Lovelace");
});

Deno.test("oauth2: afterConnect returns {} on a failed fetch", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out, {});
});
