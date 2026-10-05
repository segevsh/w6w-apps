import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  AdyenClient,
  baseUrlFor,
  baseUrlFromConnection,
  buildBody,
  encodeId,
  formatAdyenError,
  merchantAccountFor,
  normalizePrefix,
} from "../../lib/client.ts";
import { connectionCtx, LIVE_BASE, mockCtx, TEST_BASE } from "../_helpers.ts";

Deno.test("normalizePrefix: accepts the documented prefix shape", () => {
  assertEquals(normalizePrefix("1797a841fbb37ca7-AdyenDemo"), "1797a841fbb37ca7-AdyenDemo");
  assertEquals(normalizePrefix("  abc123  "), "abc123");
});

Deno.test("normalizePrefix: extracts the prefix from a pasted live URL", () => {
  assertEquals(
    normalizePrefix(
      "https://1797a841fbb37ca7-AdyenDemo-checkout-live.adyenpayments.com/checkout/v72/payments",
    ),
    "1797a841fbb37ca7-AdyenDemo",
  );
  assertEquals(normalizePrefix("abc-checkout-live.adyenpayments.com"), "abc");
});

Deno.test("normalizePrefix: refuses anything that could steer the host", () => {
  for (
    const bad of [
      "",
      "   ",
      "evil.com",
      "a/b",
      "a@evil.com",
      "a b",
      "a:443",
      "-leading",
      "trailing-",
      "a_b",
      "x".repeat(50),
      "https://evil.example.com/checkout/v72",
      "https://abc-checkout-live.evil.com/checkout/v72",
      "https://a.b-checkout-live.adyenpayments.com/",
      "https://abc-checkout-live-us.adyenpayments.com/checkout/v72",
    ]
  ) {
    assertThrows(
      () => normalizePrefix(bad),
      Error,
      undefined,
      `should refuse ${JSON.stringify(bad)}`,
    );
  }
});

Deno.test("normalizePrefix: the longest legal prefix still fits one DNS label", () => {
  const p = "a".repeat(49);
  assertEquals(normalizePrefix(p), p);
  assert(`${p}-checkout-live`.length <= 63);
});

Deno.test("baseUrlFor: test and live have different shapes, live adds /checkout", () => {
  assertEquals(baseUrlFor("test"), "https://checkout-test.adyen.com/v72");
  assertEquals(
    baseUrlFor("live", "1797a841fbb37ca7-AdyenDemo"),
    "https://1797a841fbb37ca7-AdyenDemo-checkout-live.adyenpayments.com/checkout/v72",
  );
  assertThrows(() => baseUrlFor("live"), Error, "empty");
});

Deno.test("baseUrlFromConnection: reads the stored URL and rejects foreign hosts", () => {
  assertEquals(baseUrlFromConnection(connectionCtx([]).ctx.connection), TEST_BASE);
  assertEquals(baseUrlFromConnection(connectionCtx([], "live").ctx.connection), LIVE_BASE);
  for (
    const baseUrl of [
      undefined,
      "https://evil.example.com/v72",
      "https://abc-checkout-live.adyenpayments.com.evil.com/checkout/v72",
      "http://checkout-test.adyen.com/v72",
    ]
  ) {
    assertThrows(
      () =>
        baseUrlFromConnection(
          { display: { baseUrl } } as unknown as ReturnType<typeof connectionCtx>["ctx"][
            "connection"
          ],
        ),
      Error,
      "no valid Checkout base URL",
    );
  }
  assertThrows(() => baseUrlFromConnection(undefined), Error, "reconnect");
});

Deno.test("merchantAccountFor: explicit value, else the connection, else an error", () => {
  const conn = connectionCtx([]).ctx.connection;
  assertEquals(merchantAccountFor("Own", conn), "Own");
  assertEquals(merchantAccountFor("", conn), "TestMerchant");
  assertEquals(merchantAccountFor(undefined, conn), "TestMerchant");
  assertThrows(
    () => merchantAccountFor(undefined, undefined),
    Error,
    "merchantAccount is required",
  );
});

Deno.test("buildBody: amount is upper-cased and validated", () => {
  const { ctx } = connectionCtx([]);
  assertEquals(buildBody(ctx, { currency: "eur", value: 10 }, { amount: true }), {
    merchantAccount: "TestMerchant",
    amount: { currency: "EUR", value: 10 },
  });
  assertEquals(
    (buildBody(ctx, { currency: "EUR", value: 0 }, { amount: true }).amount as { value: number })
      .value,
    0,
  );
  assertThrows(
    () => buildBody(ctx, { currency: "EUR", value: 1.5 }, { amount: true }),
    Error,
    "whole number",
  );
  assertThrows(
    () => buildBody(ctx, { currency: "EUR", value: -1 }, { amount: true }),
    Error,
    "whole number",
  );
  assertThrows(
    () => buildBody(ctx, { currency: "EURO", value: 1 }, { amount: true }),
    Error,
    "3-letter",
  );
});

Deno.test("buildBody: an optional amount needs both halves or neither", () => {
  const { ctx } = connectionCtx([]);
  assertEquals(buildBody(ctx, {}, { amount: "optional" }), { merchantAccount: "TestMerchant" });
  assertThrows(
    () => buildBody(ctx, { currency: "EUR" }, { amount: "optional" }),
    Error,
    "together",
  );
  assertThrows(() => buildBody(ctx, { value: 5 }, { amount: "optional" }), Error, "together");
  assertEquals(buildBody(ctx, { currency: "EUR", value: 5 }, { amount: "optional" }).amount, {
    currency: "EUR",
    value: 5,
  });
});

Deno.test("buildBody: typed params win over additionalFields; false and 0 survive", () => {
  const { ctx } = connectionCtx([]);
  const body = buildBody(
    ctx,
    {
      reference: "typed",
      reusable: false,
      captureDelayHours: 0,
      empty: "",
      additionalFields: '{"reference":"stray","extra":1}',
    },
    { fields: ["reference", "reusable", "captureDelayHours", "empty"] },
  );
  assertEquals(body, {
    merchantAccount: "TestMerchant",
    reference: "typed",
    reusable: false,
    captureDelayHours: 0,
    extra: 1,
  });
});

Deno.test("buildBody: JSON params accept objects or strings, and reject bad JSON", () => {
  const { ctx } = connectionCtx([]);
  assertEquals(buildBody(ctx, { m: { a: 1 }, n: "[1]" }, { json: ["m", "n"], merchant: false }), {
    m: { a: 1 },
    n: [1],
  });
  assertThrows(() => buildBody(ctx, { m: "{" }, { json: ["m"] }), Error, "m is not valid JSON");
  assertThrows(() => buildBody(ctx, { additionalFields: "[1]" }, {}), Error, "JSON object");
});

Deno.test("encodeId: percent-encodes a path segment and refuses an empty one", () => {
  assertEquals(encodeId("a/b c"), "a%2Fb%20c");
  assertThrows(() => encodeId(" "), Error);
});

Deno.test("formatAdyenError: quotes type, code, message and pspReference", () => {
  assertEquals(
    formatAdyenError(
      403,
      '{"status":403,"errorCode":"901","message":"Invalid Merchant Account","errorType":"security","pspReference":"88"}',
    ),
    "HTTP 403 (security, code 901): Invalid Merchant Account [pspReference 88]",
  );
  assertEquals(
    formatAdyenError(502, "<html>bad gateway</html>"),
    "HTTP 502: <html>bad gateway</html>",
  );
  assertEquals(formatAdyenError(500, ""), "HTTP 500");
});

Deno.test("AdyenClient: a 200 that is not JSON is reported, not parsed", async () => {
  const { ctx } = connectionCtx([{ status: 200, body: "<html>login</html>" }]);
  await assertRejects(() => new AdyenClient(ctx).get("/x"), Error, "not JSON");
});

Deno.test("AdyenClient: an empty 2xx body becomes an empty object", async () => {
  const { ctx } = connectionCtx([{ status: 204 }]);
  assertEquals(await new AdyenClient(ctx).delete("/x"), {});
});

Deno.test("AdyenClient: Idempotency-Key is sent on POST only, and not over 64 characters", async () => {
  const post = connectionCtx([{ body: {} }, { body: {} }, { body: {} }]);
  post.ctx.invocation = { invocationId: "a".repeat(64) } as typeof post.ctx.invocation;
  await new AdyenClient(post.ctx).post("/x", {});
  assertEquals(post.calls[0].headers["idempotency-key"], "a".repeat(64));
  await new AdyenClient(post.ctx).get("/x");
  assert(!("idempotency-key" in post.calls[1].headers));
  post.ctx.invocation = { invocationId: "a".repeat(65) } as typeof post.ctx.invocation;
  await new AdyenClient(post.ctx).post("/x", {});
  assert(!("idempotency-key" in post.calls[2].headers));
});

Deno.test("AdyenClient: refuses a connection with no base URL before any request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => new AdyenClient(ctx), Error, "reconnect");
  assertEquals(calls.length, 0);
});
