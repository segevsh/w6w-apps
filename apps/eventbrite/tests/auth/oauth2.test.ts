import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

test("oauth2: declares the Eventbrite authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.eventbrite.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://www.eventbrite.com/oauth/token");
  // Eventbrite doesn't support PKCE server-side; make sure we don't silently flip it on.
  assertEquals(auth.oauth2?.pkce, false);
});

test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

test("oauth2: test with missing accessToken reports the failure", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"), "message should mention accessToken");
  assertEquals(calls.length, 0, "must not make a network call when credential is malformed");
});

test("oauth2: test issues GET /users/me/ with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/v3/users/me/");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

test("oauth2: test returns the upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

test("oauth2: setup guidance names Eventbrite's own labels", () => {
  const s = auth.oauth2?.setup;
  assertEquals(s?.consoleUrl, "https://www.eventbrite.com/account-settings/apps");
  assert(s?.clientIdHint?.includes("API key"));
  assert(!s?.clientIdHint?.includes("Private token"));
  assert(!s?.clientIdHint?.includes("Public token"));
  assert(s?.clientSecretHint?.includes("Client secret"));
  assert(s?.redirectUriHint?.includes("OAuth Redirect URI"));
  assertEquals(s?.extraHint, "Leave this as {}");
  assertEquals(s?.extraTemplate, undefined);
  assert(s?.instructions?.includes("Developer Links"));
  assert(s?.instructions?.includes("Do not use the Private token"));
});
