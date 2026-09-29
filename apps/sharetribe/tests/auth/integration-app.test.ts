import { assertEquals, assertRejects } from "@std/assert";
import auth from "../../auth/integration-app.ts";
import { AUTH_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("integration-app: exchange mints a token via client_credentials, scope=integ", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        access_token: "at-1",
        token_type: "bearer",
        expires_in: 3600,
        scope: "integ",
        refresh_token: "rt-1",
      },
    },
  ]);
  const cred = await auth.exchange!(
    { fields: { clientId: "cid", clientSecret: "secret" } } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url.startsWith(`${AUTH_ROOT}/token`), true);
  assertEquals(calls[0].method, "POST");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("client_id"), "cid");
  assertEquals(body.get("client_secret"), "secret");
  assertEquals(body.get("grant_type"), "client_credentials");
  assertEquals(body.get("scope"), "integ");

  assertEquals(cred.accessToken, "at-1");
  assertEquals(cred.refreshToken, "rt-1");
  assertEquals(cred.clientId, "cid");
});

Deno.test("integration-app: exchange requires both clientId and clientSecret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "only-id" } } as never, ctx),
    Error,
    "required",
  );
});

Deno.test("integration-app: exchange surfaces a plain-text 401 (not JSON) from a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  await assertRejects(
    async () =>
      await auth.exchange!({ fields: { clientId: "bad", clientSecret: "bad" } } as never, ctx),
    Error,
    "refused",
  );
});

Deno.test("integration-app: refresh prefers grant_type=refresh_token when a refresh token exists", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { access_token: "at-2", expires_in: 3600, refresh_token: "rt-2" } },
  ]);
  const cred = await auth.refresh!(
    {
      credential: {
        clientId: "cid",
        clientSecret: "secret",
        accessToken: "old",
        refreshToken: "rt-1",
        expiresAt: new Date().toISOString(),
      },
    } as never,
    ctx,
  ) as Record<string, unknown>;

  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("grant_type"), "refresh_token");
  assertEquals(body.get("refresh_token"), "rt-1");
  assertEquals(body.has("client_secret"), false);
  assertEquals(cred.accessToken, "at-2");
});

Deno.test("integration-app: refresh falls back to client_credentials with no stored refresh token", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { access_token: "at-3", expires_in: 3600 },
  }]);
  await auth.refresh!(
    {
      credential: {
        clientId: "cid",
        clientSecret: "secret",
        accessToken: "old",
        expiresAt: new Date().toISOString(),
      },
    } as never,
    ctx,
  );
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("grant_type"), "client_credentials");
  assertEquals(body.get("client_secret"), "secret");
});

Deno.test("integration-app: sign stamps a lowercase bearer header", async () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://flex-integ-api.sharetribe.com/v1/integration_api/marketplace/show",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok-1" } } as never, ctx);
  assertEquals(out.headers["authorization"], "bearer tok-1");
});

Deno.test("integration-app: test ok on a 200", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { id: "mp-1", type: "marketplace", attributes: {} } },
  }]);
  const result = await auth.test!({ credential: { accessToken: "tok-1" } } as never, ctx);
  assertEquals(result.ok, true);
});

Deno.test("integration-app: test short-circuits with no fetch when the credential has no accessToken", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: { accessToken: "" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("integration-app: test distinguishes auth-missing-access-token from auth-invalid-access-token", async () => {
  const missing = mockCtx([
    {
      status: 401,
      body: { errors: [{ code: "auth-missing-access-token", title: "No access token" }] },
    },
  ]);
  const missingResult = await auth.test!(
    { credential: { accessToken: "tok-1" } } as never,
    missing.ctx,
  );
  assertEquals(missingResult.ok, false);
  assertEquals(missingResult.message?.includes("reconnect"), true);

  const invalid = mockCtx([
    { status: 401, body: { errors: [{ code: "auth-invalid-access-token", title: "Invalid" }] } },
  ]);
  const invalidResult = await auth.test!(
    { credential: { accessToken: "bad" } } as never,
    invalid.ctx,
  );
  assertEquals(invalidResult.ok, false);
  assertEquals(invalidResult.message?.includes("auth-invalid-access-token"), true);
  assertEquals(pathOf(invalid.calls[0].url), "/v1/integration_api/marketplace/show");
});

Deno.test("integration-app: afterConnect publishes marketplaceName and swallows failures", async () => {
  const ok = mockCtx([
    {
      status: 200,
      body: { data: { id: "mp-1", type: "marketplace", attributes: { name: "Acme Market" } } },
    },
  ]);
  const okResult = await auth.afterConnect!(
    { credential: { accessToken: "tok-1" } } as never,
    ok.ctx,
  );
  assertEquals(okResult, { marketplaceName: "Acme Market" });
  assertEquals(queryOf(ok.calls[0].url), {});

  const bad = mockCtx([{ status: 500, body: "boom" }]);
  const badResult = await auth.afterConnect!(
    { credential: { accessToken: "tok-1" } } as never,
    bad.ctx,
  );
  assertEquals(badResult, {});
});
