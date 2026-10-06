import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

const fields = {
  tenantId: "42",
  environment: "production",
  clientId: "cid",
  clientSecret: "csecret",
  appKey: "key1",
};

Deno.test("sign: stamps Authorization and ST-App-Key, network-less", async () => {
  const { ctx, calls } = mockCtx();
  const request = {
    url: "https://api.servicetitan.io/crm/v2/tenant/42/customers",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accessToken: "tok", appKey: "key1" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer tok");
  assertEquals(out.headers["st-app-key"], "key1");
  assertEquals(calls.length, 0);
});

Deno.test("fields: tenant, id, secret and app key are required; the three credentials are masked", () => {
  assertEquals(
    auth.fields!.filter((f) => f.required).map((f) => f.key).sort(),
    ["appKey", "clientId", "clientSecret", "tenantId"],
  );
  assertEquals(
    auth.fields!.filter((f) => f.type === "secret").map((f) => f.key).sort(),
    ["appKey", "clientId", "clientSecret"],
  );
});

Deno.test("exchange: form-encodes the client_credentials grant against the production token host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { access_token: "t1", expires_in: 900 } }]);
  const cred = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://auth.servicetitan.io/connect/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("grant_type"), "client_credentials");
  assertEquals(body.get("client_id"), "cid");
  assertEquals(body.get("client_secret"), "csecret");
  // The app key belongs on API calls, not on the token request.
  assert(!calls[0].body!.includes("key1"));
  assertEquals(cred.accessToken, "t1");
  assertEquals(cred.appKey, "key1");
  assertEquals(cred.tenantId, "42");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("exchange: the integration environment mints from the integration token host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { access_token: "t1" } }]);
  await auth.exchange!({ fields: { ...fields, environment: "integration" } }, ctx);
  assertEquals(calls[0].url, "https://auth-integration.servicetitan.io/connect/token");
});

Deno.test("exchange: refuses a missing secret or a non-numeric tenant before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { ...fields, appKey: "" } }, ctx),
    Error,
  );
  await assertRejects(
    async () => await auth.exchange!({ fields: { ...fields, tenantId: "abc" } }, ctx),
    Error,
    "numeric",
  );
  assertEquals(calls.length, 0);
});

Deno.test("exchange: surfaces the vendor's error body on a rejected client", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "invalid_client" } }]);
  await assertRejects(
    async () => await auth.exchange!({ fields }, ctx),
    Error,
    "token request failed (400): invalid_client",
  );
});

Deno.test("refresh: re-mints from the stored credential, keeping tenant and app key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { access_token: "t2", expires_in: 900 } }]);
  const cred = await auth.refresh!(
    { credential: { ...fields, accessToken: "old" } },
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(cred.accessToken, "t2");
  assertEquals(cred.appKey, "key1");
});

Deno.test("test: passes on a 200 and sends both credentials to the settings probe", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await auth.test!({ credential: { ...fields, accessToken: "tok" } }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(
    calls[0].url,
    "https://api.servicetitan.io/settings/v2/tenant/42/business-units?pageSize=1",
  );
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(calls[0].headers["st-app-key"], "key1");
});

Deno.test("test: classifies 401 and 403 separately, and never echoes the credential", async () => {
  const cred = { ...fields, accessToken: "tok-secret" };
  const r401 = await auth.test!(
    { credential: cred },
    mockCtx([{ status: 401, body: { title: "Application key not present", status: 401 } }]).ctx,
  );
  assertEquals(r401.ok, false);
  assert(r401.message!.includes("Application key not present"));
  const r403 = await auth.test!({ credential: cred }, mockCtx([{ status: 403, body: {} }]).ctx);
  assertEquals(r403.ok, false);
  assert(r403.message!.includes("tn.stt.businessunits:r"));
  for (const m of [r401.message, r403.message]) {
    assert(!m!.includes("tok-secret") && !m!.includes("csecret") && !m!.includes("key1"));
  }
});

Deno.test("test: a credential with no access token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test!({ credential: fields }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records tenant and environment, never a secret", async () => {
  const out = await auth.afterConnect!(
    { credential: { ...fields, accessToken: "tok" } },
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(out.tenantId, "42");
  assertEquals(out.environment, "production");
  assert(!JSON.stringify(out).includes("csecret"));
  assert(!JSON.stringify(out).includes("key1"));
});
