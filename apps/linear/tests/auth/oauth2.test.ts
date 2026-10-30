import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

test("oauth2: declares Linear's endpoints and its comma scope separator", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://linear.app/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.linear.app/oauth/token");
  // Linear separates scopes with commas, not the OAuth-default space.
  assertEquals(auth.oauth2?.scopeSeparator, ",");
  assertEquals(auth.oauth2?.pkce, false);
});

test("oauth2: sign DOES use the Bearer scheme, unlike the personal API key", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.linear.app/graphql",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});
