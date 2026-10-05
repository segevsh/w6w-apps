import { assert, assertEquals, assertRejects } from "@std/assert";
import getPaymentMethodsBalance from "../../actions/get-payment-methods-balance.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "paymentMethod": { "type": "giftcard", "brand": "givex" },
  "currency": "EUR",
  "value": 100,
} as Parameters<typeof getPaymentMethodsBalance.execute>[0];

Deno.test("get-payment-methods-balance: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Success", "balance": { "currency": "EUR", "value": 500 } },
  }]);
  const out = await getPaymentMethodsBalance.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/paymentMethods/balance");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "paymentMethod": { "type": "giftcard", "brand": "givex" },
    "amount": { "currency": "EUR", "value": 100 },
  });
  assertEquals(out, { "resultCode": "Success", "balance": { "currency": "EUR", "value": 500 } });
});

Deno.test("get-payment-methods-balance: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Success", "balance": { "currency": "EUR", "value": 500 } },
  }], "live");
  await getPaymentMethodsBalance.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-payment-methods-balance: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(getPaymentMethodsBalance.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("get-payment-methods-balance: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Success", "balance": { "currency": "EUR", "value": 500 } },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await getPaymentMethodsBalance.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("get-payment-methods-balance: is a read-only action", () => {
  assertEquals(getPaymentMethodsBalance.type, "read");
});

Deno.test("get-payment-methods-balance: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Success", "balance": { "currency": "EUR", "value": 500 } },
  }]);
  await getPaymentMethodsBalance.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
