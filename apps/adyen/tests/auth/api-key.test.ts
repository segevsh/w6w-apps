import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

type TestArg = Parameters<NonNullable<typeof apiKey.test>>[0];
const run = (credential: unknown, ctx: HookContext) =>
  apiKey.test!({ credential } as unknown as TestArg, ctx);

const CRED = { apiKey: " k-123 ", environment: "test", merchantAccount: "TestMerchant" };
const err = (status: number, errorCode: string, errorType: string, message = "m") => ({
  status,
  body: { status, errorCode, errorType, message },
});

Deno.test("auth: declares an apiKey method in the X-API-Key header with a secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "X-API-Key" });
  const f = (k: string) => apiKey.fields!.find((x) => x.key === k)!;
  assertEquals(f("apiKey").type, "secret");
  assertEquals(f("environment").default, "test");
  assertEquals(f("livePrefix").required, undefined);
  assertEquals(f("merchantAccount").required, true);
});

Deno.test("auth.sign: stamps a trimmed X-API-Key and nothing else", () => {
  const out = apiKey.sign!(
    {
      request: { url: "https://x", method: "POST", headers: { accept: "a" } },
      credential: CRED,
    } as unknown as Parameters<NonNullable<typeof apiKey.sign>>[0],
    {} as HookContext,
  ) as { headers: Record<string, string> };
  assertEquals(out.headers["x-api-key"], "k-123");
  assertEquals(out.headers.accept, "a");
  assert(!("authorization" in out.headers));
});

Deno.test("auth.test: a payment-methods list means the key works", async () => {
  const { ctx, calls } = mockCtx([{ body: { paymentMethods: [{ type: "scheme" }] } }]);
  assertEquals(await run(CRED, ctx), { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://checkout-test.adyen.com/v72/paymentMethods");
  assertEquals(calls[0].headers["x-api-key"], "k-123");
  assertEquals(JSON.parse(calls[0].body!), { merchantAccount: "TestMerchant" });
});

Deno.test("auth.test: live goes to the merchant-specific host with /checkout", async () => {
  const { ctx, calls } = mockCtx([{ body: { paymentMethods: [] } }]);
  await run({ ...CRED, environment: "live", livePrefix: "1797a841fbb37ca7-AdyenDemo" }, ctx);
  assertEquals(
    calls[0].url,
    "https://1797a841fbb37ca7-AdyenDemo-checkout-live.adyenpayments.com/checkout/v72/paymentMethods",
  );
});

Deno.test("auth.test: security 000 is a rejected key", async () => {
  const { ctx } = mockCtx([err(401, "000", "security", "HTTP Status Response - Unauthorized")]);
  const r = await run(CRED, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected the API key"));
});

Deno.test("auth.test: the same 401 status with a different body is not misread as a bad key", async () => {
  const { ctx } = mockCtx([err(401, "010", "security", "Not allowed")]);
  const r = await run(CRED, ctx);
  assertEquals(r.ok, false);
  assert(!r.message!.includes("rejected the API key"));
  assert(r.message!.includes("010"));
});

Deno.test("auth.test: security 901 means the key is fine but the merchant account is not", async () => {
  const { ctx } = mockCtx([err(403, "901", "security", "Invalid Merchant Account")]);
  const r = await run(CRED, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes('merchant account "TestMerchant"'));
});

Deno.test("auth.test: a validation or configuration error proves the key authenticated", async () => {
  assertEquals(await run(CRED, mockCtx([err(422, "130", "validation")]).ctx), { ok: true });
  assertEquals(await run(CRED, mockCtx([err(500, "905", "configuration")]).ctx), { ok: true });
});

Deno.test("auth.test: a 200 that is not the Checkout API fails", async () => {
  const r1 = await run(CRED, mockCtx([{ body: "<html>hi</html>" }]).ctx);
  assertEquals(r1.ok, false);
  const r2 = await run(CRED, mockCtx([{ body: { hello: 1 } }]).ctx);
  assertEquals(r2.ok, false);
});

Deno.test("auth.test: an unreadable error body fails with the status", async () => {
  const r = await run(CRED, mockCtx([{ status: 502, body: "bad gateway" }]).ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("502"));
});

Deno.test("auth.test: a network failure is reported, not thrown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("boom")),
    log: () => {},
  } as unknown as HookContext;
  const r = await run(CRED, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("boom"));
});

Deno.test("auth.test: missing fields and a bad live prefix fail before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await run({ ...CRED, apiKey: "" }, ctx)).ok, false);
  assertEquals((await run({ ...CRED, merchantAccount: " " }, ctx)).ok, false);
  const bad = await run({ ...CRED, environment: "live", livePrefix: "evil.com" }, ctx);
  assertEquals(bad.ok, false);
  assert(bad.message!.includes("live URL"));
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: the response key material is never echoed into the result", async () => {
  const { ctx } = mockCtx([err(401, "000", "security")]);
  const r = await run({ ...CRED, apiKey: "SECRET-KEY-VALUE" }, ctx);
  assert(!JSON.stringify(r).includes("SECRET-KEY-VALUE"));
});

type AfterArg = Parameters<NonNullable<typeof apiKey.afterConnect>>[0];
const after = (credential: unknown) =>
  apiKey.afterConnect!({ credential } as unknown as AfterArg, {} as HookContext);

Deno.test("auth.afterConnect: publishes environment, base URL and merchant — never the key", async () => {
  const out = await after({ ...CRED, apiKey: "SECRET" });
  assertEquals(out, {
    environment: "test",
    baseUrl: "https://checkout-test.adyen.com/v72",
    merchantAccount: "TestMerchant",
  });
  const live = await after({
    ...CRED,
    environment: "live",
    livePrefix: "https://p1-Co-checkout-live.adyenpayments.com/checkout/v72/payments",
  });
  assertEquals(
    (live as { baseUrl: string }).baseUrl,
    "https://p1-Co-checkout-live.adyenpayments.com/checkout/v72",
  );
  assert(!JSON.stringify(out).includes("SECRET"));
});

Deno.test("auth.afterConnect: a bad live prefix stores nothing", async () => {
  assertEquals(await after({ ...CRED, environment: "live", livePrefix: "a.b" }), {});
});
