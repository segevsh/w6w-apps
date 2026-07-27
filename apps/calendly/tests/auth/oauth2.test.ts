import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Calendly authorize/token endpoints and PKCE", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://auth.calendly.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://auth.calendly.com/oauth/token");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign appends Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok-1" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok-1");
});

Deno.test("oauth2: test hits /users/me with the access token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resource: {} } }]);
  const result = await auth.test({ credential: { accessToken: "tok-1" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-1");
});

Deno.test("oauth2: test reports failure when accessToken missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("missing"));
});
