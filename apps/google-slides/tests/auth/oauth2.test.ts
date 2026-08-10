import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Google's authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: requests `presentations` and nothing wider", () => {
  // Every one of the five Slides methods lists `presentations` among its
  // scopes, so it is sufficient alone. Drive and Sheets scopes are NOT
  // requested: this app calls neither API, and asking would widen the grant for
  // nothing. This assertion is the guard against that creeping back in.
  assertEquals(auth.oauth2?.scopes, ["https://www.googleapis.com/auth/presentations"]);
});

Deno.test("oauth2: forces offline + consent to obtain a refresh token", () => {
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://slides.googleapis.com/v1/presentations/p1",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure without a call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test posts the token to tokeninfo, never putting it in the URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { scope: "…", expires_in: 3599 } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://oauth2.googleapis.com");
  assertEquals(url.pathname, "/tokeninfo");
  assertEquals(calls[0].method, "POST");
  // The credential must not appear anywhere in the request line.
  assertEquals(url.search, "");
  assertEquals(calls[0].url.includes("acc-abc"), false);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URLSearchParams(calls[0].body!).get("access_token"), "acc-abc");
});

Deno.test("oauth2: test returns the upstream status on non-2xx, without echoing the token", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "invalid_token" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-secret" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("400"));
  assertEquals((result.message ?? "").includes("acc-secret"), false);
});

Deno.test("oauth2: afterConnect fills the connection label from userinfo", async () => {
  const { ctx, calls } = mockCtx([
    { body: { sub: "1", name: "Ada", email: "ada@example.com" } },
  ]);
  const out = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(calls[0].url, "https://www.googleapis.com/oauth2/v3/userinfo");
  assertEquals(out, { user: { id: "1", name: "Ada", email: "ada@example.com" } });
});

Deno.test("oauth2: afterConnect degrades to no label when userinfo is out of scope", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: {} } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});
