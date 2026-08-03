import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

const CRED = { siteUrl: "https://acme.getgrist.com", accessToken: "grist_at_abc" };

/**
 * Every value asserted here was read off the live discovery document at
 * https://login.getgrist.com/.well-known/oauth-authorization-server on
 * 2026-08-03 — not from memory. If Grist moves an endpoint, this test is the
 * thing that should fail.
 */
Deno.test("oauth2: endpoints match Grist's published discovery document", () => {
  const cfg = auth.oauth2!;
  assertEquals(cfg.authorizationUrl, "https://login.getgrist.com/oidc/auth");
  assertEquals(cfg.tokenUrl, "https://login.getgrist.com/oidc/token");
  assertEquals(cfg.revokeUrl, "https://login.getgrist.com/oidc/token/revocation");
  // code_challenge_methods_supported is ["S256"] and nothing else.
  assertEquals(cfg.pkce, true);
  assertEquals(cfg.scopeSeparator, " ");
});

Deno.test("oauth2: every requested scope is one Grist actually publishes", () => {
  // scopes_supported, verbatim from the discovery document.
  const supported = new Set([
    "offline_access",
    "doc:read",
    "doc:write",
    "doc.schema:write",
    "doc:download",
    "doc:webhooks",
    "user.profile:read",
  ]);
  for (const s of auth.oauth2!.scopes!) {
    assert(supported.has(s), `${s} is not in Grist's scopes_supported`);
  }
});

Deno.test("oauth2: offline_access and user.profile:read are both requested, deliberately", () => {
  const scopes = auth.oauth2!.scopes!;
  // Without offline_access there is no refresh token, so unattended runs die.
  assert(scopes.includes("offline_access"));
  // Without user.profile:read the `test` probe below cannot read /profile/user.
  assert(scopes.includes("user.profile:read"));
});

Deno.test("oauth2: sign stamps the access token as a bearer", () => {
  const req = { headers: {} as Record<string, string> };
  auth.sign!({ request: req, credential: CRED } as never, {} as never);
  assertEquals(req.headers["authorization"], "Bearer grist_at_abc");
  assertEquals(Object.keys(req.headers), ["authorization"]);
});

Deno.test("oauth2: test probes the DATA plane, not the login server", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, anonymous: false } }]);
  const res = await auth.test({ credential: CRED }, ctx);
  assertEquals(res.ok, true);
  assertEquals(calls[0].url, "https://acme.getgrist.com/api/profile/user");
  assert(!calls[0].url.includes("login.getgrist.com"));
});

Deno.test("oauth2: test rejects an anonymous 200, same guard as the API key", async () => {
  const { ctx } = mockCtx([{ body: { id: 40, anonymous: true } }]);
  const res = await auth.test({ credential: CRED }, ctx);
  assertEquals(res.ok, false);
  assert(/anonymous/i.test(res.message ?? ""));
});

Deno.test("oauth2: test makes no call when the token or site is absent", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test({ credential: { siteUrl: "https://x" } }, ctx)).ok, false);
  assertEquals((await auth.test({ credential: { accessToken: "t" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect publishes the site host without the token", async () => {
  const { ctx } = mockCtx([{ body: { id: 2, name: "Helga", email: "h@example.com" } }]);
  const display = await auth.afterConnect!({ credential: CRED } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals((display.site as { host: string }).host, "acme.getgrist.com");
  assert(!JSON.stringify(display).includes("grist_at_abc"));
});

Deno.test("oauth2: the description says plainly that self-hosted needs the API key", () => {
  assert(/self-hosted/i.test(auth.description ?? ""));
});
