import { assert, assertEquals, assertRejects } from "@std/assert";
import createPaymentLink from "../../actions/create-payment-link.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "reference": "INV-1",
  "currency": "EUR",
  "value": 4200,
  "description": "Invoice",
  "reusable": false,
  "requiredShopperFields": '["shopperEmail"]',
} as Parameters<typeof createPaymentLink.execute>[0];

Deno.test("create-payment-link: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "PL1", "url": "https://pay.example/PL1", "status": "active" },
  }]);
  const out = await createPaymentLink.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/paymentLinks");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "reference": "INV-1",
    "amount": { "currency": "EUR", "value": 4200 },
    "description": "Invoice",
    "reusable": false,
    "requiredShopperFields": ["shopperEmail"],
  });
  assertEquals(out, { "id": "PL1", "url": "https://pay.example/PL1", "status": "active" });
});

Deno.test("create-payment-link: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "PL1", "url": "https://pay.example/PL1", "status": "active" },
  }], "live");
  await createPaymentLink.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-payment-link: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(createPaymentLink.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("create-payment-link: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "PL1", "url": "https://pay.example/PL1", "status": "active" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await createPaymentLink.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("create-payment-link: declares idempotency as false", () => {
  assertEquals(createPaymentLink.idempotent, false);
});

Deno.test("create-payment-link: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "PL1", "url": "https://pay.example/PL1", "status": "active" },
  }]);
  await createPaymentLink.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
