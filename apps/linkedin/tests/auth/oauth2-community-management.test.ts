import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2-community-management.ts";

Deno.test("oauth2-community-management: declares the broader organization scope set", () => {
  assertEquals(auth.key, "oauth2-community-management");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.linkedin.com/oauth/v2/authorization");
  assertEquals(auth.oauth2?.tokenUrl, "https://www.linkedin.com/oauth/v2/accessToken");
  assert(auth.oauth2?.scopes?.includes("w_organization_social"));
  assert(auth.oauth2?.scopes?.includes("r_organization_social"));
  assert(auth.oauth2?.scopes?.includes("rw_organization_admin"));
  // Still carries the identity/free-tier scopes so afterConnect/test keep working.
  assert(auth.oauth2?.scopes?.includes("w_member_social"));
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2-community-management: sign injects Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2-community-management: test probes the same GET /v2/userinfo as the standard method", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sub: "abc123" } }]);
  const result = await auth.test({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/userinfo");
});

Deno.test("oauth2-community-management: test with missing accessToken reports the failure", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});
