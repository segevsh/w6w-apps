import { assert, assertEquals } from "@std/assert";
import { data, gqlError, gqlOf, mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

Deno.test("oauth2: endpoints are on auth.buffer.com, not the API host", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://auth.buffer.com/auth");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://auth.buffer.com/token");
});

Deno.test("oauth2: PKCE is left at the type default of true — Buffer requires it", () => {
  // Buffer: "the Authorization Code flow with PKCE, which is required for all
  // Buffer OAuth clients". Contrast the sibling linkedin app, which must set
  // `pkce: false` explicitly.
  assertEquals(oauth2.oauth2?.pkce, undefined);
});

Deno.test("oauth2: all seven published scopes, space separated", () => {
  assertEquals(oauth2.oauth2?.scopes, [
    "posts:read",
    "posts:write",
    "ideas:read",
    "ideas:write",
    "account:read",
    "account:write",
    "offline_access",
  ]);
  assertEquals(oauth2.oauth2?.scopeSeparator, " ");
});

Deno.test("oauth2: offline_access is present — without it there is no refresh token", () => {
  // "Only returned if the offline_access scope is requested", and access tokens
  // are `expires_in: 3600`.
  assert(oauth2.oauth2?.scopes?.includes("offline_access"));
});

Deno.test("oauth2: no custom refresh hook — the runtime's rotate-and-replace is correct", () => {
  // Buffer's refresh tokens are single-use and reusing an old one revokes the
  // whole grant. A bespoke hook here would be a second implementation of the
  // one thing that must not be got wrong.
  assertEquals(oauth2.refresh, undefined);
});

Deno.test("oauth2: no client secret is declared in the package", () => {
  const serialized = JSON.stringify(oauth2.oauth2 ?? {});
  assert(!/client_?secret/i.test(serialized), serialized);
  assert(!/client_?id/i.test(serialized), serialized);
});

Deno.test("oauth2: sign stamps a bearer header, same shape as the API-key method", () => {
  const request = {
    url: "https://api.buffer.com",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const { ctx } = mockCtx();
  const signed = oauth2.sign!(
    { request, credential: { accessToken: "at1" } },
    ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer at1");
});

Deno.test("oauth2: test sends no Authorization of its own — the runtime signs", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("oauth2: the probe is the same minimal, PII-free query", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1" } })]);
  await oauth2.test({ credential: {} }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/account\s*\{\s*id\s*\}/.test(query), query);
  assert(!/email/i.test(query), query);
  assert(!/connectedApps/.test(query), query);
});

Deno.test("oauth2: a revoked grant reads as a credential failure — reconnect is the fix", async () => {
  // Buffer: "When access is revoked, all tokens for your app are invalidated.
  // Handle 401 Unauthorized responses by prompting the user to re-authorize."
  const { ctx } = mockCtx([gqlError("Access token is not valid", "UNAUTHENTICATED", 401)]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(/UNAUTHENTICATED/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: a missing scope reads as FORBIDDEN, not as a bad token", async () => {
  const { ctx } = mockCtx([gqlError("Not permitted", "FORBIDDEN")]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(/missing scope/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect labels the connection without sending headers", async () => {
  const { ctx, calls } = mockCtx([
    data({ account: { id: "a1", name: "Ada", organizations: [{ id: "o1", name: "Acme" }] } }),
  ]);
  const out = await oauth2.afterConnect!({ credential: {} }, ctx);
  assertEquals((out as { account: { name: string } }).account.name, "Ada");
  assertEquals(calls[0].headers["authorization"], undefined);
});
