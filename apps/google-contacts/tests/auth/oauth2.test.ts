import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Google's authorize/token endpoints and the contacts scopes", () => {
  assertEquals(oauth2.key, "oauth2");
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(oauth2.oauth2?.scopes, [
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/contacts.other.readonly",
  ]);
  // offline + consent, or Google omits refresh_token for returning users.
  assertEquals(oauth2.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: collects no credential fields — the token comes from the flow", () => {
  assertEquals(oauth2.fields ?? [], []);
});

Deno.test("oauth2: sign stamps the bearer token onto the request", () => {
  const request = { method: "GET", url: "https://people.googleapis.com/v1/people/me", headers: {} };
  const signed = oauth2.sign!(
    { request, credential: { accessToken: "ya29.token" } } as never,
    undefined as never,
  ) as typeof request;
  assertEquals(signed.headers, { authorization: "Bearer ya29.token" });
});

Deno.test("oauth2: test probes people/me with the required personFields", async () => {
  const { ctx, calls } = mockCtx([{ body: { resourceName: "people/me" } }]);
  const result = await oauth2.test({ credential: { accessToken: "ya29.token" } } as never, ctx);
  assertEquals(result, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://people.googleapis.com");
  assertEquals(url.pathname, "/v1/people/me");
  // Omitting personFields would be a 400 and report a live credential as broken.
  assertEquals(url.searchParams.get("personFields"), "names");
});

Deno.test("oauth2: test fails without an accessToken and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} } as never, ctx);
  assertEquals(result, { ok: false, message: "credential missing accessToken" });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports the upstream status on a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, statusText: "Unauthorized", body: "{}" }]);
  const result = await oauth2.test({ credential: { accessToken: "stale" } } as never, ctx);
  assertEquals(result, { ok: false, message: "Google returned 401" });
});

Deno.test("oauth2: afterConnect maps Google's userinfo onto the connection label", async () => {
  const { ctx, calls } = mockCtx([
    { body: { sub: "1234", name: "Ada Lovelace", email: "ada@example.com" } },
  ]);
  const result = await oauth2.afterConnect!({} as never, ctx);
  assertEquals(calls[0].url, "https://www.googleapis.com/oauth2/v3/userinfo");
  assertEquals(result, {
    user: { id: "1234", name: "Ada Lovelace", email: "ada@example.com" },
  });
});

Deno.test("oauth2: afterConnect degrades quietly when the OpenID scopes are absent", async () => {
  const { ctx } = mockCtx([{ status: 403, statusText: "Forbidden", body: "{}" }]);
  assertEquals(await oauth2.afterConnect!({} as never, ctx), {});
});

Deno.test("oauth2: does not request directory.readonly — no directory action ships", () => {
  const scopes = oauth2.oauth2?.scopes ?? [];
  assertEquals(scopes.some((s) => s.includes("directory")), false);
});
