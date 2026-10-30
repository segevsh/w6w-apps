import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import apiKeys, { authHeaders, basicToken, envOf, versionOf } from "../../auth/api-keys.ts";
import { mockCtx } from "../_helpers.ts";

const CRED = { publicKey: "pub", privateKey: "priv", environment: "sandbox" };
const PONG = { data: { ping: "pong" }, extensions: { requestId: "r" } };
const AUTH_ERR = {
  data: null,
  errors: [{
    message: "Authentication credentials are invalid.",
    extensions: { errorClass: "AUTHENTICATION", errorType: "developer_error" },
  }],
};

test("auth: a custom method with both keys as secret fields", () => {
  assertEquals(apiKeys.key, "api-keys");
  assertEquals(apiKeys.type, "custom");
  const secrets = apiKeys.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secrets, ["publicKey", "privateKey"]);
});

test("sign: Basic base64(public:private) plus the Braintree-Version date", () => {
  const request = { headers: {} as Record<string, string> };
  const out = apiKeys.sign!(
    { request, credential: { ...CRED, apiVersion: "2025-02-03" } } as never,
    mockCtx().ctx,
  ) as typeof request;
  assertEquals(out.headers["authorization"], `Basic ${btoa("pub:priv")}`);
  assertEquals(out.headers["braintree-version"], "2025-02-03");
});

test("sign: a malformed apiVersion falls back to the default date", () => {
  assertEquals(versionOf({ apiVersion: "latest" }), "2024-08-01");
  assertEquals(versionOf({}), "2024-08-01");
  assertEquals(basicToken({ publicKey: " a ", privateKey: " b " }), btoa("a:b"));
  assertEquals(authHeaders(CRED)["braintree-version"], "2024-08-01");
});

test("envOf: unknown values mean production", () => {
  assertEquals(envOf({ environment: "sandbox" }), "sandbox");
  assertEquals(envOf({ environment: "staging" }), "production");
  assertEquals(envOf({}), "production");
});

test("test: ping returning pong on the credential's host is ok, and sends the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: PONG }]);
  assertEquals(await apiKeys.test!({ credential: CRED } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://payments.sandbox.braintree-api.com/graphql");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("pub:priv")}`);
  assertEquals(JSON.parse(calls[0].body!), { query: "query { ping }" });
});

test("test: an HTTP 200 AUTHENTICATION error is a rejection (status never decides)", async () => {
  const { ctx } = mockCtx([{ status: 200, body: AUTH_ERR }]);
  const res = await apiKeys.test!({ credential: CRED } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("[AUTHENTICATION] Authentication credentials are invalid."));
});

test("test: missing keys fail before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiKeys.test!({ credential: { privateKey: "p" } } as never, ctx)).ok, false);
  assertEquals((await apiKeys.test!({ credential: { publicKey: "p" } } as never, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

test("test: a non-JSON body and an unexpected answer are not passes", async () => {
  const html = mockCtx([{ status: 502, body: "<html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await apiKeys.test!({ credential: CRED } as never, html.ctx)).ok, false);
  const odd = mockCtx([{ body: { data: { ping: "nope" } } }]);
  assertEquals((await apiKeys.test!({ credential: CRED } as never, odd.ctx)).ok, false);
});

test("test: a network failure is reported, not thrown", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} } as never;
  const res = await apiKeys.test!({ credential: CRED } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("dns"));
});

test("afterConnect: publishes the environment for actions and health checks", async () => {
  assertEquals(await apiKeys.afterConnect!({ credential: CRED } as never, mockCtx().ctx), {
    environment: "sandbox",
  });
});
