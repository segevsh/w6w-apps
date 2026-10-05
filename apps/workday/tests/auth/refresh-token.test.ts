import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/refresh-token.ts";

const TOKEN = { access_token: "tok-1", token_type: "Bearer" };
const fields = {
  host: "wd2-impl-services1.workday.com",
  tenant: "acme_impl1",
  clientId: "client-1",
  clientSecret: "s3cret",
  refreshToken: "r-1",
};

Deno.test("exchange: posts a refresh_token grant with Basic client auth to the tenant's token URL", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN }]);
  const cred = await auth.exchange!({ fields } as never, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://wd2-impl-services1.workday.com/ccx/oauth2/acme_impl1/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("client-1:s3cret")}`);
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "refresh_token");
  assertEquals(form.get("refresh_token"), "r-1");
  assertEquals(form.has("client_secret"), false);
  assertEquals(cred.accessToken, "tok-1");
  assertEquals(cred.refreshToken, "r-1");
  assertEquals(cred.host, fields.host);
  // default lifetime 1h, expired early: ~58 minutes
  const ms = Date.parse(String(cred.expiresAt)) - Date.now();
  assert(ms > 55 * 60_000 && ms < 60 * 60_000, String(ms));
});

Deno.test("exchange: a host off the Workday suffixes is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  for (const host of ["evil.com", "https://wd2.workday.com", "wd2.workday.com.evil.com"]) {
    await assertRejects(
      async () => await auth.exchange!({ fields: { ...fields, host } } as never, ctx),
      Error,
      "host",
    );
  }
  assertEquals(calls.length, 0);
});

Deno.test("exchange: missing secrets are refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { ...fields, refreshToken: "" } } as never, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("exchange: classifies from the body's OAuth error code, whatever the status", async () => {
  for (
    const [status, error, hint] of [[400, "invalid_grant", "refresh token"], [
      401,
      "invalid_client",
      "client ID/secret",
    ]] as const
  ) {
    const { ctx } = mockCtx([{ status, body: { error, error_description: "nope" } }]);
    const err = await assertRejects(async () => await auth.exchange!({ fields } as never, ctx));
    assert((err as Error).message.includes(error));
    assert((err as Error).message.includes(hint));
  }
  // A 200 carrying an error body is still a refusal.
  const { ctx } = mockCtx([{ status: 200, body: { error: "invalid_grant" } }]);
  await assertRejects(
    async () => await auth.exchange!({ fields } as never, ctx),
    Error,
    "invalid_grant",
  );
});

Deno.test("exchange: a 200 with no access_token is an error", async () => {
  const { ctx } = mockCtx([{ body: { token_type: "Bearer" } }]);
  await assertRejects(
    async () => await auth.exchange!({ fields } as never, ctx),
    Error,
    "access_token",
  );
});

Deno.test("refresh: mints again from the stored refresh token and keeps the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...TOKEN, access_token: "tok-2", expires_in: 3600 } }]);
  const out = await auth.refresh!(
    { credential: { ...fields, accessToken: "old" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URLSearchParams(calls[0].body!).get("refresh_token"), "r-1");
  assertEquals(out.accessToken, "tok-2");
  assertEquals(out.clientId, "client-1");
  assertEquals(out.tenant, "acme_impl1");
});

Deno.test("sign: stamps the bearer, keeps other headers, and the stored host is the only target", async () => {
  const cred = { ...fields, accessToken: "tok-1" };
  const req = {
    url: "https://wd2-impl-services1.workday.com/ccx/api/staffing/v7/acme_impl1/workers",
    method: "GET",
    headers: { accept: "application/json" },
  };
  const signed = await auth.sign!({ request: req, credential: cred } as never, mockCtx().ctx);
  assertEquals(signed.headers, { accept: "application/json", authorization: "Bearer tok-1" });
  assertThrows(
    () =>
      auth.sign!(
        { request: { ...req, url: "https://other.workday.com/x" }, credential: cred } as never,
        mockCtx().ctx,
      ),
    Error,
    "other than the connection",
  );
});

Deno.test("sign: leaves the token endpoint's own Basic header alone", async () => {
  const req = {
    url: "https://wd2-impl-services1.workday.com/ccx/oauth2/acme_impl1/token",
    method: "POST",
    headers: { authorization: "Basic abc" },
  };
  const signed = await auth.sign!(
    { request: req, credential: { ...fields, accessToken: "t" } } as never,
    mockCtx().ctx,
  );
  assertEquals(signed.headers.authorization, "Basic abc");
});

Deno.test("test: 200 proves the credential; the probe sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 1, data: [{ id: "w" }] } }]);
  const r = await auth.test({ credential: { ...fields, accessToken: "t" } } as never, ctx);
  assertEquals(r.ok, true);
  assertEquals(
    calls[0].url,
    "https://wd2-impl-services1.workday.com/ccx/api/staffing/v7/acme_impl1/workers?limit=1",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("test: 401 fails, 403 is authenticated-but-unscoped, a bad host fails without a call", async () => {
  const cred = { ...fields, accessToken: "t" };
  const a = mockCtx([{ status: 401, body: { error: "invalid_token" } }]);
  const r401 = await auth.test({ credential: cred } as never, a.ctx);
  assertEquals(r401.ok, false);
  assert(/invalid_token/.test(r401.message!));
  const b = mockCtx([{ status: 403, body: { error: "insufficient scope" } }]);
  const r403 = await auth.test({ credential: cred } as never, b.ctx);
  assertEquals(r403.ok, true);
  assert(/cannot read workers/.test(r403.message!));
  const c = mockCtx([]);
  const bad = await auth.test({ credential: { ...cred, host: "evil.com" } } as never, c.ctx);
  assertEquals(bad.ok, false);
  assertEquals(c.calls.length, 0);
});

Deno.test("afterConnect: publishes host and tenant, never a secret", async () => {
  const out = await auth.afterConnect!(
    { credential: { ...fields, accessToken: "t" } } as never,
    mockCtx().ctx,
  );
  assertEquals(out, { host: fields.host, tenant: fields.tenant });
});
