import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

const fields = {
  domain: "acme.us.auth0.com",
  clientId: "cid",
  clientSecret: "csecret",
};
const token = { status: 200, body: { access_token: "tok-1", expires_in: 86400 } };

/** The audience is what makes it a MANAGEMENT API token. */
Deno.test("client-credentials: exchange mints a token with the management audience", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(credential.accessToken, "tok-1");
  assertEquals(new URL(calls[0].url).pathname, "/oauth/token");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.grant_type, "client_credentials");
  assertEquals(sent.audience, "https://acme.us.auth0.com/api/v2/");
});

/** Scopes are granted in the dashboard; requesting one that was not fails. */
Deno.test("client-credentials: requests no scopes", async () => {
  const { ctx, calls } = mockCtx([token]);
  await auth.exchange!({ fields }, ctx);
  assertEquals("scope" in JSON.parse(calls[0].body!), false);
});

Deno.test("client-credentials: an expiry is recorded with headroom", async () => {
  const { ctx } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as { expiresAt: string };
  const ms = Date.parse(credential.expiresAt) - Date.now();
  assert(ms > 0 && ms <= 86400 * 1000, credential.expiresAt);
});

/** A custom domain would fail at the sandbox; failing here explains why. */
Deno.test("client-credentials: a custom domain is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await auth.exchange!({ fields: { ...fields, domain: "auth.acme.com" } }, ctx),
    Error,
    "custom domain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: a refused token request explains what to check", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "access_denied", error_description: "Unauthorized" },
  }]);
  const err = await assertRejects(async () => await auth.exchange!({ fields }, ctx), Error);
  assert(/Machine to Machine/.test(String(err)), String(err));
});

/** There is no refresh token — refresh is the same call again. */
Deno.test("client-credentials: refresh re-mints from the stored credentials", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.refresh!({
    credential: { ...fields, accessToken: "old" },
  }, ctx) as Record<string, unknown>;
  assertEquals(credential.accessToken, "tok-1");
  assertEquals(JSON.parse(calls[0].body!).grant_type, "client_credentials");
});

Deno.test("client-credentials: signs as a Bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.us.auth0.com/api/v2/users",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok-1" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok-1");
});

/** A 403 on the test means a dashboard grant, not a bad credential. */
Deno.test("client-credentials: test distinguishes a missing scope from a dead token", async () => {
  const forbidden = mockCtx([{ status: 403, body: "" }]);
  const a = await auth.test!(
    { credential: { accessToken: "t", domain: fields.domain } },
    forbidden.ctx,
  );
  assertEquals(a.ok, false);
  assert(/read:users/.test(a.message!), a.message);

  const unauthorized = mockCtx([{ status: 401, body: "" }]);
  const b = await auth.test!(
    { credential: { accessToken: "t", domain: fields.domain } },
    unauthorized.ctx,
  );
  assertEquals(b.ok, false);
  assert(/audience|expired/.test(b.message!), b.message);
});

Deno.test("client-credentials: afterConnect records the domain and tenant, never the secret", () => {
  const display = auth.afterConnect!({ credential: fields }, mockCtx().ctx) as Record<
    string,
    unknown
  >;
  assertEquals(display, { domain: "acme.us.auth0.com", tenant: "acme" });
  assert(!JSON.stringify(display).includes("csecret"));
});

Deno.test("client-credentials: both credential fields are declared secret", () => {
  for (const key of ["clientId", "clientSecret"]) {
    assertEquals(auth.fields!.find((f) => f.key === key)!.type, "secret", key);
  }
});
