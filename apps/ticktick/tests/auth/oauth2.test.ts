import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { AUTHORIZATION_URL, SCOPES, TOKEN_URL } from "../../auth/oauth2.ts";

Deno.test("oauth2: the documented endpoints, verbatim", () => {
  assertEquals(AUTHORIZATION_URL, "https://ticktick.com/oauth/authorize");
  assertEquals(TOKEN_URL, "https://ticktick.com/oauth/token");
  assertEquals(auth.oauth2?.authorizationUrl, AUTHORIZATION_URL);
  assertEquals(auth.oauth2?.tokenUrl, TOKEN_URL);
  // Not api.ticktick.com — the OAuth host is a different one from the API host.
  assert(!AUTHORIZATION_URL.includes("api.ticktick.com"));
});

Deno.test("oauth2: exactly the two scopes TickTick documents, space-separated", () => {
  assertEquals(SCOPES, ["tasks:read", "tasks:write"]);
  assertEquals(auth.oauth2?.scopes, SCOPES);
  assertEquals(auth.oauth2?.scopeSeparator, " ");
  // The doc's other table spells them with a stray space ("tasks: write"); that
  // form must never reach the wire.
  for (const s of SCOPES) assert(!s.includes(" "), `${s} contains a space`);
});

Deno.test("oauth2: PKCE is off, because TickTick documents no code_challenge", () => {
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: no refresh hook and no refreshUrl — TickTick documents no refresh grant", () => {
  assertEquals(auth.refresh, undefined);
  assertEquals(auth.oauth2?.refreshUrl, undefined);
});

Deno.test("oauth2: no afterConnect and no connectionLabel — there is no user endpoint", () => {
  assertEquals(auth.afterConnect, undefined);
  assertEquals(auth.connectionLabel, undefined);
});

Deno.test("oauth2: an OAuth method collects no fields at connect time", () => {
  assertEquals(auth.fields, undefined);
  assertEquals(auth.type, "oauth2");
});

Deno.test("oauth2: sign injects a Bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.ticktick.com/open/v1/project",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!(
    { request, credential: { accessToken: "tok-123" } },
    {} as never,
  ) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer tok-123");
  assertEquals(Object.keys(out.headers), ["authorization"]);
});

Deno.test("oauth2: test probes GET /project with the token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const out = await auth.test({ credential: { accessToken: "tok-123" } }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://api.ticktick.com/open/v1/project");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-123");
});

Deno.test("oauth2: test fails closed when the credential has no token", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  // And makes no request at all.
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: a failing test reports the status and never echoes the token", async () => {
  // TickTick's real 401 body echoes the token verbatim — that is exactly why
  // this message is built from the status alone.
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_token", error_description: "Invalid access token: super-secret" },
  }]);
  const out = await auth.test({ credential: { accessToken: "super-secret" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("401"));
  assert(!out.message?.includes("super-secret"), "the token must never appear in a message");
});
