import { assert, assertEquals, assertRejects } from "@std/assert";
import getPaymentMethods from "../../actions/get-payment-methods.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "countryCode": "NL",
  "currency": "EUR",
  "value": 500,
  "allowedPaymentMethods": '["ideal"]',
} as Parameters<typeof getPaymentMethods.execute>[0];

Deno.test("get-payment-methods: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "paymentMethods": [{ "type": "ideal" }] },
  }]);
  const out = await getPaymentMethods.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/paymentMethods");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "countryCode": "NL",
    "amount": { "currency": "EUR", "value": 500 },
    "allowedPaymentMethods": ["ideal"],
  });
  assertEquals(out, { "paymentMethods": [{ "type": "ideal" }] });
});

Deno.test("get-payment-methods: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "paymentMethods": [{ "type": "ideal" }] },
  }], "live");
  await getPaymentMethods.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-payment-methods: surfaces Adyen's error code, type and message", async () => {
  const { ctx } = connectionCtx([{
    status: 422,
    body: {
      status: 422,
      errorCode: "130",
      errorType: "validation",
      message: "Reference Missing",
      pspReference: "881",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(getPaymentMethods.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("get-payment-methods: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "paymentMethods": [{ "type": "ideal" }] },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await getPaymentMethods.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("get-payment-methods: is a read-only action", () => {
  assertEquals(getPaymentMethods.type, "read");
});

Deno.test("get-payment-methods: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "paymentMethods": [{ "type": "ideal" }] },
  }]);
  await getPaymentMethods.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
