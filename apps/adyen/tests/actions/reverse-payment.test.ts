import { assert, assertEquals, assertRejects } from "@std/assert";
import reversePayment from "../../actions/reverse-payment.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "paymentPspReference": "853" } as Parameters<typeof reversePayment.execute>[0];

Deno.test("reverse-payment: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "pspReference": "9", "status": "received" },
  }]);
  const out = await reversePayment.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments/853/reversals");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "merchantAccount": "TestMerchant" });
  assertEquals(out, { "pspReference": "9", "status": "received" });
});

Deno.test("reverse-payment: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "pspReference": "9", "status": "received" },
  }], "live");
  await reversePayment.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("reverse-payment: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(reversePayment.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("reverse-payment: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "pspReference": "9", "status": "received" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await reversePayment.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("reverse-payment: declares idempotency as false", () => {
  assertEquals(reversePayment.idempotent, false);
});

Deno.test("reverse-payment: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "pspReference": "9", "status": "received" },
  }]);
  await reversePayment.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
