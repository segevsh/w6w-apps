import { assert, assertEquals, assertRejects } from "@std/assert";
import createPayment from "../../actions/create-payment.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "reference": "O-1",
  "currency": "EUR",
  "value": 2000,
  "paymentMethod": '{"type":"scheme","storedPaymentMethodId":"tok"}',
  "returnUrl": "https://shop.example/r",
  "shopperInteraction": "ContAuth",
  "storePaymentMethod": false,
} as Parameters<typeof createPayment.execute>[0];

Deno.test("create-payment: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Authorised", "pspReference": "851" },
  }]);
  const out = await createPayment.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "reference": "O-1",
    "amount": { "currency": "EUR", "value": 2000 },
    "paymentMethod": { "type": "scheme", "storedPaymentMethodId": "tok" },
    "returnUrl": "https://shop.example/r",
    "shopperInteraction": "ContAuth",
    "storePaymentMethod": false,
  });
  assertEquals(out, { "resultCode": "Authorised", "pspReference": "851" });
});

Deno.test("create-payment: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Authorised", "pspReference": "851" },
  }], "live");
  await createPayment.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-payment: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(createPayment.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("create-payment: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Authorised", "pspReference": "851" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await createPayment.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("create-payment: declares idempotency as false", () => {
  assertEquals(createPayment.idempotent, false);
});

Deno.test("create-payment: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "resultCode": "Authorised", "pspReference": "851" },
  }]);
  await createPayment.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
