import assert from "node:assert/strict";
import { test } from "node:test";
import auth, { signRequest } from "../auth/api-credentials.ts";
import { ENDPOINTS } from "../lib/client.ts";
import { CREDENTIAL, mockCtx, OK } from "./_helpers.ts";

const request = {
  url: ENDPOINTS.sandbox,
  method: "POST",
  headers: {},
  body: '{"getTransactionDetailsRequest":{"transId":"123","refId":"ref"}}',
};

test("signing prepends connection auth, overrides spoofed auth and leaves the input untouched", () => {
  const original = {
    ...request,
    body:
      '{"getTransactionDetailsRequest":{"transId":"123","refId":"ref","merchantAuthentication":{"transactionKey":"spoof","name":"spoof"}}}',
  };
  const signed = signRequest(original, CREDENTIAL);
  assert.equal(
    signed.body,
    '{"getTransactionDetailsRequest":{"merchantAuthentication":{"name":"TEST_LOGIN","transactionKey":"TEST_TRANSACTION_KEY"},"refId":"ref","transId":"123"}}',
  );
  assert.ok(original.body.includes("spoof"));
  assert.equal(signRequest(signed, CREDENTIAL).body, signed.body, "signing twice is deterministic");
});

test("sign accepts UTF-8 bodies and preserves JSON string escapes", () => {
  const signed = signRequest({
    ...request,
    body: new TextEncoder().encode('{"getCustomerProfileRequest":{"email":"a\\"b@example.com"}}'),
  }, CREDENTIAL);
  assert.equal(
    JSON.parse(signed.body as string).getCustomerProfileRequest.email,
    'a"b@example.com',
  );
});

test("sign refuses host, environment, method, wrapper and credential mistakes", () => {
  for (
    const url of [
      ENDPOINTS.production,
      "https://api.authorize.net.evil.example/xml/v1/request.api",
      ENDPOINTS.sandbox + "?redirect=1",
    ]
  ) {
    assert.throws(() => signRequest({ ...request, url }, CREDENTIAL), /endpoint/);
  }
  assert.throws(() => signRequest({ ...request, method: "GET" }, CREDENTIAL), /endpoint/);
  assert.throws(
    () =>
      signRequest({
        ...request,
        body: '{"authenticateTestRequest":{},"getMerchantDetailsRequest":{}}',
      }, CREDENTIAL),
    /exactly one/,
  );
  assert.throws(
    () => signRequest({ ...request, body: '{"unrecognizedRequest":{}}' }, CREDENTIAL),
    /unsupported request/,
  );
  assert.throws(() => signRequest(request, { apiLoginId: "x" }), /required/);
  assert.throws(
    () => signRequest(request, { ...CREDENTIAL, environment: "prod-typo" }),
    /environment/,
  );
});

test("credential test checks body resultCode, not HTTP 200, on the selected endpoint", async () => {
  const ok = mockCtx([{ body: OK }], "production", false);
  assert.deepEqual(
    await auth.test!({ credential: { ...CREDENTIAL, environment: "production" } }, ok.ctx),
    { ok: true },
  );
  assert.equal(ok.calls[0].url, ENDPOINTS.production);
  assert.equal(
    ok.calls[0].body,
    '{"authenticateTestRequest":{"merchantAuthentication":{"name":"TEST_LOGIN","transactionKey":"TEST_TRANSACTION_KEY"}}}',
  );
  const bad = mockCtx(
    [{
      body: {
        messages: {
          resultCode: "Error",
          message: [{ code: "E00007", text: "secret echoed by vendor" }],
        },
      },
    }],
    "sandbox",
    false,
  );
  const result = await auth.test!({ credential: CREDENTIAL }, bad.ctx);
  assert.equal(result.ok, false);
  assert.match(result.message ?? "", /E00007/);
  assert.doesNotMatch(result.message ?? "", /secret echoed/);
  const empty = mockCtx([], "sandbox", false);
  assert.equal((await auth.test!({ credential: {} }, empty.ctx)).ok, false);
  assert.equal(empty.calls.length, 0);
});

test("afterConnect exposes only environment and defaults to sandbox", async () => {
  assert.deepEqual(await auth.afterConnect!({ credential: CREDENTIAL }, mockCtx().ctx), {
    environment: "sandbox",
  });
  assert.deepEqual(
    await auth.afterConnect!(
      { credential: { ...CREDENTIAL, environment: undefined } },
      mockCtx().ctx,
    ),
    { environment: "sandbox" },
  );
});
