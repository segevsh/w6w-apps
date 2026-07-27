import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Pipedrive's authorize/token endpoints", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://oauth.pipedrive.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth.pipedrive.com/oauth/token");
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: sign uses the Bearer scheme, unlike the API token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.pipedrive.com/v1/deals",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
  // No api_token query param — that is the API-token method's posture.
  assertEquals(new URL(out.url).searchParams.has("api_token"), false);
});

Deno.test("oauth2: test hits /users/me with the bearer token and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(result.ok, true);
});

Deno.test("oauth2: test fails when the credential has no access token", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});
